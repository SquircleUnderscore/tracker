const STORAGE_KEY = 'habitTrackerData';
const ICON_OPTIONS = [
    'fa-star',
    'fa-heart',
    'fa-book',
    'fa-dumbbell',
    'fa-utensils',
    'fa-leaf',
    'fa-moon',
    'fa-sun',
    'fa-water',
    'fa-running',
    'fa-music',
    'fa-paint-brush',
    'fa-code',
    'fa-camera',
    'fa-smile',
    'fa-tree'
];

let appState = {
    tasks: [],
    taskStates: {},
    lastModified: null
};

let currentUser = null;
let cloudSaveTimeout = null;
let cloudSaveInProgress = false;

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekDates() {
    const weekStart = getWeekStart();
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function isFutureDate(date) {
    const today = new Date();
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return compareDate > compareToday;
}

function getWeekLabel() {
    const dates = getWeekDates();
    const startDate = dates[0];
    const endDate = dates[6];
    
    const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    return `Semaine du ${startDay} ${startMonth} au ${endDay} ${endMonth}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ========================================
// STORAGE FUNCTIONS
// ========================================

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            appState = JSON.parse(stored);
            if (!appState.lastModified) {
                appState.lastModified = new Date().toISOString();
            }
            if (!appState.tasks) appState.tasks = [];
            if (!appState.taskStates) appState.taskStates = {};
        } catch (e) {
            console.error('❌ Erreur chargement state:', e);
            appState = { tasks: [], taskStates: {}, lastModified: new Date().toISOString() };
        }
    }
}

function saveState() {
    appState.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));

    if (cloudSaveTimeout) clearTimeout(cloudSaveTimeout);
    cloudSaveTimeout = setTimeout(() => {
        saveToCloud(appState);
    }, 1000);
}

// ========================================
// SUPABASE CLOUD SYNC
// ========================================

async function saveToCloud(state) {
    if (!window.supabaseClient || !currentUser) return;
    if (cloudSaveInProgress) {
        console.log('⏳ Sauvegarde cloud déjà en cours, ignorée');
        return;
    }

    cloudSaveInProgress = true;
    const userId = currentUser.id;

    try {
        const { error } = await supabaseClient
            .from('habit_states')
            .upsert({
                user_id: userId,
                data: state,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('❌ Erreur sauvegarde cloud:', error);
        } else {
            console.log('☁️✅ Sauvegarde cloud réussie');
        }
    } finally {
        cloudSaveInProgress = false;
    }
}

async function loadFromCloud() {
    if (!window.supabaseClient || !currentUser) return null;

    const userId = currentUser.id;

    const { data, error } = await supabaseClient
        .from('habit_states')
        .select('data, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ Erreur chargement cloud:', error);
        return null;
    }

    if (!data) {
        console.log('☁️ Pas de données cloud, utilisation du local');
        return null;
    }
    
    console.log('☁️ Données cloud chargées:', data.updated_at);
    return data.data;
}

function mergeStates(localState, cloudState) {
    if (!localState || !localState.tasks) return cloudState;
    if (!cloudState || !cloudState.tasks) return localState;

    console.log('🔄 Merge local/cloud...');
    
    const localTime = localState.lastModified ? new Date(localState.lastModified).getTime() : 0;
    const cloudTime = cloudState.lastModified ? new Date(cloudState.lastModified).getTime() : 0;
    
    const timeDiff = Math.abs(cloudTime - localTime);
    
    if (timeDiff > 5000) {
        if (cloudTime > localTime) {
            console.log('☁️ Cloud plus récent, utilisation du cloud');
            return cloudState;
        }
        if (localTime > cloudTime) {
            console.log('💾 Local plus récent, utilisation du local');
            return localState;
        }
    }

    console.log('🔀 Merge combiné des deux états');
    const mergedTasksMap = new Map();
        cloudState.tasks.forEach(task => mergedTasksMap.set(task.id, task));
        localState.tasks.forEach(task => {
        if (!mergedTasksMap.has(task.id)) {
            mergedTasksMap.set(task.id, task);
        }
    });

    const mergedTaskStates = { ...cloudState.taskStates };
    Object.keys(localState.taskStates).forEach(taskId => {
        if (!mergedTaskStates[taskId]) {
            mergedTaskStates[taskId] = localState.taskStates[taskId];
        } else {
            mergedTaskStates[taskId] = {
                ...mergedTaskStates[taskId],
                ...localState.taskStates[taskId]
            };
        }
    });

    return {
        tasks: Array.from(mergedTasksMap.values()),
        taskStates: mergedTaskStates,
        lastModified: new Date().toISOString()
    };
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal() {
    const modal = document.getElementById('taskModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.add('active');
    overlay.classList.add('active');
    document.getElementById('taskName').focus();
}

function closeModal() {
    const modal = document.getElementById('taskModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.remove('active');
    document.getElementById('taskName').value = '';
    document.getElementById('selectedIcon').value = 'fa-star';
    updateIconSelection('fa-star');

    // Si la modal d'auth n'est pas active, on peut masquer l'overlay
    const authModal = document.getElementById('authModal');
    if (!authModal || !authModal.classList.contains('active')) {
        overlay.classList.remove('active');
    }
}

function updateIconSelection(iconClass) {
    document.querySelectorAll('.icon-option').forEach(option => {
        option.classList.remove('selected');
    });
    const selected = document.querySelector(`[data-icon="${iconClass}"]`);
    if (selected) {
        selected.classList.add('selected');
    }
    document.getElementById('selectedIcon').value = iconClass;
}

function createTask() {
    const taskName = document.getElementById('taskName').value.trim();
    const selectedIcon = document.getElementById('selectedIcon').value;
    
    if (!taskName) {
        alert('Veuillez entrer un nom de tâche');
        return;
    }
    
    const taskId = generateId();
    const task = {
        id: taskId,
        name: taskName,
        icon: selectedIcon,
        createdAt: formatDate(new Date())
    };
    
    appState.tasks.push(task);
    appState.taskStates[taskId] = {};
    
    saveState();
    closeModal();
    render();
    console.log(`✅ Tâche "${taskName}" créée`);
}

function deleteTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    const taskName = task ? task.name : 'cette tâche';
    if (confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${taskName}"?`)) {
        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        delete appState.taskStates[taskId];
        saveState();
        render();
        console.log(`🗑️ Tâche "${taskName}" supprimée`);
    }
}

