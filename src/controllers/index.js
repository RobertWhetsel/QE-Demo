import paths from '/config/paths.js';
import { DataService } from '/src/models/dataservice.js';
import navigation from '/src/services/navigation/navigation.js';
import Logger from '/src/utils/logging/logger.js';
import config from '/config/client.js';

// Define constants for page paths using paths module
export const PAGE_PATHS = {
    LOGIN: paths.getPagePath('login'),
    PLATFORM_ADMIN: paths.getPagePath('platformAdmin'),
    USER_PROFILE: paths.getPagePath('userProfile'),
    ADMIN_CONTROL_PANEL: paths.getPagePath('adminControlPanel'),
    SETTINGS: paths.getPagePath('settings'),
    DASHBOARD: paths.getPagePath('dashboard'),
    VOLUNTEER_DASHBOARD: paths.getPagePath('volunteerDashboard'),
    TASKS: paths.getPagePath('tasks'),
    MESSAGES: paths.getPagePath('messages'),
    SURVEY: paths.getPagePath('survey'),
    AVAILABLE_SURVEYS: paths.getPagePath('availableSurveys'),
    COMPLETED_SURVEYS: paths.getPagePath('completedSurveys'),
    RESEARCH: paths.getPagePath('research'),
    RESEARCH_DASHBOARD: paths.getPagePath('researchDashboard'),
    GENESIS_ADMIN: paths.getPagePath('genesisAdmin'),
    SPREADSHEET: paths.getPagePath('spreadsheet')
};

export class IndexController {
    #dataService;
    #logger;
    #view;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('IndexController initializing');
        this.#initialize();
    }

    async #initialize() {
        this.#logger.info('Setting up IndexController');
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Initialize specific page if needed
            const currentPage = this.#getCurrentPage();
            if (currentPage) {
                await this.#initializePage(currentPage);
            }

            this.#logger.info('IndexController initialized');
        } catch (error) {
            this.#logger.error('IndexController initialization error:', error);
            this.#handleError('Failed to initialize application');
        }
    }

    #initializeView() {
        this.#view = {
            logsButton: document.getElementById('logsButton'),
            beginButton: document.getElementById('begin-button'),
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('View elements initialized:', {
            hasLogsButton: !!this.#view.logsButton,
            hasBeginButton: !!this.#view.beginButton,
            hasLoadingSpinner: !!this.#view.loadingSpinner,
            hasErrorMessage: !!this.#view.errorMessage
        });
    }

    #setupEventListeners() {
        if (this.#view.logsButton) {
            this.#view.logsButton.addEventListener('click', () => {
                this.#logger.info('Logs button clicked');
                navigation.navigateToUtil('logger');
            });
        }

        if (this.#view.beginButton) {
            this.#view.beginButton.addEventListener('click', () => {
                this.#logger.info('Begin button clicked');
                this.#handleBegin();
            });
        }

        // Listen for error events
        document.addEventListener('showError', (event) => {
            this.#showError(event.detail.message, event.detail.duration);
        });
    }

    async #handleBegin() {
        try {
            this.#logger.info('Begin process started');
            this.#showLoading(true);
            
            const appData = await this.#dataService.getData();
            this.#logger.info('App data loaded:', appData);
            
            if (appData?.users && appData.users.length > 0) {
                this.#logger.info('Users exist, redirecting to login');
                navigation.navigateToPage('login');
            } else {
                this.#logger.info('No users found, redirecting to genesis admin creation');
                navigation.navigateToPage('genesisAdmin');
            }
        } catch (error) {
            this.#logger.error('Error during begin process:', error);
            this.#handleError('Error initializing application. Please try again.');
        } finally {
            this.#showLoading(false);
        }
    }

    async #initializePage(pageName) {
        this.#logger.info('Initializing page:', pageName);
        
        try {
            switch (pageName) {
                case 'login':
                    this.#logger.info('Initializing login page');
                    break;
                case 'platformAdmin':
                    this.#logger.info('Initializing platform admin page');
                    break;
                case 'userProfile':
                    this.#logger.info('Initializing user profile page');
                    break;
                case 'adminControlPanel':
                    this.#logger.info('Initializing admin control panel');
                    break;
                case 'settings':
                    this.#logger.info('Initializing settings page');
                    break;
                case 'dashboard':
                    this.#logger.info('Initializing dashboard page');
                    break;
                case 'volunteerDashboard':
                    this.#logger.info('Initializing volunteer dashboard page');
                    break;
                case 'tasks':
                    this.#logger.info('Initializing tasks page');
                    break;
                case 'messages':
                    this.#logger.info('Initializing messages page');
                    break;
                case 'survey':
                    this.#logger.info('Initializing survey page');
                    break;
                case 'availableSurveys':
                    this.#logger.info('Initializing available surveys page');
                    break;
                case 'completedSurveys':
                    this.#logger.info('Initializing completed surveys page');
                    break;
                case 'research':
                    this.#logger.info('Initializing research page');
                    break;
                case 'researchDashboard':
                    this.#logger.info('Initializing research dashboard page');
                    break;
                case 'genesisAdmin':
                    this.#logger.info('Initializing genesis admin page');
                    break;
                case 'spreadsheet':
                    this.#logger.info('Initializing spreadsheet page');
                    break;
                default:
                    this.#logger.warn('Unknown page:', pageName);
            }
        } catch (error) {
            this.#logger.error('Error initializing page:', {
                page: pageName,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    #getCurrentPage() {
        const path = window.location.pathname;
        return Object.keys(PAGE_PATHS).find(key => PAGE_PATHS[key] === path);
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showError(message, duration = config.ui.toastDuration) {
        if (this.#view.errorMessage) {
            this.#view.errorMessage.textContent = message;
            this.#view.errorMessage.classList.add('show');
            
            setTimeout(() => {
                this.#view.errorMessage.classList.remove('show');
            }, duration);
        }
    }

    #handleError(message) {
        this.#logger.warn('Showing error:', message);
        this.#showError(message);
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new IndexController();
});