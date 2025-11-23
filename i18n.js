// Système de traduction pour Habit Tracker
const translations = {
    fr: {
        // Header & Navigation
        appTitle: 'Habit Tracker',
        weekLabel: 'Semaine du {start} au {end}',
        tasks: 'Tâches',
        languageLabel: 'Langue',
        
        // Days
        monday: 'Lun',
        tuesday: 'Mar',
        wednesday: 'Mer',
        thursday: 'Jeu',
        friday: 'Ven',
        saturday: 'Sam',
        sunday: 'Dim',
        
        // Months
        months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        
        // Buttons
        createTask: '+ Créer une tâche',
        login: 'Se connecter',
        logout: 'Se déconnecter',
        myAccount: 'Mon compte',
        cancel: 'Annuler',
        save: 'Enregistrer',
        create: 'Créer',
        
        // Task Modal
        createNewTask: 'Créer une nouvelle tâche',
        editTask: 'Modifier la tâche',
        taskName: 'Nom de la tâche',
        taskNamePlaceholder: 'Ex: Méditation, Lecture...',
        taskIcon: 'Icône',
        
        // Auth Modal
        connectionTitle: 'Connexion',
        continueWithGithub: 'Continuer avec GitHub',
        continueWithGoogle: 'Continuer avec Google',
        orByEmail: 'Ou par email',
        emailPlaceholder: 'francisco@respondant.com',
        magicLinkInfo: 'Un lien de connexion sera envoyé par email.',
        legalNotice: 'En vous connectant, vous acceptez nos {terms} et notre {privacy}.',
        termsOfUse: 'conditions d\'utilisation',
        privacyPolicy: 'politique de confidentialité',
        validateCaptcha: 'Veuillez valider le captcha',
        
        // Account Modal
        accountManagement: 'Gestion de compte',
        email: 'Email',
        lastLogin: 'Dernière connexion',
        accountNote: 'Vous pouvez exporter vos données ou supprimer définitivement votre compte.',
        exportData: 'Export my data',
        exportDataHelp: 'Télécharge toutes vos données au format JSON (tâches, historique, dates).',
        dangerZone: 'Zone dangereuse',
        deleteAccount: 'Supprimer mon compte',
        deleteAccountWarning: '⚠️ Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
        
        // Toast Messages
        taskCreated: 'Tâche créée avec succès',
        taskModified: 'Tâche modifiée avec succès',
        taskDeleted: 'Tâche "{name}" supprimée',
        dataExported: 'Données exportées avec succès',
        accountDeleted: 'Compte et données supprimés',
        errorGeneric: 'Une erreur est survenue',
        mustBeConnected: 'Vous devez être connecté',
        enterTaskName: 'Veuillez entrer un nom de tâche',
        enterEmail: 'Veuillez entrer une adresse email',
        deletionCancelled: 'Suppression annulée',
        emailSent: '✉️ Email envoyé ! Vérifie ta boîte mail.',
        sendingLink: 'Envoi du lien de connexion...',
        
        // Confirmations
        deleteTaskConfirm: 'Êtes-vous sûr de vouloir supprimer la tâche "{name}"?',
        deleteAccountConfirm: 'ATTENTION : Cette action est irréversible !\n\nToutes vos données (tâches et historique) seront définitivement supprimées.\n\nPour confirmer, tapez votre adresse email : {email}',
        
        // Empty State
        emptyState: 'Aucune tâche pour le moment. Créez une nouvelle tâche pour commencer!',
        
        // Footer
        legalMentions: 'Mentions légales',
        privacyPolicyLink: 'Politique de confidentialité',
        gdprRights: 'RGPD'
    },
    en: {
        // Header & Navigation
        appTitle: 'Habit Tracker',
        weekLabel: 'Week of {start} to {end}',
        tasks: 'Tasks',
        languageLabel: 'Language',
        
        // Days
        monday: 'Mon',
        tuesday: 'Tue',
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun',
        
        // Months
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        
        // Buttons
        createTask: '+ Create task',
        login: 'Log in',
        logout: 'Log out',
        myAccount: 'My account',
        cancel: 'Cancel',
        save: 'Save',
        create: 'Create',
        
        // Task Modal
        createNewTask: 'Create a new task',
        editTask: 'Edit task',
        taskName: 'Task name',
        taskNamePlaceholder: 'Ex: Meditation, Reading...',
        taskIcon: 'Icon',
        
        // Auth Modal
        connectionTitle: 'Login',
        continueWithGithub: 'Continue with GitHub',
        continueWithGoogle: 'Continue with Google',
        orByEmail: 'Or by email',
        emailPlaceholder: 'francisco@respondant.com',
        magicLinkInfo: 'A login link will be sent by email.',
        legalNotice: 'By logging in, you accept our {terms} and our {privacy}.',
        termsOfUse: 'terms of use',
        privacyPolicy: 'privacy policy',
        validateCaptcha: 'Please validate the captcha',
        
        // Account Modal
        accountManagement: 'Account management',
        email: 'Email',
        lastLogin: 'Last login',
        accountNote: 'You can export your data or permanently delete your account.',
        exportData: 'Export my data',
        exportDataHelp: 'Download all your data in JSON format (tasks, history, dates).',
        dangerZone: 'Danger zone',
        deleteAccount: 'Delete my account',
        deleteAccountWarning: '⚠️ This action is irreversible. All your data will be permanently deleted.',
        
        // Toast Messages
        taskCreated: 'Task created successfully',
        taskModified: 'Task modified successfully',
        taskDeleted: 'Task "{name}" deleted',
        dataExported: 'Data exported successfully',
        accountDeleted: 'Account and data deleted',
        errorGeneric: 'An error occurred',
        mustBeConnected: 'You must be logged in',
        enterTaskName: 'Please enter a task name',
        enterEmail: 'Please enter an email address',
        deletionCancelled: 'Deletion cancelled',
        emailSent: '✉️ Email sent! Check your inbox.',
        sendingLink: 'Sending login link...',
        
        // Confirmations
        deleteTaskConfirm: 'Are you sure you want to delete the task "{name}"?',
        deleteAccountConfirm: 'WARNING: This action is irreversible!\n\nAll your data (tasks and history) will be permanently deleted.\n\nTo confirm, type your email address: {email}',
        
        // Empty State
        emptyState: 'No tasks yet. Create a new task to get started!',
        
        // Footer
        legalMentions: 'Legal notices',
        privacyPolicyLink: 'Privacy policy',
        gdprRights: 'GDPR'
    }
};

