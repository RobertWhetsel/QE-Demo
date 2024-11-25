import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import { ROLES } from '../../models/index.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';

export class RegisterController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;
    #minimumPasswordLength = 8;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('RegisterController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('RegisterController initialized successfully');
        } catch (error) {
            this.#logger.error('RegisterController initialization error:', error);
            this.#handleError('Failed to initialize registration');
        }
    }

    #initializeView() {
        this.#view = {
            // Form elements
            form: document.getElementById('registration-form'),
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirm-password'),
            role: document.getElementById('role'),
            
            // Additional elements
            strengthIndicator: document.getElementById('password-strength'),
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasForm: !!this.#view.form,
            hasUsernameField: !!this.#view.username,
            hasEmailField: !!this.#view.email,
            hasPasswordField: !!this.#view.password,
            hasRoleField: !!this.#view.role
        });
    }

    #setupEventListeners() {
        if (this.#view.form) {
            this.#view.form.addEventListener('submit', (e) => this.#handleRegistration(e));
        }

        if (this.#view.password) {
            this.#view.password.addEventListener('input', () => this.#checkPasswordStrength());
        }

        if (this.#view.confirmPassword) {
            this.#view.confirmPassword.addEventListener('input', () => this.#checkPasswordMatch());
        }

        this.#logger.debug('Event listeners setup complete');
    }

    async #handleRegistration(event) {
        event.preventDefault();
        this.#logger.info('Processing registration submission');

        try {
            this.#showLoading(true);

            const formData = this.#getFormData();
            
            // Validate registration data
            if (!this.#validateRegistrationData(formData)) {
                return;
            }

            // Check if username exists
            if (await this.#checkUsernameExists(formData.username)) {
                this.#handleError('Username already exists');
                return;
            }

            // Create new user
            const newUser = await this.#createUser(formData);

            // Initialize preferences
            this.#initializeUserPreferences(newUser);

            // Log in the new user
            await this.#loginNewUser(formData);

            // Navigate based on role
            this.#handleRoleBasedNavigation(formData.role);

        } catch (error) {
            this.#logger.error('Registration error:', {
                error: error.message,
                stack: error.stack
            });
            this.#handleError('An error occurred during registration');
        } finally {
            this.#showLoading(false);
        }
    }

    #getFormData() {
        return {
            username: this.#view.username.value.trim(),
            email: this.#view.email.value.trim(),
            password: this.#view.password.value,
            confirmPassword: this.#view.confirmPassword?.value,
            role: this.#view.role.value
        };
    }

    #validateRegistrationData(data) {
        if (!data.username || !data.email || !data.password) {
            this.#handleError('All required fields must be filled out');
            return false;
        }

        if (data.username.length < 3) {
            this.#handleError('Username must be at least 3 characters long');
            return false;
        }

        if (!this.#isValidEmail(data.email)) {
            this.#handleError('Please enter a valid email address');
            return false;
        }

        if (!this.#isValidPassword(data.password)) {
            this.#handleError('Password does not meet security requirements');
            return false;
        }

        if (data.confirmPassword && data.password !== data.confirmPassword) {
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
               /[0-9]/.test(password); // Has number
    }

    async #checkUsernameExists(username) {
        const users = await this.#dataService.getData();
        return users.some(user => user.username === username);
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

        const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good'][strength];
        this.#view.strengthIndicator.textContent = feedback.length ? 
            `Needed: ${feedback.join(', ')}` : strengthText;
    }

    #checkPasswordMatch() {
        if (!this.#view.password || !this.#view.confirmPassword) return;

        const match = this.#view.password.value === this.#view.confirmPassword.value;
        this.#view.confirmPassword.setCustomValidity(match ? '' : 'Passwords do not match');
    }

    async #createUser(formData) {
        const newUser = {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            role: formData.role,
            status: 'active',
            created: new Date().toISOString()
        };

        await this.#dataService.addUser(newUser);
        this.#logger.info('New user created:', { username: newUser.username });

        return newUser;
    }

    #initializeUserPreferences(user) {
        const userPreferences = {
            theme: 'light',
            fontFamily: 'Arial',
            notifications: false
        };
        User.updateUserPreferences(userPreferences);
        this.#logger.info('User preferences initialized');
    }

    async #loginNewUser(formData) {
        const loggedInUser = await User.login(formData.username, formData.password);
        if (!loggedInUser) {
            throw new Error('Failed to log in after registration');
        }
        this.#logger.info('User logged in successfully');
    }

    #handleRoleBasedNavigation(role) {
        this.#logger.info('Handling navigation for role:', role);

        if (role === ROLES.GENESIS_ADMIN) {
            this.#logger.info('Genesis Admin registered successfully');
            this.#showSuccess('Welcome! Thank you for Registering! You are the Genesis Admin.');
            navigation.navigateToPage('platformAdmin');
        } else {
            this.#logger.info('User registered successfully');
            navigation.navigateToPage('platformAdmin');
        }
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

    // Public methods for external access
    resetForm() {
        if (this.#view.form) {
            this.#view.form.reset();
        }
    }

    isFormValid() {
        if (!this.#view.form) return false;
        return this.#validateRegistrationData(this.#getFormData());
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RegisterController();
});