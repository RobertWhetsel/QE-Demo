import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import navigation from '../../services/navigation/navigation.js';
import Logger from '../../utils/logging/logger.js';
import paths from '../../../config/paths.js';
import config from '../../../config/client.js';
import { ROLES } from '../../models/index.js';

export class GenesisAdminController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;
    #minimumPasswordLength = 8;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('GenesisAdminController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Check if Genesis Admin already exists
            if (await this.#checkExistingAdmin()) {
                this.#logger.warn('Genesis Admin already exists');
                navigation.navigateToPage('login');
                return;
            }

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('GenesisAdminController initialized successfully');
        } catch (error) {
            this.#logger.error('GenesisAdminController initialization error:', error);
            this.#handleError('Failed to initialize Genesis Admin setup');
        }
    }

    async #checkExistingAdmin() {
        try {
            const data = await this.#dataService.getData();
            return data?.users?.some(user => user.role === ROLES.GENESIS_ADMIN);
        } catch (error) {
            this.#logger.error('Error checking existing admin:', error);
            return false;
        }
    }

    #initializeView() {
        this.#view = {
            // Form elements
            form: document.getElementById('genesis-admin-form'),
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirm-password'),
            
            // Other elements
            strengthIndicator: document.getElementById('password-strength'),
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasForm: !!this.#view.form,
            hasUsername: !!this.#view.username,
            hasEmail: !!this.#view.email,
            hasPassword: !!this.#view.password,
            hasConfirmPassword: !!this.#view.confirmPassword
        });
    }

    #setupEventListeners() {
        // Form submission
        if (this.#view.form) {
            this.#view.form.addEventListener('submit', (e) => this.#handleFormSubmit(e));
        }

        // Password strength checking
        if (this.#view.password) {
            this.#view.password.addEventListener('input', () => this.#checkPasswordStrength());
        }

        // Password confirmation matching
        if (this.#view.confirmPassword) {
            this.#view.confirmPassword.addEventListener('input', () => this.#checkPasswordMatch());
        }

        this.#logger.debug('Event listeners setup complete');
    }

    async #handleFormSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing Genesis Admin form submission');
        
        try {
            this.#showLoading(true);

            const formData = this.#getFormData();
            
            // Validate form data
            if (!this.#validateFormData(formData)) {
                return;
            }
            
            // Create Genesis Admin
            await this.#createGenesisAdmin(formData);

            // Login the new admin
            await this.#loginGenesisAdmin(formData);

            this.#showSuccess('Genesis Admin account created successfully');
            this.#redirectToAdminPanel();

        } catch (error) {
            this.#logger.error('Error creating Genesis Admin:', error);
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
            confirmPassword: this.#view.confirmPassword.value
        };
    }

    #validateFormData(formData) {
        // Check required fields
        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
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
        if (!this.#isValidPassword(formData.password)) {
            this.#handleError('Password does not meet security requirements');
            return false;
        }

        // Check password match
        if (formData.password !== formData.confirmPassword) {
            this.#handleError('Passwords do not match');
            return false;
        }

        return true;
    }

    #isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    #isValidPassword(password) {
        return password.length >= this.#minimumPasswordLength &&
               /[A-Z]/.test(password) && // Has uppercase
               /[a-z]/.test(password) && // Has lowercase
               /[0-9]/.test(password) && // Has number
               /[^A-Za-z0-9]/.test(password); // Has special char
    }

    #checkPasswordStrength() {
        if (!this.#view.password || !this.#view.strengthIndicator) return;

        const password = this.#view.password.value;
        let strength = 0;
        let feedback = [];

        // Length check
        if (password.length >= this.#minimumPasswordLength) {
            strength++;
        } else {
            feedback.push(`At least ${this.#minimumPasswordLength} characters`);
        }

        // Uppercase check
        if (/[A-Z]/.test(password)) {
            strength++;
        } else {
            feedback.push('One uppercase letter');
        }

        // Lowercase check
        if (/[a-z]/.test(password)) {
            strength++;
        } else {
            feedback.push('One lowercase letter');
        }

        // Number check
        if (/[0-9]/.test(password)) {
            strength++;
        } else {
            feedback.push('One number');
        }

        // Special character check
        if (/[^A-Za-z0-9]/.test(password)) {
            strength++;
        } else {
            feedback.push('One special character');
        }

        // Update strength indicator
        const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
        const strengthClass = ['very-weak', 'weak', 'fair', 'good', 'strong'][strength];

        this.#view.strengthIndicator.textContent = feedback.length ? `Needed: ${feedback.join(', ')}` : strengthText;
        this.#view.strengthIndicator.className = `password-strength ${strengthClass}`;
    }

    #checkPasswordMatch() {
        if (!this.#view.password || !this.#view.confirmPassword) return;

        const password = this.#view.password.value;
        const confirmPassword = this.#view.confirmPassword.value;

        if (confirmPassword && password !== confirmPassword) {
            this.#view.confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            this.#view.confirmPassword.setCustomValidity('');
        }
    }

    async #createGenesisAdmin(formData) {
        const adminData = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: ROLES.GENESIS_ADMIN,
            status: 'active',
            created: new Date().toISOString()
        };

        await this.#dataService.addUser(adminData);
        this.#logger.info('Genesis Admin created successfully');
    }

    async #loginGenesisAdmin(formData) {
        const user = await User.login(formData.username, formData.password);
        if (!user) {
            throw new Error('Failed to login after creation');
        }
        this.#logger.info('Genesis Admin logged in successfully');
    }

    #redirectToAdminPanel() {
        this.#logger.info('Redirecting to admin control panel');
        navigation.navigateToPage('adminControlPanel');
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        if (this.#view.errorMessage) {
            this.#view.errorMessage.textContent = message;
            this.#view.errorMessage.className = `message message--${type}`;
            this.#view.errorMessage.style.display = 'block';

            setTimeout(() => {
                this.#view.errorMessage.style.display = 'none';
            }, config.ui.toastDuration);
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
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GenesisAdminController();
});