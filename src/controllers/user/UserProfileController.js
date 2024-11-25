import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';

export class UserProfileController {
    #logger;
    #view;
    #user;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('UserProfileController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Verify authentication
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to user profile');
                navigation.navigateToPage('login');
                return;
            }

            // Get current user
            this.#user = User.getCurrentUser();
            if (!this.#user) {
                throw new Error('Failed to load user data');
            }

            // Initialize view elements
            this.#initializeView();
            
            // Load user data
            this.#loadUserData();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('UserProfileController initialized successfully');
        } catch (error) {
            this.#logger.error('UserProfileController initialization error:', error);
            this.#handleError('Failed to initialize user profile');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        this.#logger.info('Authentication check:', { isAuthenticated });
        return isAuthenticated;
    }

    #initializeView() {
        this.#view = {
            // Forms
            personalInfoForm: document.getElementById('personal-info-form'),
            accountSettingsForm: document.getElementById('account-settings-form'),
            
            // Personal info fields
            usernameField: document.getElementById('username'),
            fullNameField: document.getElementById('fullName'),
            emailField: document.getElementById('email'),
            phoneField: document.getElementById('phone'),
            
            // Password fields
            currentPasswordField: document.getElementById('currentPassword'),
            newPasswordField: document.getElementById('newPassword'),
            confirmPasswordField: document.getElementById('confirmPassword'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasPersonalInfoForm: !!this.#view.personalInfoForm,
            hasAccountSettingsForm: !!this.#view.accountSettingsForm,
            hasUsernameField: !!this.#view.usernameField,
            hasMessageContainer: !!this.#view.messageContainer
        });
    }

    #loadUserData() {
        if (!this.#user) return;

        this.#logger.info('Loading user data');
        
        // Populate personal info form
        if (this.#view.usernameField) this.#view.usernameField.value = this.#user.username;
        if (this.#view.fullNameField) this.#view.fullNameField.value = this.#user.fullName || '';
        if (this.#view.emailField) this.#view.emailField.value = this.#user.email || '';
        if (this.#view.phoneField) this.#view.phoneField.value = this.#user.phoneNumber || '';

        this.#logger.debug('User data loaded successfully');
    }

    #setupEventListeners() {
        // Handle personal info form submission
        if (this.#view.personalInfoForm) {
            this.#view.personalInfoForm.addEventListener('submit', (e) => this.#handlePersonalInfoUpdate(e));
        }

        // Handle password change form submission
        if (this.#view.accountSettingsForm) {
            this.#view.accountSettingsForm.addEventListener('submit', (e) => this.#handlePasswordChange(e));
        }

        this.#logger.debug('Event listeners setup complete');
    }

    async #handlePersonalInfoUpdate(event) {
        event.preventDefault();
        this.#logger.info('Processing personal info update');

        try {
            this.#showLoading(true);

            const updates = {
                fullName: this.#view.fullNameField.value.trim(),
                email: this.#view.emailField.value.trim(),
                phoneNumber: this.#view.phoneField.value.trim()
            };

            if (!this.#validatePersonalInfo(updates)) {
                return;
            }

            if (User.updateCurrentUser(updates)) {
                this.#user = User.getCurrentUser();
                this.#showSuccess('Personal information updated successfully');
            } else {
                throw new Error('Failed to update personal information');
            }
        } catch (error) {
            this.#logger.error('Personal info update error:', error);
            this.#handleError(error.message);
        } finally {
            this.#showLoading(false);
        }
    }

    async #handlePasswordChange(event) {
        event.preventDefault();
        this.#logger.info('Processing password change');

        try {
            this.#showLoading(true);

            const currentPassword = this.#view.currentPasswordField.value;
            const newPassword = this.#view.newPasswordField.value;
            const confirmPassword = this.#view.confirmPasswordField.value;

            if (!this.#validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
                return;
            }

            if (User.updatePassword(currentPassword, newPassword)) {
                this.#showSuccess('Password updated successfully');
                this.#view.accountSettingsForm.reset();
            } else {
                throw new Error('Failed to update password. Please check your current password.');
            }
        } catch (error) {
            this.#logger.error('Password change error:', error);
            this.#handleError(error.message);
        } finally {
            this.#showLoading(false);
        }
    }

    #validatePersonalInfo(updates) {
        if (!updates.email || !this.#isValidEmail(updates.email)) {
            this.#handleError('Please enter a valid email address');
            return false;
        }
        return true;
    }

    #validatePasswordChange(currentPassword, newPassword, confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.#handleError('All password fields are required');
            return false;
        }

        if (newPassword.length < 8) {
            this.#handleError('New password must be at least 8 characters long');
            return false;
        }

        if (newPassword !== confirmPassword) {
            this.#handleError('New passwords do not match');
            return false;
        }

        return true;
    }

    #isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.warn('Error:', message);
        this.#showMessage(message, 'error');
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserProfileController();
});