import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import { ROLES } from '../../models/index.js';
import config from '../../../config/client.js';

export class UserCreationController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('UserCreationController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to user creation');
                this.#handleError('Unauthorized access');
                return;
            }

            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup form handler
            this.#setupFormHandler();

            this.#isInitialized = true;
            this.#logger.info('UserCreationController initialized successfully');
        } catch (error) {
            this.#logger.error('UserCreationController initialization error:', error);
            this.#handleError('Failed to initialize user creation');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && userRole === ROLES.GENESIS_ADMIN;
    }

    #initializeView() {
        this.#view = {
            form: document.getElementById('admin-creation-form'),
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            role: document.getElementById('role'),
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasForm: !!this.#view.form,
            hasUsername: !!this.#view.username,
            hasEmail: !!this.#view.email,
            hasPassword: !!this.#view.password,
            hasRole: !!this.#view.role
        });
    }

    #setupFormHandler() {
        if (this.#view.form) {
            this.#view.form.addEventListener('submit', (e) => this.#handleFormSubmit(e));
            this.#logger.info('Form handler setup complete');
        } else {
            this.#logger.warn('Form not found during initialization');
        }
    }

    async #handleFormSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing user creation form submission');
        
        try {
            this.#showLoading(true);

            const formData = this.#getFormData();
            
            // Validate form data
            if (!this.#validateFormData(formData)) {
                return;
            }
            
            // Check for existing user
            const data = this.#dataService.getData();
            if (data.users.some(user => user.username === formData.username)) {
                throw new Error('Username already exists');
            }
            
            // Add new user
            await this.#createUser(formData);

            this.#showSuccess('User created successfully');
            event.target.reset();
            
            // Dispatch event to notify other components
            this.#dispatchUserCreatedEvent(formData);

        } catch (error) {
            this.#logger.error('Error creating user:', error);
            this.#handleError(error.message);
        } finally {
            this.#showLoading(false);
        }
    }

    #getFormData() {
        return {
            username: this.#view.username.value.trim(),
            email: this.#view.email.value.trim(),
            password: this.#view.password.value,
            role: this.#view.role.value,
            status: 'active',
            created: new Date().toISOString()
        };
    }

    #validateFormData(formData) {
        // Check required fields
        if (!formData.username || !formData.email || !formData.password || !formData.role) {
            this.#handleError('All fields are required');
            return false;
        }

        // Validate username
        if (formData.username.length < 3) {
            this.#handleError('Username must be at least 3 characters long');
            return false;
        }

        // Validate email
        if (!this.#isValidEmail(formData.email)) {
            this.#handleError('Please enter a valid email address');
            return false;
        }

        // Validate password
        if (formData.password.length < 8) {
            this.#handleError('Password must be at least 8 characters long');
            return false;
        }

        // Validate role
        if (!Object.values(ROLES).includes(formData.role)) {
            this.#handleError('Invalid role selected');
            return false;
        }

        return true;
    }

    async #createUser(userData) {
        try {
            await this.#dataService.addUser(userData);
            this.#logger.info('User created successfully:', { username: userData.username });
            return true;
        } catch (error) {
            this.#logger.error('Error adding user to data service:', error);
            throw new Error('Failed to create user');
        }
    }

    #dispatchUserCreatedEvent(userData) {
        const event = new CustomEvent('userCreated', {
            detail: {
                username: userData.username,
                role: userData.role,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
        this.#logger.info('User created event dispatched');
    }

    #isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type, duration = config.ui.toastDuration) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `sidebar__message sidebar__message--${type}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';

        if (this.#view.errorMessage) {
            this.#view.errorMessage.innerHTML = '';
            this.#view.errorMessage.appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.remove();
            }, duration);
        }
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    resetForm() {
        if (this.#view.form) {
            this.#view.form.reset();
        }
    }

    isFormValid() {
        if (!this.#view.form) return false;
        return this.#validateFormData(this.#getFormData());
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserCreationController();
});