// ========================================
// STATE MANAGEMENT
// ========================================

function getDayState(taskId, dateString) {
    return appState.taskStates[taskId]?.[dateString] || 'empty';
}

function setDayState(taskId, dateString, state) {
    if (!appState.taskStates[taskId]) {
        appState.taskStates[taskId] = {};
    }
    appState.taskStates[taskId][dateString] = state;
    saveState();
}

function cycleDayState(taskId, dateString) {
    const currentState = getDayState(taskId, dateString);
    let nextState = 'empty';
    
    if (currentState === 'empty') {
        nextState = 'in-progress';
    } else if (currentState === 'in-progress') {
        nextState = 'completed';
    }
    
    setDayState(taskId, dateString, nextState);
    render();
}

// ========================================
// RENDERING FUNCTIONS
// ========================================

function renderIconGrid() {
    const iconGrid = document.getElementById('iconGrid');
    iconGrid.innerHTML = '';
    
    ICON_OPTIONS.forEach(iconClass => {
        const iconOption = document.createElement('button');
        iconOption.type = 'button';
        iconOption.className = 'icon-option';
        iconOption.setAttribute('data-icon', iconClass);
        iconOption.innerHTML = `<i class="fas ${iconClass}"></i>`;
        
        if (iconClass === 'fa-star') {
            iconOption.classList.add('selected');
        }
        
        iconOption.addEventListener('click', (e) => {
            e.preventDefault();
            updateIconSelection(iconClass);
        });
        
        iconGrid.appendChild(iconOption);
    });
}

