import paths from '../../../config/paths.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../config/client.js';
import { ROLES } from '../../models/index.js';

export class LoginController {
    #logger;
    #view;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('LoginController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Clear storage if logging out
            if (window.location.search.includes('logout=true')) {
                this.#logger.info('Logout detected, clearing storage');
                await User.clearAllStorage();
            }

            this.#isInitialized = true;
            this.#logger.info('LoginController initialized');
        } catch (error) {
            this.#logger.error('LoginController initialization error:', error);
            this.#handleError('Failed to initialize login');
        }
    }

    #initializeView() {
        this.#view = {
            form: document.getElementById('login-form'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasForm: !!this.#view.form,
            hasUsername: !!this.#view.username,
            hasPassword: !!this.#view.password,
            hasErrorMessage: !!this.#view.errorMessage,
            hasLoadingSpinner: !!this.#view.loadingSpinner
        });
    }

    #setupEventListeners() {
        if (this.#view.form) {
            this.#view.form.addEventListener('submit', (e) => this.#handleLogin(e));
            this.#logger.info('Login form handler attached');
        } else {
            this.#logger.warn('Login form not found during initialization');
        }
    }

    async #handleLogin(event) {
        event.preventDefault();
        this.#logger.info('Login attempt started');

        if (!this.#isInitialized) {
            this.#logger.error('Login attempted before initialization');
            this.#handleError('System not ready. Please try again.');
            return;
        }

        const username = this.#view.username.value.trim();
        const password = this.#view.password.value.trim();

        if (!this.#validateCredentials(username, password)) {
            return;
        }

        try {
            this.#showLoading(true);
            const user = await this.#attemptLogin(username, password);
            
            if (user) {
                await this.#handleSuccessfulLogin(user);
            } else {
                this.#handleError('Invalid username or password');
            }
        } catch (error) {
            this.#logger.error('Login error:', error);
            this.#handleError('An error occurred during login. Please try again.');
        } finally {
            this.#showLoading(false);
        }
    }

    #validateCredentials(username, password) {
        if (!username || !password) {
            this.#logger.warn('Login validation failed: missing credentials');
            this.#handleError('Please enter both username and password');
            return false;
        }
        return true;
    }

    async #attemptLogin(username, password) {
        this.#logger.info('Attempting login for user:', username);
        
        try {
            const user = await User.login(username, password);
            this.#logger.info('Login result:', { success: !!user });
            return user;
        } catch (error) {
            this.#logger.error('Login attempt failed:', error);
            throw error;
        }
    }

    async #handleSuccessfulLogin(user) {
        this.#logger.info('Login successful:', {
            username: user.username,
            role: user.role
        });

        try {
            // Verify storage consistency
            const isConsistent = await User.verifyStorageConsistency();
            if (!isConsistent) {
                throw new Error('Storage consistency check failed');
            }

            // Initialize and apply user preferences
            await this.#initializeUserPreferences();

            // Navigate based on role
            await this.#handleRoleBasedNavigation(user.role);
        } catch (error) {
            this.#logger.error('Post-login error:', error);
            await User.clearAllStorage();
            this.#handleError('Login failed: ' + error.message);
        }
    }

    async #initializeUserPreferences() {
        const preferences = User.getUserPreferences() || {
            theme: config.ui.defaultTheme,
            fontFamily: 'Arial',
            notifications: config.features.enableNotifications
        };

        this.#logger.debug('Applying user preferences:', preferences);
        User.updateUserPreferences(preferences);
        ThemeManager.applyTheme(preferences.theme);
        FontManager.applyFont(preferences.fontFamily);
    }

    async #handleRoleBasedNavigation(role) {
        this.#logger.info('Handling navigation for role:', role);

        switch (role) {
            case ROLES.GENESIS_ADMIN:
                this.#logger.info('Redirecting Genesis Admin to admin control panel');
                navigation.navigateToPage('adminControlPanel');
                break;
            case ROLES.PLATFORM_ADMIN:
            case ROLES.USER_ADMIN:
                this.#logger.info('Redirecting Admin to platform admin dashboard');
                navigation.navigateToPage('platformAdmin');
                break;
            case ROLES.USER:
                this.#logger.info('Redirecting User to dashboard');
                navigation.navigateToPage('dashboard');
                break;
            default:
                throw new Error('Invalid user role');
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #handleError(message) {
        this.#logger.warn('Login error:', message);
        if (this.#view.errorMessage) {
            this.#view.errorMessage.textContent = message;
            this.#view.errorMessage.classList.add('show');

            setTimeout(() => {
                this.#view.errorMessage.classList.remove('show');
                this.#logger.debug('Error message hidden');
            }, config.ui.toastDuration);
        } else {
            this.#logger.error('Error message element not found');
        }
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LoginController();
});