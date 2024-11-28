// Import paths configuration
import paths from './paths.js';

// Get SITE_STATE from window.env
const SITE_STATE = window.env.SITE_STATE;

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
                userData: 'userData',
                auth: 'isAuthenticated',
                userRole: 'userRole',
                username: 'username',
                users: 'users'
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
                userData: 'userData',
                auth: 'isAuthenticated',
                userRole: 'userRole',
                username: 'username',
                users: 'users'
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
