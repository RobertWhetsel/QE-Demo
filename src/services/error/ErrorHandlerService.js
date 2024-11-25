import Logger from '../../utils/logging/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

class ErrorHandlerService {
    #logger;
    #errorContainer;
    #successContainer;
    #isInitialized = false;
    #errorStack = [];
    #maxErrorStackSize = 50;
    #debugMode = SITE_STATE === 'dev';

    constructor() {
        this.#logger = Logger;
        this.#logger.info('ErrorHandlerService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Initialize containers
            this.#initializeContainers();
            
            // Setup global error handlers
            this.#setupGlobalHandlers();

            // Setup error event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('ErrorHandlerService initialized successfully');
        } catch (error) {
            this.#logger.error('ErrorHandlerService initialization error:', error);
            console.error('Failed to initialize error handling service:', error);
        }
    }

    #initializeContainers() {
        // Create error container if it doesn't exist
        if (!document.getElementById('error-container')) {
            this.#errorContainer = document.createElement('div');
            this.#errorContainer.id = 'error-container';
            this.#errorContainer.className = 'error-container';
            document.body.appendChild(this.#errorContainer);
        } else {
            this.#errorContainer = document.getElementById('error-container');
        }

        // Create success container if it doesn't exist
        if (!document.getElementById('success-container')) {
            this.#successContainer = document.createElement('div');
            this.#successContainer.id = 'success-container';
            this.#successContainer.className = 'success-container';
            document.body.appendChild(this.#successContainer);
        } else {
            this.#successContainer = document.getElementById('success-container');
        }
    }

    #setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.#handleUnhandledRejection(event);
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            this.#handleGlobalError(event);
        });
    }

    #setupEventListeners() {
        // Listen for showError events
        document.addEventListener('showError', (event) => {
            this.showError(event.detail.message, event.detail.duration);
        });

        // Listen for showSuccess events
        document.addEventListener('showSuccess', (event) => {
            this.showSuccess(event.detail.message, event.detail.duration);
        });

        // Listen for clearErrors events
        document.addEventListener('clearErrors', () => {
            this.clearErrors();
        });
    }

    #handleUnhandledRejection(event) {
        const error = event.reason;
        const errorInfo = {
            type: 'Unhandled Promise Rejection',
            message: error.message || 'Unknown error occurred',
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        this.#logError(errorInfo);
        this.showError('An unexpected error occurred. Please try again.');
    }

    #handleGlobalError(event) {
        const errorInfo = {
            type: 'Global Error',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            timestamp: new Date().toISOString()
        };

        this.#logError(errorInfo);
        this.showError('An unexpected error occurred. Please try again.');
    }

    #logError(errorInfo) {
        // Add to error stack
        this.#errorStack.unshift(errorInfo);
        if (this.#errorStack.length > this.#maxErrorStackSize) {
            this.#errorStack.pop();
        }

        // Log error
        this.#logger.error('Application error:', errorInfo);

        // Save to session storage if in debug mode
        if (this.#debugMode) {
            try {
                const errors = JSON.parse(sessionStorage.getItem('errorLog') || '[]');
                errors.unshift(errorInfo);
                sessionStorage.setItem('errorLog', JSON.stringify(errors.slice(0, this.#maxErrorStackSize)));
            } catch (e) {
                this.#logger.error('Error saving to error log:', e);
            }
        }
    }

    showError(message, duration = config.ui.toastDuration) {
        if (!this.#isInitialized || !this.#errorContainer) {
            console.error('Error container not initialized');
            return;
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;

        this.#errorContainer.appendChild(errorElement);

        // Add to error stack
        this.#logError({
            type: 'User Error',
            message,
            timestamp: new Date().toISOString()
        });

        // Remove after duration
        setTimeout(() => {
            errorElement.classList.add('fade-out');
            setTimeout(() => errorElement.remove(), 300);
        }, duration);
    }

    showSuccess(message, duration = config.ui.toastDuration) {
        if (!this.#isInitialized || !this.#successContainer) {
            console.error('Success container not initialized');
            return;
        }

        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;

        this.#successContainer.appendChild(successElement);

        // Remove after duration
        setTimeout(() => {
            successElement.classList.add('fade-out');
            setTimeout(() => successElement.remove(), 300);
        }, duration);
    }

    clearErrors() {
        if (this.#errorContainer) {
            this.#errorContainer.innerHTML = '';
        }
    }

    // Public methods for error handling
    handleApiError(error) {
        let message = 'An error occurred while communicating with the server.';
        
        if (error.response) {
            // Server responded with error
            message = error.response.data?.message || message;
        } else if (error.request) {
            // No response received
            message = 'Unable to reach the server. Please check your connection.';
        }

        this.showError(message);
        this.#logError({
            type: 'API Error',
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            timestamp: new Date().toISOString()
        });
    }

    handleValidationError(errors) {
        const message = Array.isArray(errors) 
            ? errors.join('\n')
            : 'Please check your input and try again.';

        this.showError(message);
        this.#logError({
            type: 'Validation Error',
            message,
            errors,
            timestamp: new Date().toISOString()
        });
    }

    handleAuthError(error) {
        const message = 'Your session has expired. Please log in again.';
        this.showError(message);
        this.#logError({
            type: 'Auth Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // Public getters
    get errorStack() {
        return [...this.#errorStack];
    }

    get isDebugMode() {
        return this.#debugMode;
    }
}

// Create and export singleton instance
const errorHandler = new ErrorHandlerService();
export default errorHandler;