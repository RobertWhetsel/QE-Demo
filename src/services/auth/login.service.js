import navigation from '../navigation/navigation.js';
import { User } from '../../models/user.js';
import { ROLES } from '../../models/index.js';
import themeManager from '../state/thememanager.js';
import fontManager from '../state/fontmanager.js';
import Logger from '../../utils/logging/logger.js';
import paths from '../../../config/paths.js';

export class Auth {
    constructor() {
        Logger.info('Initializing Auth service');
        this.form = document.getElementById('login-form');
        this.errorMessage = document.getElementById('error-message');
        Logger.debug('Login form initialization:', {
            formFound: !!this.form,
            errorMessageFound: !!this.errorMessage
        });
        this.init();
    }

    init() {
        // Add event listener to the login form
        if (this.form) {
            Logger.info('Setting up login form event listener');
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        } else {
            Logger.warn('Login form not found during initialization');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        Logger.info('Login attempt started');

        // Clear all storage before login attempt
        Logger.debug('Clearing storage before login attempt');
        await User.clearAllStorage();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        Logger.info('Login attempt for username:', username);
        Logger.debug('Verifying clean session state:', {
            isAuthenticated: localStorage.getItem('isAuthenticated'),
            currentUser: localStorage.getItem('currentUser'),
            userRole: localStorage.getItem('userRole')
        });

        if (!username || !password) {
            Logger.warn('Login validation failed: missing credentials');
            this.showError('Please enter both username and password');
            return;
        }

        try {
            Logger.info('Attempting user login through User model');
            // Attempt login through User model
            const user = await User.login(username, password);
            
            if (user) {
                Logger.info('Login successful:', {
                    username: user.username,
                    role: user.role,
                    status: user.status
                });

                // Initialize user preferences if they don't exist
                const preferences = User.getUserPreferences() || {
                    theme: 'light',
                    fontFamily: 'Arial',
                    notifications: false
                };
                Logger.debug('User preferences loaded:', preferences);
                
                User.updateUserPreferences(preferences);
                Logger.debug('User preferences updated');

                // Apply user preferences
                Logger.debug('Applying theme:', preferences.theme);
                themeManager.applyTheme(preferences.theme || 'light');
                Logger.debug('Applying font:', preferences.fontFamily);
                fontManager.applyFont(preferences.fontFamily || 'Arial');

                // Verify session storage after login
                Logger.debug('Verifying session storage:', {
                    isAuthenticated: localStorage.getItem('isAuthenticated'),
                    username: localStorage.getItem('username'),
                    userRole: localStorage.getItem('userRole'),
                    hasCurrentUser: !!localStorage.getItem('currentUser')
                });

                // Verify storage consistency before proceeding
                const isConsistent = await User.verifyStorageConsistency();
                if (!isConsistent) {
                    Logger.error('Storage consistency check failed after login');
                    await User.clearAllStorage();
                    this.showError('Login failed due to storage inconsistency');
                    return;
                }

                // Redirect based on role with strict role-based access
                Logger.info('Determining redirect based on role:', user.role);
                switch (user.role) {
                    case ROLES.GENESIS_ADMIN:
                        Logger.info('Redirecting Genesis Admin to admin control panel');
                        const adminPath = paths.join(paths.pages, 'adminControlPanel.html');
                        navigation.navigateTo(adminPath);
                        break;
                    case ROLES.PLATFORM_ADMIN:
                    case ROLES.USER_ADMIN:
                        Logger.info('Redirecting Admin to platform admin dashboard');
                        const platformPath = paths.join(paths.pages, 'platformAdmin.html');
                        navigation.navigateTo(platformPath);
                        break;
                    case ROLES.USER:
                        Logger.info('Redirecting User to dashboard');
                        const dashboardPath = paths.join(paths.pages, 'dashboard.html');
                        navigation.navigateTo(dashboardPath);
                        break;
                    default:
                        Logger.error('Invalid user role detected:', user.role);
                        this.showError('Invalid user role');
                        await User.clearAllStorage();
                        await User.logout();
                }
            } else {
                Logger.warn('Login failed: User.login returned null');
                await User.clearAllStorage();
                this.showError('Invalid username or password');
            }
        } catch (error) {
            Logger.error('Login error:', error, {
                message: error.message,
                stack: error.stack,
                localStorage: {
                    isAuthenticated: localStorage.getItem('isAuthenticated'),
                    username: localStorage.getItem('username'),
                    userRole: localStorage.getItem('userRole')
                }
            });
            await User.clearAllStorage();
            this.showError('An error occurred. Please try again later.');
        }
    }

    showError(message) {
        Logger.warn('Showing error message:', message);
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');

            setTimeout(() => {
                this.errorMessage.classList.remove('show');
                Logger.debug('Error message hidden');
            }, 3000);
        } else {
            Logger.error('Error message element not found');
        }
    }
}