function renderTaskRow(task) {
    const taskRow = document.createElement('div');
    taskRow.className = 'task-row';
    
    const taskNameCell = document.createElement('div');
    taskNameCell.className = 'task-name-cell';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'task-icon';
    iconDiv.innerHTML = `<i class="fas ${task.icon}"></i>`;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'task-name';
    nameDiv.textContent = task.name;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    taskNameCell.appendChild(iconDiv);
    taskNameCell.appendChild(nameDiv);
    taskNameCell.appendChild(deleteBtn);
    
    const taskDaysGrid = document.createElement('div');
    taskDaysGrid.className = 'task-days-grid';
    
    const weekDates = getWeekDates();
    weekDates.forEach(date => {
        const dateString = formatDate(date);
        const dayCell = document.createElement('button');
        const state = getDayState(task.id, dateString);
        const isFuture = isFutureDate(date);
        
        dayCell.type = 'button';
        dayCell.className = `day-cell ${state}`;
        
        if (state === 'in-progress') {
            dayCell.textContent = '◐';
        } else if (state === 'completed') {
            dayCell.textContent = '✓';
        }
        
        if (isFuture) {
            dayCell.classList.add('future');
            dayCell.disabled = true;
        } else {
            dayCell.addEventListener('click', () => {
                cycleDayState(task.id, dateString);
            });
        }
        
        taskDaysGrid.appendChild(dayCell);
    });
    
    taskRow.appendChild(taskNameCell);
    taskRow.appendChild(taskDaysGrid);
    
    return taskRow;
}

function render() {
    document.getElementById('weekLabel').textContent = getWeekLabel();
    
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';
    
    if (appState.tasks.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        appState.tasks.forEach(task => {
            tasksContainer.appendChild(renderTaskRow(task));
        });
    }
}

// ========================================
// AUTH UI
// ========================================

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmailSpan = document.getElementById('userEmail');

    if (!loginBtn || !logoutBtn || !userEmailSpan) return;

    if (currentUser) {
        console.log('🟢 UI: Connecté -', currentUser.email);
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userEmailSpan.textContent = currentUser.email || '';
    } else {
        console.log('🔴 UI: Déconnecté');
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userEmailSpan.textContent = '';
    }
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;
    modal.classList.add('active');
    overlay.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.remove('active');
}

// ========================================
// EVENT LISTENERS
// ========================================

