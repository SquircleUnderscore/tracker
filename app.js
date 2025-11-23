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
let pendingSaveState = null; // Queue pour sauvegardes multiples
let currentWeekOffset = 0;

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
    weekStart.setDate(weekStart.getDate() + (currentWeekOffset * 7));
    return weekStart;
}

function formatDate(date) {
    // Utilise le timezone local de l'utilisateur
    // Note: si l'utilisateur voyage, les dates peuvent sembler décalées
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
    
    const monthNames = t('months');
    
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    return t('weekLabel', { start: `${startDay} ${startMonth}`, end: `${endDay} ${endMonth}` });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function navigateWeek(offset) {
    currentWeekOffset += offset;
    render();
}

function goToCurrentWeek() {
    currentWeekOffset = 0;
    render();
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
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
            appState = { tasks: [], taskStates: {}, lastModified: new Date().toISOString() };
        }
    }
}

function saveState() {
    appState.lastModified = new Date().toISOString();
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        // Quota dépassé ou localStorage indisponible
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            showToast('Stockage local plein. Vos données sont sauvegardées dans le cloud.', 'error');
        } else {
            console.error('Erreur localStorage:', e);
        }
    }

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
    
    // Si sauvegarde en cours, mémoriser l'état pour sauvegarder après
    if (cloudSaveInProgress) {
        pendingSaveState = state;
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
            showToast('Erreur de synchronisation cloud', 'error');
        }
    } finally {
        cloudSaveInProgress = false;
        
        // Si un état était en attente, le sauvegarder maintenant
        if (pendingSaveState) {
            const stateToSave = pendingSaveState;
            pendingSaveState = null;
            await saveToCloud(stateToSave);
        }
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
        showToast(t('errorGeneric'), 'error');
        return null;
    }

    if (!data) {
        return null;
    }
    
    return data.data;
}

