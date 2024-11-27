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

        // Check if we're on index or login page
        const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
        const isLoginPage = window.location.pathname.includes('login.html');
        await Logger.info('Page type:', { isIndexPage, isLoginPage });

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

        // Clear auth data only when explicitly logging out and remove logout param
        if (isLoginPage && window.location.search.includes('logout=true')) {
            await Logger.info('Logout detected, clearing auth data');
            await User.clearAllStorage();
            // Remove logout param to prevent loop
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // If on index or login page, just initialize theme and font
        if (isIndexPage || isLoginPage) {
            await Logger.info('Basic page initialization');
            ThemeManager.setTheme(config.ui.defaultTheme);
            FontManager.setFont('Arial');

            // Set logo source
            const logo = document.getElementById('logoImg');
            if (logo) {
                logo.src = paths.getAssetPath('logo');
                await Logger.info('Logo source set');
            }

            await Logger.info('Basic page initialized successfully');
            
            // Dispatch initialization complete event
            document.documentElement.setAttribute('data-app-initialized', 'true');
            document.dispatchEvent(new CustomEvent('appInitialized'));
            return;
        }

        // Check authentication for other pages
        await Logger.info('Checking authentication status');
        const isAuthenticated = User.isAuthenticated();
        const username = localStorage.getItem(config.storage.keys.username);
        await Logger.info('Authentication check:', { isAuthenticated, username });

        if (!isAuthenticated) {
            await Logger.warn('Not authenticated, redirecting to login');
            navigation.navigateToPage('login');
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
                navigation.navigateToPage('login');
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

            // Load shared layout for authenticated pages
            await Logger.info('Loading shared layout');
            const layoutResponse = await fetch(paths.resolve('src/views/components/shared/layout.html'));
            const layoutHtml = await layoutResponse.text();
            document.getElementById('layout-container').innerHTML = layoutHtml;
            await Logger.info('Shared layout loaded');

            // Set logo source
            const logo = document.getElementById('logo');
            if (logo) {
                logo.src = paths.getAssetPath('logo');
                await Logger.info('Logo source set');
            }

            // Mark initialization as complete
            document.documentElement.setAttribute('data-app-initialized', 'true');
            
            // Dispatch initialization complete event first
            await Logger.info('Dispatching appInitialized event');
            document.dispatchEvent(new CustomEvent('appInitialized', {
                detail: {
                    isAuthenticated,
                    username,
                    user: User.getCurrentUser()
                }
            }));

            // Wait a moment for layout script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Then dispatch user data event
            await Logger.info('Dispatching userDataReady event');
            document.dispatchEvent(new CustomEvent('userDataReady', {
                detail: {
                    user,
                    role: user.role,
                    preferences: userPreferences
                }
            }));
        }
        
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
