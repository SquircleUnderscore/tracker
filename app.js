// ========================================
// HABIT TRACKER - SIMPLE VERSION
// ========================================

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
    taskStates: {}
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    // On renvoie un nouvel objet Date pour éviter de modifier "now" directement
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// STORAGE FUNCTIONS
// ========================================

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            appState = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading state:', e);
            appState = { tasks: [], taskStates: {} };
        }
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function exportData() {
    const dataStr = JSON.stringify(appState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-tracker-${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Données exportées!');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.tasks && imported.taskStates) {
                appState = imported;
                saveState();
                render();
                alert('Données importées avec succès!');
            } else {
                alert('Format de fichier invalide');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Erreur lors de l\'importation');
        }
    };
    reader.readAsText(file);
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
    overlay.classList.remove('active');
    document.getElementById('taskName').value = '';
    document.getElementById('selectedIcon').value = 'fa-star';
    updateIconSelection('fa-star');
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
    alert(`Tâche "${taskName}" créée!`);
}

function deleteTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    const taskName = task ? task.name : 'cette tâche';
    if (confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${taskName}"?`)) {
        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        delete appState.taskStates[taskId];
        saveState();
        render();
        alert('Tâche supprimée');
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
// EVENT LISTENERS
// ========================================

function initializeEventListeners() {
    document.getElementById('createTaskBtn').addEventListener('click', openModal);
    document.getElementById('modalCreateBtn').addEventListener('click', createTask);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', closeModal);
    
    document.getElementById('taskModal').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.getElementById('taskName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createTask();
        }
    });
    
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
            e.target.value = '';
        }
    });
    
    renderIconGrid();
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    loadState();
    initializeEventListeners();
    render();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
