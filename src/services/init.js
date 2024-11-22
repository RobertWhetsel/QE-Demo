import ThemeManager from './state/thememanager.js';
import FontManager from './state/fontmanager.js';
import { User } from '../models/user.js';
import Logger from '../utils/logging/logger.js';

// Initialize state managers
export async function initializeApp() {
    await Logger.info('Application Initialization Started');
    await Logger.info('Current location:', window.location.pathname);

    // Log initial storage state
    await Logger.info('Initial storage state:', {
        sessionStorage: {
            keys: Object.keys(sessionStorage),
            isAuthenticated: sessionStorage.getItem('isAuthenticated'),
            username: sessionStorage.getItem('username'),
            userRole: sessionStorage.getItem('userRole')
        },
        localStorage: {
            keys: Object.keys(localStorage),
            hasUsersCsv: !!localStorage.getItem('users_csv'),
            hasUsersJson: !!localStorage.getItem('users_json')
        }
    });

    // Check if we're on the login page
    const isLoginPage = window.location.pathname.includes('login.html');
    await Logger.info('Is login page:', isLoginPage);

    try {
        // Initialize managers
        await Logger.info('Initializing theme manager');
        ThemeManager.initialize();
        await Logger.info('Initializing font manager');
        FontManager.initialize();
        
        // Initialize global QE object
        await Logger.info('Setting up global QE object');
        window.QE = window.QE || {};
        window.QE.User = User;
        
        // If on login page, just initialize theme and font
        if (isLoginPage) {
            await Logger.info('Login page initialization');
            ThemeManager.setTheme('light');
            FontManager.setFont('Arial');
            await Logger.info('Login page initialized successfully');
            return;
        }

        // Check authentication for non-login pages
        await Logger.info('Checking authentication status');
        const isAuthenticated = User.isAuthenticated();
        const username = sessionStorage.getItem('username');
        await Logger.info('Authentication check:', { isAuthenticated, username });

        if (!isAuthenticated) {
            await Logger.warn('Not authenticated, redirecting to login');
            window.location.href = '/src/views/pages/login.html';
            return;
        }

        // Load user data if authenticated
        if (username) {
            await Logger.info('Loading user data for:', username);
            
            // Ensure CSV data exists
            if (!localStorage.getItem('users_csv')) {
                await Logger.info('No CSV data found, loading from file');
                try {
                    const response = await fetch('/src/models/data/users.csv');
                    const csvData = await response.text();
                    localStorage.setItem('users_csv', csvData);
                    await Logger.info('CSV data loaded from file');
                } catch (error) {
                    await Logger.error('Error loading CSV file:', error);
                    // Load default users if file load fails
                    const defaultUsers = User.getDefaultUsers();
                    User.saveUsers(defaultUsers);
                    await Logger.info('Default users loaded as fallback');
                }
            }

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
                window.location.href = '/src/views/pages/login.html';
                return;
            }

            // Store user data globally
            await Logger.info('Setting global user data');
            window.QE.currentUser = user;
            window.QE.userRole = user.role;

            // Load user preferences
            await Logger.info('Loading user preferences');
            const userPreferences = User.getUserPreferences();
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
                if (event.key === `user_preferences_${username}`) {
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
            sessionStorage: {
                username: sessionStorage.getItem('username'),
                isAuthenticated: sessionStorage.getItem('isAuthenticated'),
                userRole: sessionStorage.getItem('userRole')
            },
            localStorage: {
                hasUsersCsv: !!localStorage.getItem('users_csv'),
                hasUsersJson: !!localStorage.getItem('users_json')
            }
        });
    } finally {
        await Logger.flush();
    }
}

// Initialize immediately when script is loaded
initializeApp().catch(async error => {
    await Logger.error('Error initializing application:', error);
    // Log additional details about the error
    await Logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        sessionStorage: {
            username: sessionStorage.getItem('username'),
            isAuthenticated: sessionStorage.getItem('isAuthenticated'),
            userRole: sessionStorage.getItem('userRole')
        },
        localStorage: {
            hasUsersCsv: !!localStorage.getItem('users_csv'),
            hasUsersJson: !!localStorage.getItem('users_json')
        }
    });
    await Logger.flush();
});
