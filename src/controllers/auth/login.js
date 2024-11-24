import navigation from '/src/services/navigation/navigation.js';
import { User } from '/src/models/user.js';
import ThemeManager from '/src/services/state/thememanager.js';
import FontManager from '/src/services/state/fontmanager.js';
import Logger from '/src/utils/logging/logger.js';
import config from '/config/client.js';
import paths from '/config/paths.js';

export class Auth {
    constructor() {
        this.form = document.getElementById('login-form');
        Logger.info('Initializing Auth controller');
        this.init();
    }

    init() {
        // Add event listener to the login form
        if (this.form) {
            Logger.debug('Setting up login form event listener');
            this.form.addEventListener('submit', async (e) => {
                // Prevent form submission
                e.preventDefault();
                e.stopPropagation();
                // Handle login
                await this.handleLogin();
                // Return false to prevent default form action
                return false;
            });
        } else {
            Logger.warn('Login form not found during initialization');
        }
    }

    async handleLogin() {
        Logger.info('Login form submitted');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            Logger.warn('Login validation failed: missing credentials');
            this.showError('Please enter both username and password');
            return;
        }

        try {
            Logger.info('Login attempt initiated', { username });
            
            // Clear any existing storage before login attempt
            Logger.debug('Clearing storage before login attempt');
            await User.clearAllStorage();
            
            // Attempt login through User model
            const user = await User.login(username, password);
            Logger.info('Login result:', user);

            if (user) {
                Logger.info('Login successful', { 
                    username: user.username, 
                    role: user.role 
                });
                
                // Verify storage consistency
                const isConsistent = User.verifyStorageConsistency();
                if (!isConsistent) {
                    Logger.error('Storage consistency check failed after login');
                    await User.clearAllStorage();
                    this.showError('Login failed due to storage inconsistency');
                    return;
                }

                // Initialize user preferences if they don't exist
                const userPreferences = User.getUserPreferences() || {
                    theme: config.ui.defaultTheme,
                    fontFamily: 'Arial',
                    notifications: config.features.enableNotifications
                };
                User.updateUserPreferences(userPreferences);
                Logger.debug('User preferences updated', userPreferences);

                // Apply user preferences
                ThemeManager.applyTheme(userPreferences.theme || config.ui.defaultTheme);
                FontManager.applyFont(userPreferences.fontFamily || 'Arial');
                Logger.debug('Applied user preferences');

                // Redirect based on role with strict role-based access
                Logger.info('Determining redirect path for role:', user.role);
                switch (user.role) {
                    case 'Genesis Admin':
                        Logger.info('Redirecting Genesis Admin to admin control panel');
                        navigation.navigateToPage('adminControlPanel');
                        break;
                    case 'Platform Admin':
                    case 'User Admin':
                        Logger.info('Redirecting Admin to platform admin dashboard');
                        navigation.navigateToPage('platformAdmin');
                        break;
                    default:
                        Logger.error('Invalid user role detected', { role: user.role });
                        this.showError('Invalid user role');
                        await User.clearAllStorage();
                        await User.logout();
                        return;
                }

            } else {
                Logger.warn('Login failed: Invalid credentials', { username });
                await User.clearAllStorage();
                this.showError('Invalid username or password');
            }
        } catch (error) {
            Logger.error('Error during login', error, {
                username,
                errorDetails: {
                    message: error.message,
                    stack: error.stack
                }
            });
            await User.clearAllStorage();
            this.showError('An error occurred. Please try again later.');
        }
    }

    showError(message) {
        Logger.warn('Displaying error message', { message });
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');

            setTimeout(() => {
                errorDiv.classList.remove('show');
                Logger.debug('Error message removed from display');
            }, config.ui.toastDuration);
        } else {
            Logger.error('Error message element not found');
        }
    }
}
