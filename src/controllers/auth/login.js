import paths from '../../../config/paths.js';

// Get module paths from CORE_PATHS.modules
const { modules } = paths.core;

let User, navigation, ThemeManager, FontManager, Logger, config;

// Load dependencies
async function loadDependencies() {
    const [
        userModule,
        navigationModule,
        themeManagerModule,
        fontManagerModule,
        loggerModule,
        configModule
    ] = await Promise.all([
        import(paths.resolve(modules.user, true)),
        import(paths.resolve(modules.navigation, true)),
        import(paths.resolve(modules.themeManager, true)),
        import(paths.resolve(modules.fontManager, true)),
        import(paths.resolve(modules.logger, true)),
        import(paths.resolve(modules.config, true))
    ]);

    User = userModule.User;
    navigation = navigationModule.default;
    ThemeManager = themeManagerModule.default;
    FontManager = fontManagerModule.default;
    Logger = loggerModule.default;
    config = configModule.default;
}

export class Auth {
    constructor() {
        loadDependencies().then(() => {
            Logger.info('Auth controller constructor called');
            this.initialize();
        }).catch(error => {
            console.error('Error loading Auth dependencies:', error);
        });
    }

    initialize() {
        Logger.info('Initializing Auth controller');
        this.setupFormHandler();
    }

    setupFormHandler() {
        this.form = document.getElementById('login-form');
        Logger.debug('Setting up login form handler:', { formFound: !!this.form });
        
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        } else {
            Logger.warn('Login form not found during initialization');
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
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
            
            // Only clear storage if explicitly logging out
            if (window.location.search.includes('logout=true')) {
                Logger.debug('Logout detected, clearing storage');
                await User.clearAllStorage();
            }
            
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
                        return;
                }

            } else {
                Logger.warn('Login failed: Invalid credentials', { username });
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
