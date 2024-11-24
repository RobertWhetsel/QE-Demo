// Import dependencies using paths.resolve after paths is available
let ThemeManager, FontManager, User, DataService, Logger, config, navigation;

// Initialize state managers
export async function initializeApp() {
    try {
        // Import modules using paths.resolve
        ThemeManager = (await import(paths.resolve('src/services/state/thememanager.js'))).default;
        FontManager = (await import(paths.resolve('src/services/state/fontmanager.js'))).default;
        User = (await import(paths.resolve('src/models/user.js'))).User;
        DataService = (await import(paths.resolve('src/models/dataservice.js'))).DataService;
        Logger = (await import(paths.resolve('src/utils/logging/logger.js'))).default;
        config = (await import(paths.resolve('config/client.js'))).default;
        navigation = (await import(paths.resolve('src/services/navigation/navigation.js'))).default;

        await Logger.info('Application Initialization Started');
        await Logger.info('Current location:', window.location.pathname);

        // Log initial storage state
        await Logger.info('Initial storage state:', {
            localStorage: {
                keys: Object.keys(localStorage)
            }
        });

        // Check if we're on the login page
        const isLoginPage = window.location.pathname.includes('login.html');
        await Logger.info('Is login page:', isLoginPage);

        // Wait for CSS files to load
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });

        // Initialize managers
        await Logger.info('Initializing theme manager');
        ThemeManager.initialize();
        await Logger.info('Initializing font manager');
        FontManager.initialize();
        
        // Initialize global QE object
        await Logger.info('Setting up global QE object');
        window.QE = window.QE || {};
        window.QE.User = User;
        window.QE.config = config;
        
        // Initialize DataService
        const dataService = new DataService();
        await dataService.init();
        window.QE.DataService = dataService;
        
        // If on login page, just initialize theme and font
        if (isLoginPage) {
            await Logger.info('Login page initialization');
            ThemeManager.setTheme(config.ui.defaultTheme);
            FontManager.setFont('Arial');
            await Logger.info('Login page initialized successfully');
            return;
        }

        // Check authentication for non-login pages
        await Logger.info('Checking authentication status');
        const isAuthenticated = User.isAuthenticated();
        const username = localStorage.getItem(config.storage.keys.username);
        await Logger.info('Authentication check:', { isAuthenticated, username });

        if (!isAuthenticated) {
            await Logger.warn('Not authenticated, redirecting to login');
            navigation.navigateTo(paths.resolve('src/views/pages/login.html'));
            return;
        }

        // Load user data if authenticated
        if (username) {
            await Logger.info('Loading user data for:', username);
            
            // Get current user
            await Logger.info('Retrieving current user data');
            const user = User.getCurrentUser();
            await Logger.info('Current user data:', user ? {
                username: user.username,
                role: user.role,
                status: user.status
            } : 'No user data found');

            if (!user) {
                await Logger.warn('User data not found, redirecting to login');
                navigation.navigateTo(paths.resolve('src/views/pages/login.html'));
                return;
            }

            // Store user data globally
            await Logger.info('Setting global user data');
            window.QE.currentUser = user;
            window.QE.userRole = user.role;

            // Load user preferences
            await Logger.info('Loading user preferences');
            const userPreferences = User.getUserPreferences() || {
                theme: config.ui.defaultTheme,
                fontFamily: 'Arial',
                notifications: config.features.enableNotifications
            };
            await Logger.info('User preferences loaded:', userPreferences);
            
            // Apply theme and font from preferences
            if (userPreferences) {
                if (userPreferences.theme) {
                    await Logger.info('Applying theme:', userPreferences.theme);
                    ThemeManager.setTheme(userPreferences.theme);
                }
                if (userPreferences.fontFamily) {
                    await Logger.info('Applying font:', userPreferences.fontFamily);
                    FontManager.setFont(userPreferences.fontFamily);
                }
            }
            
            // Listen for preference changes
            await Logger.info('Setting up preference change listener');
            window.addEventListener('storage', async (event) => {
                if (event.key === 'userPreferences') {
                    await Logger.info('Preference change detected');
                    const preferences = JSON.parse(event.newValue || '{}');
                    await Logger.info('New preferences:', preferences);
                    
                    if (preferences.theme) {
                        await Logger.info('Updating theme:', preferences.theme);
                        ThemeManager.setTheme(preferences.theme);
                    }
                    if (preferences.fontFamily) {
                        await Logger.info('Updating font:', preferences.fontFamily);
                        FontManager.setFont(preferences.fontFamily);
                    }
                }
            });

            // Dispatch event when user data is ready
            await Logger.info('Dispatching userDataReady event');
            const userDataEvent = new CustomEvent('userDataReady', {
                detail: {
                    user,
                    role: user.role,
                    preferences: userPreferences
                }
            });
            document.dispatchEvent(userDataEvent);
            await Logger.info('User data ready event dispatched');
        }
        
        // Mark initialization as complete
        document.documentElement.setAttribute('data-app-initialized', 'true');
        
        // Dispatch event when initialization is complete
        await Logger.info('Dispatching appInitialized event');
        const initEvent = new CustomEvent('appInitialized', {
            detail: {
                isAuthenticated,
                username,
                user: User.getCurrentUser()
            }
        });
        document.dispatchEvent(initEvent);
        await Logger.info('Application initialization complete');
        
    } catch (error) {
        await Logger.error('Error during initialization:', error);
        await Logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            storage: {
                username: localStorage.getItem(config?.storage?.keys?.username),
                isAuthenticated: localStorage.getItem(config?.storage?.keys?.auth),
                userRole: localStorage.getItem(config?.storage?.keys?.userRole)
            }
        });
    } finally {
        await Logger?.flush();
    }
}

// Initialize immediately when script is loaded
initializeApp().catch(async error => {
    console.error('Error initializing application:', error);
    // Attempt to log error if Logger is available
    if (Logger) {
        await Logger.error('Error initializing application:', error);
        await Logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            storage: {
                username: localStorage.getItem(config?.storage?.keys?.username),
                isAuthenticated: localStorage.getItem(config?.storage?.keys?.auth),
                userRole: localStorage.getItem(config?.storage?.keys?.userRole)
            }
        });
        await Logger.flush();
    }
});