function mergeStates(localState, cloudState) {
    if (!localState || !localState.tasks) return cloudState;
    if (!cloudState || !cloudState.tasks) return localState;
    
    const localTime = localState.lastModified ? new Date(localState.lastModified).getTime() : 0;
    const cloudTime = cloudState.lastModified ? new Date(cloudState.lastModified).getTime() : 0;
    
    const timeDiff = Math.abs(cloudTime - localTime);
    
    if (timeDiff > 5000) {
        if (cloudTime > localTime) {
            return cloudState;
        }
        if (localTime > cloudTime) {
            return localState;
        }
    }

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
            // Merge au niveau des dates individuelles, pas écrasement global
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

function openModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('taskModalTitle');
    const modalBtn = document.getElementById('modalCreateBtn');
    const taskNameInput = document.getElementById('taskName');
    const editingTaskIdInput = document.getElementById('editingTaskId');
    
    if (taskId) {
        const task = appState.tasks.find(t => t.id === taskId);
        if (task) {
            modalTitle.textContent = t('editTask');
            modalBtn.textContent = t('save');
            taskNameInput.value = task.name;
            editingTaskIdInput.value = taskId;
            updateIconSelection(task.icon);
        }
    } else {
        modalTitle.textContent = t('createNewTask');
        modalBtn.textContent = t('create');
        taskNameInput.value = '';
        editingTaskIdInput.value = '';
        updateIconSelection('fa-star');
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
    taskNameInput.focus();
}

function closeModal() {
    const modal = document.getElementById('taskModal');
    const overlay = document.getElementById('modalOverlay');
    modal.classList.remove('active');
    document.getElementById('taskName').value = '';
    document.getElementById('selectedIcon').value = 'fa-star';
    document.getElementById('editingTaskId').value = '';
    updateIconSelection('fa-star');
    const authModal = document.getElementById('authModal');
    const accountModal = document.getElementById('accountModal');
    if ((!authModal || !authModal.classList.contains('active')) &&
        (!accountModal || !accountModal.classList.contains('active'))) {
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
    const editingTaskId = document.getElementById('editingTaskId').value;
    
    if (!taskName) {
        showToast(t('enterTaskName'), 'error');
        return;
    }
    
    // Limite de 100 caractères pour éviter débordement UI et quota storage
    if (taskName.length > 100) {
        showToast(t('taskNameTooLong'), 'error');
        return;
    }
    
    // Validation de l'icône sélectionnée (whitelist)
    if (!ICON_OPTIONS.includes(selectedIcon)) {
        showToast(t('errorGeneric'), 'error');
        return;
    }
    
    if (editingTaskId) {
        const task = appState.tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.name = taskName;
            task.icon = selectedIcon;
            saveState();
            closeModal();
            render();
            showToast(t('taskModified'), 'success');
        }
    } else {
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
        showToast(t('taskCreated'), 'success');
    }
}

function deleteTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    const taskName = task ? task.name : 'cette tâche';
    if (confirm(t('deleteTaskConfirm', { name: taskName }))) {
        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        delete appState.taskStates[taskId];
        saveState();
        render();
        showToast(t('taskDeleted', { name: taskName }), 'info');
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

let lastClickTime = {};

function cycleDayState(taskId, dateString) {
    const clickKey = `${taskId}_${dateString}`;
    const now = Date.now();
    
    // Debounce: ignorer les clics trop rapides (< 300ms)
    if (lastClickTime[clickKey] && now - lastClickTime[clickKey] < 300) {
        return;
    }
    lastClickTime[clickKey] = now;
    
    const currentState = getDayState(taskId, dateString);
    let nextState = 'empty';
    
    if (currentState === 'empty') {
        nextState = 'in-progress';
    } else if (currentState === 'in-progress') {
        nextState = 'completed';
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0.5, y: 1 },
                angle: 90,
                startVelocity: 45
            });
        }
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
    taskRow.setAttribute('draggable', 'true');
    taskRow.setAttribute('data-task-id', task.id);
    
    const taskNameCell = document.createElement('div');
    taskNameCell.className = 'task-name-cell';
    
    const dragHandle = document.createElement('div');
    dragHandle.className = 'task-drag-handle';
    dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    dragHandle.setAttribute('aria-label', t('dragToReorder'));
    dragHandle.setAttribute('role', 'button');
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'task-icon';
    iconDiv.innerHTML = `<i class="fas ${task.icon}"></i>`;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'task-name';
    nameDiv.textContent = task.name;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'task-edit-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.setAttribute('aria-label', t('editTask'));
    editBtn.addEventListener('click', () => openModal(task.id));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.setAttribute('aria-label', t('deleteTask'));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    taskNameCell.appendChild(dragHandle);
    taskNameCell.appendChild(iconDiv);
    taskNameCell.appendChild(nameDiv);
    taskNameCell.appendChild(actionsDiv);
    
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
    taskRow.addEventListener('dragstart', handleDragStart);
    taskRow.addEventListener('dragend', handleDragEnd);
    taskRow.addEventListener('dragover', handleDragOver);
    taskRow.addEventListener('drop', handleDrop);
    taskRow.addEventListener('dragenter', handleDragEnter);
    taskRow.addEventListener('dragleave', handleDragLeave);
    
    return taskRow;
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.task-row').forEach(row => {
        row.classList.remove('drag-over');
    });
    draggedElement = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (e.currentTarget !== draggedElement) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const dropTarget = e.currentTarget;
    if (draggedElement && draggedElement !== dropTarget) {
        const draggedId = draggedElement.getAttribute('data-task-id');
        const targetId = dropTarget.getAttribute('data-task-id');
        
        const draggedIndex = appState.tasks.findIndex(t => t.id === draggedId);
        const targetIndex = appState.tasks.findIndex(t => t.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [removed] = appState.tasks.splice(draggedIndex, 1);
            appState.tasks.splice(targetIndex, 0, removed);
            
            saveState();
            render();
        }
    }
    
    return false;
}

