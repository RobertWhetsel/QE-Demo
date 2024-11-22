import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';
import Logger from '../../utils/logging/logger.js';

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
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        } else {
            Logger.warn('Login form not found during initialization');
        }
    }

    async handleLogin(event) {
        event.preventDefault();

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

            if (user) {
                Logger.info('Login successful', { 
                    username: user.username, 
                    role: user.role 
                });
                
                // Verify storage consistency
                const isConsistent = await User.verifyStorageConsistency();
                if (!isConsistent) {
                    Logger.error('Storage consistency check failed after login');
                    await User.clearAllStorage();
                    this.showError('Login failed due to storage inconsistency');
                    return;
                }

                // Initialize user preferences if they don't exist
                const userPreferences = User.getUserPreferences() || {
                    theme: 'light',
                    fontFamily: 'Arial',
                    notifications: false
                };
                User.updateUserPreferences(userPreferences);
                Logger.debug('User preferences updated', userPreferences);

                // Apply user preferences
                ThemeManager.applyTheme(userPreferences.theme || 'light');
                FontManager.applyFont(userPreferences.fontFamily || 'Arial');
                Logger.debug('Applied user preferences');

                // Redirect based on role with strict role-based access
                switch (user.role) {
                    case 'Genesis Admin':
                        Logger.info('Redirecting Genesis Admin to admin control panel');
                        navigation.navigateTo('/src/views/pages/adminControlPanel.html');
                        break;
                    case 'Platform Admin':
                    case 'User Admin':
                        Logger.info('Redirecting Admin to platform admin dashboard');
                        navigation.navigateTo('/src/views/pages/platformAdmin.html');
                        break;
                    default:
                        Logger.error('Invalid user role detected', { role: user.role });
                        this.showError('Invalid user role');
                        await User.clearAllStorage();
                        await User.logout();
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
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        this.form.insertBefore(errorDiv, this.form.firstChild);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
                Logger.debug('Error message removed from display');
            }
        }, 3000);
    }
}