// Détection de la langue par défaut
function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();
    return translations[langCode] ? langCode : 'fr';
}

// Langue par défaut (détection automatique ou sauvegardée)
let currentLanguage = localStorage.getItem('habitTrackerLanguage') || detectBrowserLanguage();

// Fonction pour obtenir une traduction
function t(key, params = {}) {
    let text = translations[currentLanguage][key] || translations['fr'][key] || key;
    
    // Remplacer les paramètres {param}
    Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return text;
}

// Fonction pour changer de langue
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('habitTrackerLanguage', lang);
        
        // Mettre à jour l'attribut lang du HTML
        document.documentElement.lang = lang;
        
        // Recharger l'interface si on est sur l'app
        if (typeof render === 'function') {
            render();
        }
        
        // Mettre à jour tous les textes statiques
        updateStaticTexts();
        
        // Mettre à jour le sélecteur de langue
        updateLanguageSelector();
    }
}

// Mettre à jour le sélecteur de langue
function updateLanguageSelector() {
    const selector = document.getElementById('languageSelector');
    if (selector) {
        selector.value = currentLanguage;
    }
}

// Fonction pour mettre à jour les textes statiques
function updateStaticTexts() {
    // Boutons principaux
    const createTaskBtn = document.getElementById('createTaskBtn');
    if (createTaskBtn) createTaskBtn.innerHTML = t('createTask');
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.textContent = t('login');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
    
    const accountMenuBtn = document.getElementById('accountMenuBtn');
    if (accountMenuBtn) accountMenuBtn.innerHTML = `<i class="fas fa-user-cog"></i>`;
    
    // Headers de jours
    const dayHeaders = document.querySelectorAll('.day-header');
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    dayHeaders.forEach((header, index) => {
        if (dayKeys[index]) {
            header.textContent = t(dayKeys[index]);
        }
    });
    
    // Colonne tâches
    const taskNameColumn = document.querySelector('.task-name-column');
    if (taskNameColumn) taskNameColumn.textContent = t('tasks');
    
    // Modal de tâche
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    if (modalCancelBtn) modalCancelBtn.textContent = t('cancel');
    
    const taskNameLabel = document.querySelector('label[for="taskName"]');
    if (taskNameLabel) taskNameLabel.textContent = t('taskName');
    
    const taskNameInput = document.getElementById('taskName');
    if (taskNameInput) taskNameInput.placeholder = t('taskNamePlaceholder');
    
    const taskIconLabel = document.querySelector('label[for="taskIcon"]');
    if (taskIconLabel) taskIconLabel.textContent = t('taskIcon');
    
    // Modal auth
    const authModalTitle = document.querySelector('#authModal .modal-header h2');
    if (authModalTitle) authModalTitle.textContent = t('connectionTitle');
    
    const loginGithubBtn = document.getElementById('loginGithubBtn');
    if (loginGithubBtn) loginGithubBtn.innerHTML = `<i class="fab fa-github"></i>${t('continueWithGithub')}`;
    
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    if (loginGoogleBtn) loginGoogleBtn.innerHTML = `<i class="fab fa-google"></i>${t('continueWithGoogle')}`;
    
    const emailLabel = document.querySelector('label[for="loginEmailInput"]');
    if (emailLabel) emailLabel.textContent = t('orByEmail');
    
    const loginEmailInput = document.getElementById('loginEmailInput');
    if (loginEmailInput) loginEmailInput.placeholder = t('emailPlaceholder');
    
    // Textes statiques du modal auth
    const magicLinkInfoText = document.querySelector('#authModal .form-group p[style]');
    if (magicLinkInfoText) magicLinkInfoText.textContent = t('magicLinkInfo');
    
    const legalNoticeText = document.querySelector('#authModal .legal-notice');
    if (legalNoticeText) {
        const termsLink = legalNoticeText.querySelector('a[href="/legal.html"]');
        const privacyLink = legalNoticeText.querySelector('a[href*="confidentialite"]');
        
        legalNoticeText.innerHTML = t('legalNotice', {
            terms: `<a href="/legal.html" target="_blank">${t('termsOfUse')}</a>`,
            privacy: `<a href="/legal.html#confidentialite" target="_blank">${t('privacyPolicy')}</a>`
        });
    }
    
    // Modal account - textes statiques
    const accountInfoLabels = document.querySelectorAll('#accountModal .account-info strong');
    if (accountInfoLabels.length >= 1) accountInfoLabels[0].textContent = t('email') + ' :';
    if (accountInfoLabels.length >= 2) accountInfoLabels[1].textContent = t('lastLogin') + ' :';
    
    const accountNote = document.querySelector('#accountModal .account-note');
    if (accountNote) accountNote.textContent = t('accountNote');
    
    // Modal account
    const accountModalTitle = document.querySelector('#accountModal .modal-header h2');
    if (accountModalTitle) accountModalTitle.textContent = t('accountManagement');
    
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.innerHTML = `<i class="fas fa-download"></i> ${t('exportData')}`;
    
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) deleteAccountBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${t('deleteAccount')}`;
    
    const dangerZoneTitle = document.querySelector('.danger-zone h3');
    if (dangerZoneTitle) dangerZoneTitle.textContent = t('dangerZone');
    
    // Empty state
    const emptyState = document.querySelector('#emptyState p');
    if (emptyState) emptyState.textContent = t('emptyState');
}

// Initialisation au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.lang = currentLanguage;
        updateStaticTexts();
        updateLanguageSelector();
    });
} else {
    document.documentElement.lang = currentLanguage;
    updateStaticTexts();
    updateLanguageSelector();
}