function render() {
    document.getElementById('weekLabel').textContent = getWeekLabel();
    
    const tasksContainer = document.getElementById('tasksContainer');
    
    // Nettoyer les anciens event listeners en clonant le conteneur
    const newTasksContainer = tasksContainer.cloneNode(false);
    tasksContainer.parentNode.replaceChild(newTasksContainer, tasksContainer);
    
    if (appState.tasks.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        appState.tasks.forEach(task => {
            newTasksContainer.appendChild(renderTaskRow(task));
        });
    }
}

// ========================================
// AUTH UI
// ========================================

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountMenuBtn = document.getElementById('accountMenuBtn');

    if (!loginBtn || !logoutBtn) return;

    if (currentUser) {
        loginBtn.style.display = 'none';
        if (accountMenuBtn) accountMenuBtn.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        if (accountMenuBtn) accountMenuBtn.style.display = 'none';
    }
}

// ========================================
// RGPD - EXPORT & DELETE
// ========================================

async function exportUserData() {
    if (!currentUser) {
        showToast(t('mustBeConnected'), 'error');
        return;
    }

    const dataExport = {
        exportDate: new Date().toISOString(),
        userId: currentUser.id,
        email: currentUser.email,
        tasks: appState.tasks,
        taskStates: appState.taskStates,
        lastModified: appState.lastModified
    };

    const dataStr = JSON.stringify(dataExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(t('dataExported'), 'success');
}

async function deleteUserAccount() {
    if (!currentUser) {
        showToast(t('mustBeConnected'), 'error');
        return;
    }

    const confirmation = prompt(t('deleteAccountConfirm', { email: currentUser.email }));

    if (confirmation !== currentUser.email) {
        showToast(t('deletionCancelled'), 'info');
        return;
    }

    try {
        if (window.supabaseClient) {
            const { data, error: deleteError } = await supabaseClient
                .from('habit_states')
                .delete()
                .eq('user_id', currentUser.id)
                .select();

            if (deleteError) {
                console.error('❌ Erreur suppression données:', deleteError);
                showToast(t('errorGeneric') + ': ' + deleteError.message, 'error');
                return;
            }
        }
        appState = { tasks: [], taskStates: {}, lastModified: new Date().toISOString() };
        localStorage.removeItem(STORAGE_KEY);
        
        if (window.supabaseClient) {
            await supabaseClient.auth.signOut();
        }

        showToast(t('accountDeleted'), 'success');
        closeAccountModal();
        render();
    } catch (error) {
        console.error('Erreur suppression compte:', error);
        showToast(t('errorGeneric'), 'error');
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

function openAccountModal() {
    const modal = document.getElementById('accountModal');
    const overlay = document.getElementById('modalOverlay');
    const emailDisplay = document.getElementById('accountEmailDisplay');
    const lastLoginDisplay = document.getElementById('accountLastLogin');
    if (!modal || !overlay) return;
    
    if (currentUser) {
        if (emailDisplay) {
            emailDisplay.textContent = currentUser.email;
        }
        if (lastLoginDisplay) {
            const lastSignIn = currentUser.last_sign_in_at || currentUser.created_at;
            if (lastSignIn) {
                const date = new Date(lastSignIn);
                const options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                };
                lastLoginDisplay.textContent = date.toLocaleString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US', options);
            } else {
                lastLoginDisplay.textContent = '-';
            }
        }
    }
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function closeAccountModal() {
    const modal = document.getElementById('accountModal');
    if (!modal) return;
    modal.classList.remove('active');
}

// ========================================
// EVENT LISTENERS
// ========================================

function initializeEventListeners() {
    const createTaskBtn = document.getElementById('createTaskBtn');
    const modalCreateBtn = document.getElementById('modalCreateBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    
    if (createTaskBtn) createTaskBtn.addEventListener('click', openModal);
    if (modalCreateBtn) modalCreateBtn.addEventListener('click', createTask);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => navigateWeek(1));

    // Prévention du drag & drop par défaut sur le document
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', openStatsModal);
    }

    const statsModalCloseBtn = document.getElementById('statsModalCloseBtn');
    if (statsModalCloseBtn) {
        statsModalCloseBtn.addEventListener('click', () => {
            closeStatsModal();
            const overlay = document.getElementById('modalOverlay');
            const taskModal = document.getElementById('taskModal');
            const authModal = document.getElementById('authModal');
            const accountModal = document.getElementById('accountModal');
            if (!taskModal.classList.contains('active') && 
                !authModal.classList.contains('active') && 
                !accountModal.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        });
    }

    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            closeModal();
            closeAuthModal();
            closeAccountModal();
            closeStatsModal();
            overlay.classList.remove('active');
        });
    }

    const taskModal = document.getElementById('taskModal');
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const accountModal = document.getElementById('accountModal');
    if (accountModal) {
        accountModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const statsModal = document.getElementById('statsModal');
    if (statsModal) {
        statsModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const taskNameInput = document.getElementById('taskName');
    if (taskNameInput) {
        taskNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createTask();
            }
        });
    }

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
                if (window.supabaseClient) {
                    await supabaseClient.auth.signOut();
                }
                closeAccountModal();
                const overlay = document.getElementById('modalOverlay');
                if (overlay) overlay.classList.remove('active');
            } catch (e) {
                console.error('Erreur logout:', e);
            }
        });
    }

    if (loginGithubBtn) {
        loginGithubBtn.addEventListener('click', async () => {
            const turnstileToken = window.turnstile?.getResponse();
            if (!turnstileToken) {
                showToast(t('validateCaptcha'), 'error');
                return;
            }
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        redirectTo: 'https://tracker.squircle.computer/app',
                        captchaToken: turnstileToken
                    }
                });
                if (error) {
                    console.error('❌ Erreur login GitHub:', error);
                    showToast(t('errorGeneric') + ': ' + error.message, 'error');
                }
            } catch (e) {
                console.error('❌ Exception login GitHub:', e);
                showToast(t('errorGeneric'), 'error');
            }
        });
    }

    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', async () => {
            const turnstileToken = window.turnstile?.getResponse();
            if (!turnstileToken) {
                showToast(t('validateCaptcha'), 'error');
                return;
            }
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: 'https://tracker.squircle.computer/app',
                        captchaToken: turnstileToken
                    }
                });
                if (error) {
                    console.error('❌ Erreur login Google:', error);
                    showToast(t('errorGeneric') + ': ' + error.message, 'error');
                }
            } catch (e) {
                console.error('❌ Exception login Google:', e);
                showToast(t('errorGeneric'), 'error');
            }
        });
    }

    if (loginEmailBtn) {
        loginEmailBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('loginEmailInput');
            const email = emailInput.value.trim();
            if (!email) {
                showToast(t('enterEmail'), 'error');
                return;
            }
            // Validation email basique
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast(t('errorGeneric'), 'error');
                return;
            }
            const turnstileToken = window.turnstile?.getResponse();
            if (!turnstileToken) {
                showToast(t('validateCaptcha'), 'error');
                return;
            }
            loginEmailBtn.disabled = true;
            loginEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            showToast(t('sendingLink'), 'info');

            try {
                const { data, error } = await supabaseClient.auth.signInWithOtp({ 
                    email,
                    options: {
                        emailRedirectTo: 'https://tracker.squircle.computer/app',
                        captchaToken: turnstileToken
                    }
                });
                if (error) {
                    console.error('❌ Erreur envoi lien magique:', error);
                    showToast(t('errorGeneric') + ': ' + error.message, 'error');
                    loginEmailBtn.disabled = false;
                    loginEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                } else {
                    showToast(t('emailSent'), 'success');
                    emailInput.value = '';
                    closeAuthModal();
                    overlay.classList.remove('active');
                    loginEmailBtn.disabled = false;
                    loginEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                }
            } catch (e) {
                console.error('❌ Exception envoi lien magique:', e);
                showToast(t('errorGeneric'), 'error');
                loginEmailBtn.disabled = false;
                loginEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            }
        });
    }

    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', () => {
            closeAuthModal();
            const taskModal = document.getElementById('taskModal');
            if (!taskModal || !taskModal.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        });
    }

    const accountMenuBtn = document.getElementById('accountMenuBtn');
    if (accountMenuBtn) {
        accountMenuBtn.addEventListener('click', openAccountModal);
    }

    const accountModalCloseBtn = document.getElementById('accountModalCloseBtn');
    if (accountModalCloseBtn) {
        accountModalCloseBtn.addEventListener('click', () => {
            closeAccountModal();
            const taskModal = document.getElementById('taskModal');
            const authModal = document.getElementById('authModal');
            if ((!taskModal || !taskModal.classList.contains('active')) &&
                (!authModal || !authModal.classList.contains('active'))) {
                overlay.classList.remove('active');
            }
        });
    }

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportUserData);
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', deleteUserAccount);
    }

    // Account modal language selector
    const accountLanguageSelector = document.getElementById('accountLanguageSelector');
    if (accountLanguageSelector) {
        accountLanguageSelector.value = currentLanguage;
        
        accountLanguageSelector.addEventListener('change', (e) => {
            const lang = e.target.value;
            setLanguage(lang);
        });
    }
    
    // Navigation clavier globale
    document.addEventListener('keydown', (e) => {
        // Esc ferme les modaux
        if (e.key === 'Escape') {
            const taskModal = document.getElementById('taskModal');
            const authModal = document.getElementById('authModal');
            const accountModal = document.getElementById('accountModal');
            const statsModal = document.getElementById('statsModal');
            const overlay = document.getElementById('modalOverlay');
            
            if (taskModal && taskModal.classList.contains('active')) {
                closeModal();
            } else if (authModal && authModal.classList.contains('active')) {
                closeAuthModal();
                if (overlay) overlay.classList.remove('active');
            } else if (accountModal && accountModal.classList.contains('active')) {
                closeAccountModal();
                if (overlay) overlay.classList.remove('active');
            } else if (statsModal && statsModal.classList.contains('active')) {
                closeStatsModal();
                if (overlay) overlay.classList.remove('active');
            }
        }
        
        // Flèches gauche/droite pour naviguer entre semaines (si pas dans input)
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            if (e.key === 'ArrowLeft') {
                navigateWeek(-1);
            } else if (e.key === 'ArrowRight') {
                navigateWeek(1);
            }
        }
    });

    renderIconGrid();
}

