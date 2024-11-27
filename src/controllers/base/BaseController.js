import Logger from '../../utils/logging/LoggerService.js';
import config from '../../../config/client.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';

export class BaseController {
    #logger;
    #view;
    #isInitialized = false;
    #componentName;

    constructor(componentName) {
        this.#logger = Logger;
        this.#componentName = componentName;
        this.#logger.info(`${this.#componentName} initializing`);
        
        // Initialize the component
        this.#initialize().catch(error => {
            this.#logger.error(`${this.#componentName} initialization error:`, error);
            this.#handleError(`Failed to initialize ${this.#componentName.toLowerCase()}`);
        });
    }

    async #initialize() {
        try {
            // Check authentication if required
            if (this.requiresAuth && !this.#checkAuth()) {
                this.#logger.warn(`Unauthorized access attempt to ${this.#componentName}`);
                navigation.navigateToPage('login');
                return;
            }

            // Initialize base view elements
            this.#initializeBaseView();
            
            // Call child's initialize method if exists
            if (this.initializeComponent) {
                await this.initializeComponent();
            }

            // Setup base event listeners
            this.#setupBaseEventListeners();
            
            // Call child's setup event listeners if exists
            if (this.setupEventListeners) {
                this.setupEventListeners();
            }

            this.#isInitialized = true;
            this.#logger.info(`${this.#componentName} initialized successfully`);
        } catch (error) {
            this.#logger.error(`${this.#componentName} initialization error:`, error);
            throw error;
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        this.#logger.info('Authorization check:', { isAuthenticated });
        return isAuthenticated;
    }

    #initializeBaseView() {
        this.#view = {
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('Base view elements initialized:', {
            hasLoadingSpinner: !!this.#view.loadingSpinner,
            hasMessageContainer: !!this.#view.messageContainer,
            hasErrorMessage: !!this.#view.errorMessage
        });
    }

    #setupBaseEventListeners() {
        // Handle error events
        document.addEventListener('showError', (event) => {
            this.#handleError(event.detail.message);
        });

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.onResume) {
                this.onResume();
            }
        });

        // Handle network status
        window.addEventListener('online', () => {
            if (this.onOnline) {
                this.onOnline();
            }
        });

        window.addEventListener('offline', () => {
            if (this.onOffline) {
                this.onOffline();
            }
        });
    }

    // Protected methods for child classes
    showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    showSuccess(message) {
        this.#logger.info('Success:', message);
        this.showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.showMessage(message, 'error');
    }

    log(level, message, ...args) {
        if (!['info', 'warn', 'error', 'debug'].includes(level)) {
            level = 'info';
        }
        this.#logger[level](`[${this.#componentName}] ${message}`, ...args);
    }

    // Public getter methods
    get componentName() {
        return this.#componentName;
    }

    get isInitialized() {
        return this.#isInitialized;
    }

    get view() {
        return this.#view;
    }

    // Virtual properties and methods for child classes
    get requiresAuth() {
        return true;
    }

    // Optional lifecycle methods for child classes to implement
    initializeComponent() {}
    setupEventListeners() {}
    onResume() {}
    onOnline() {}
    onOffline() {}
    cleanup() {}
}
