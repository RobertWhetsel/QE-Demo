// Import paths and SITE_STATE
import paths, { SITE_STATE } from './paths.js';

// Configuration based on site state
const config = {
    development: {
        features: {
            enableAnalytics: false,
            enableNotifications: true,
            darkModeDefault: false,
            debugMode: true
        },
        storage: {
            type: 'localStorage',
            keys: {
                userData: 'appData',
                auth: 'isAuthenticated',
                userRole: 'userRole',
                username: 'username',
                users: 'users' // Added users storage key
            }
        },
        paths: paths,
        ui: {
            maxItemsPerPage: 20,
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm:ss',
            defaultTheme: 'light',
            toastDuration: 3000
        },
        cache: {
            maxAge: 3600,
            enabled: true,
            enableLocalStorage: true
        }
    },
    production: {
        features: {
            enableAnalytics: true,
            enableNotifications: true,
            darkModeDefault: false,
            debugMode: false
        },
        storage: {
            type: 'localStorage',
            keys: {
                userData: 'appData',
                auth: 'isAuthenticated',
                userRole: 'userRole',
                username: 'username',
                users: 'users' // Added users storage key
            }
        },
        paths: paths,
        ui: {
            maxItemsPerPage: 20,
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm:ss',
            defaultTheme: 'light',
            toastDuration: 3000
        },
        cache: {
            maxAge: 3600,
            enabled: true,
            enableLocalStorage: true
        }
    }
};

// Helper function to get current environment
const getEnvironment = () => SITE_STATE === 'dev' ? 'development' : 'production';

// Export configuration based on environment
export default config[getEnvironment()];