// ========================================
// STATISTICS FUNCTIONS
// ========================================

function openStatsModal() {
    const statsModal = document.getElementById('statsModal');
    const overlay = document.getElementById('modalOverlay');
    if (statsModal && overlay) {
        statsModal.classList.add('active');
        overlay.classList.add('active');
        generateStatistics();
    }
}

function closeStatsModal() {
    const statsModal = document.getElementById('statsModal');
    if (statsModal) {
        statsModal.classList.remove('active');
    }
    // Détruire le graphique pour libérer la mémoire
    if (window.statsChart) {
        window.statsChart.destroy();
        window.statsChart = null;
    }
}

function generateStatistics() {
    generateSummaryStats();
    generateProgressChart();
}

function generateSummaryStats() {
    const now = new Date();
    const last30Days = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        last30Days.push(formatDate(date));
    }
    
    let totalCompleted = 0;
    let totalPossible = 0;
    let currentStreak = 0;
    let streakActive = true;
    
    // Pour chaque tâche, trouver sa première date réelle (soit createdAt, soit le premier état)
    appState.tasks.forEach(task => {
        let firstRealDate = task.createdAt;
        
        // Vérifier si des états existent avant createdAt
        if (appState.taskStates[task.id]) {
            const statesDates = Object.keys(appState.taskStates[task.id]);
            if (statesDates.length > 0) {
                const earliestState = statesDates.sort()[0];
                if (!firstRealDate || earliestState < firstRealDate) {
                    firstRealDate = earliestState;
                }
            }
        }
        
        last30Days.forEach(date => {
            // Ne compter que les jours où la tâche existait déjà
            if (!firstRealDate || date >= firstRealDate) {
                const state = appState.taskStates[task.id]?.[date];
                totalPossible++;
                if (state === 'completed') {
                    totalCompleted++;
                }
            }
        });
    });
    
    // Calculate streak (from today going backwards)
    for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        
        let dayHasCompleted = false;
        appState.tasks.forEach(task => {
            const state = appState.taskStates[task.id]?.[dateStr];
            if (state === 'completed') {
                dayHasCompleted = true;
            }
        });
        
        if (dayHasCompleted && streakActive) {
            currentStreak++;
        } else if (i > 0) {
            // Only break streak after first day (today can be incomplete)
            streakActive = false;
        }
    }
    
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    
    document.getElementById('totalCompletedStat').textContent = totalCompleted;
    document.getElementById('currentStreakStat').textContent = currentStreak;
    document.getElementById('completionRateStat').textContent = completionRate + '%';
}

function generateProgressChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) {
        return;
    }
    
    // Vérifier si Chart.js est chargé
    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999;">Graphique indisponible (CDN non chargé)</p>';
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart if exists
    if (window.statsChart) {
        window.statsChart.destroy();
    }
    
    const now = new Date();
    const labels = [];
    const data = [];
    const lang = window.currentLanguage || 'fr';
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        
        let completedCount = 0;
        appState.tasks.forEach(task => {
            const state = appState.taskStates[task.id]?.[dateStr];
            if (state === 'completed') {
                completedCount++;
            }
        });
        
        labels.push(date.toLocaleDateString(lang, { month: 'short', day: 'numeric' }));
        data.push(completedCount);
    }
    
    const chartLabel = lang === 'fr' ? 'Tâches complétées' : 'Completed tasks';
    
    window.statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: chartLabel,
                data: data,
                borderColor: '#4bbb70',
                backgroundColor: 'rgba(75, 187, 112, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#575279',
                    titleColor: '#FFFAF3',
                    bodyColor: '#FFFAF3',
                    borderColor: '#cecacd',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666'
                    },
                    grid: {
                        color: '#dfdad9'
                    }
                },
                x: {
                    ticks: {
                        color: '#666',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    loadState();

    initializeEventListeners();

    if (!window.supabaseClient) {
        render();
        return;
    }

    supabaseClient.auth.getUser().then(async ({ data, error }) => {
        if (error) {
            console.error('❌ Erreur getUser:', error);
        }

        currentUser = data?.user || null;
        updateAuthUI();

        if (currentUser) {
            try {
                const cloudState = await loadFromCloud();
                if (cloudState) {
                    const localState = { ...appState };
                    appState = mergeStates(localState, cloudState);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
                } else {
                    if (appState.tasks.length > 0) {
                        await saveToCloud(appState);
                    }
                }
            } catch (e) {
                console.error('❌ Erreur chargement état cloud initial:', e);
            }
        }

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session?.user || null;
            updateAuthUI();
            if (window.location.hash && window.location.hash.includes('access_token')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            if (event === 'SIGNED_OUT') {
                currentUser = null;
                updateAuthUI();
                render();
                return;
            }
            if (currentUser) {
                try {
                    const cloudState2 = await loadFromCloud();
                    if (cloudState2) {
                        const localState = { ...appState };
                        appState = mergeStates(localState, cloudState2);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
                        render();
                        return;
                    } else {
                        if (appState.tasks.length > 0) {
                            await saveToCloud(appState);
                        }
                    }
                } catch (e) {
                    console.error('❌ Erreur chargement état cloud après changement auth:', e);
                }
            } else {
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