function initializeEventListeners() {
    document.getElementById('createTaskBtn').addEventListener('click', openModal);
    document.getElementById('modalCreateBtn').addEventListener('click', createTask);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);

    const overlay = document.getElementById('modalOverlay');
    overlay.addEventListener('click', () => {
        closeModal();
        closeAuthModal();
        overlay.classList.remove('active');
    });

    document.getElementById('taskModal').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    document.getElementById('taskName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createTask();
        }
    });

    const loginEmailInput = document.getElementById('loginEmailInput');
    if (loginEmailInput) {
        loginEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loginEmailBtn').click();
            }
        });
    }

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginGithubBtn = document.getElementById('loginGithubBtn');
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    const loginEmailBtn = document.getElementById('loginEmailBtn');
    const authModalCloseBtn = document.getElementById('authModalCloseBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            openAuthModal();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await supabaseClient.auth.signOut();
            } catch (e) {
                console.error('Erreur logout:', e);
            }
        });
    }

    if (loginGithubBtn) {
        loginGithubBtn.addEventListener('click', async () => {
            console.log('🔐 Tentative login GitHub...');
            try {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        redirectTo: 'https://tracker.squircle.computer/app'
                    }
                });
                if (error) {
                    console.error('❌ Erreur login GitHub:', error);
                    alert('Erreur de connexion GitHub: ' + error.message);
                } else {
                    console.log('✅ Redirection GitHub initiée');
                }
            } catch (e) {
                console.error('❌ Exception login GitHub:', e);
            }
        });
    }

    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', async () => {
            console.log('🔐 Tentative login Google...');
            try {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: 'https://tracker.squircle.computer/app'
                    }
                });
                if (error) {
                    console.error('❌ Erreur login Google:', error);
                    alert('Erreur de connexion Google: ' + error.message);
                } else {
                    console.log('✅ Redirection Google initiée');
                }
            } catch (e) {
                console.error('❌ Exception login Google:', e);
            }
        });
    }

    if (loginEmailBtn) {
        loginEmailBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('loginEmailInput');
            const email = emailInput.value.trim();
            if (!email) {
                alert('Veuillez entrer une adresse email');
                return;
            }

            console.log('📧 Tentative envoi magic link à:', email);
            try {
                const { data, error } = await supabaseClient.auth.signInWithOtp({ 
                    email,
                    options: {
                        emailRedirectTo: 'https://tracker.squircle.computer/app'
                    }
                });
                if (error) {
                    console.error('❌ Erreur envoi lien magique:', error);
                    alert('Erreur: ' + error.message);
                } else {
                    console.log('✅ Lien magique envoyé');
                    alert('✉️ Email envoyé ! Vérifie ta boîte mail.');
                    emailInput.value = '';
                    closeAuthModal();
                    overlay.classList.remove('active');
                }
            } catch (e) {
                console.error('❌ Exception envoi lien magique:', e);
                alert('Erreur réseau. Réessaie.');
            }
        });
    }

    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', () => {
            closeAuthModal();
            // Si la modal de tâche n'est pas active, on enlève l'overlay
            const taskModal = document.getElementById('taskModal');
            if (!taskModal || !taskModal.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        });
    }

    renderIconGrid();
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    console.log('🚀 Init démarré');
    
    loadState();

    initializeEventListeners();

    if (!window.supabaseClient) {
        console.log('⚠️ Supabase client non trouvé');
        render();
        return;
    }

    console.log('✅ Supabase client OK');

    supabaseClient.auth.getUser().then(async ({ data, error }) => {
        if (error) {
            console.error('❌ Erreur getUser:', error);
        }

        currentUser = data?.user || null;
        console.log('👤 User actuel:', currentUser ? currentUser.email : 'non connecté');
        updateAuthUI();

        if (currentUser) {
            try {
                const cloudState = await loadFromCloud();
                if (cloudState) {
                    const localState = { ...appState };
                    appState = mergeStates(localState, cloudState);
                    console.log('✅ État initial synchronisé');
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
                } else {
                    if (appState.tasks.length > 0) {
                        console.log('⬆️ Upload des données locales vers le cloud');
                        await saveToCloud(appState);
                    }
                }
            } catch (e) {
                console.error('❌ Erreur chargement état cloud initial:', e);
            }
        }

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change:', event, session?.user?.email || 'null');
            currentUser = session?.user || null;
            updateAuthUI();
            if (window.location.hash && window.location.hash.includes('access_token')) {
                console.log('🧹 Nettoyage hash URL');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            if (currentUser) {
                try {
                    const cloudState2 = await loadFromCloud();
                    if (cloudState2) {
                        const localState = { ...appState };
                        appState = mergeStates(localState, cloudState2);
                        console.log('✅ État synchronisé après login');
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
                        render();
                        return;
                    } else {
                        if (appState.tasks.length > 0) {
                            console.log('⬆️ Upload des données locales vers le cloud');
                            await saveToCloud(appState);
                        }
                    }
                } catch (e) {
                    console.error('❌ Erreur chargement état cloud après changement auth:', e);
                }
            } else {
                console.log('💾 Déconnecté, mode local uniquement');
                render();
            }
        });

        render();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
