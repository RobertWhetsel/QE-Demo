import config from '../../config/client.js';

// Database operations and authentication
const CONSTANTS = {
    ROLES: {
        GENESIS: 'genesis',
        PLATFORM: 'platform',
        USER: 'user'
    },
    STORAGE_KEYS: {
        AUTH: config.auth.tokenStorageKey,
        REFRESH: config.auth.refreshTokenKey,
        USERNAME: 'username',
        USER_ROLE: 'userRole',
        IS_AUTHENTICATED: 'isAuthenticated'
    }
};

class DatabaseService {
    constructor() {
        this.storage = config.cache.enableLocalStorage ? localStorage : sessionStorage;
        this.session = sessionStorage;
        this.cacheMaxAge = config.cache.maxAge;
    }

    isAuthenticated() {
        return this.storage.getItem(CONSTANTS.STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
    }

    hasAccess() {
        const role = this.storage.getItem(CONSTANTS.STORAGE_KEYS.USER_ROLE);
        const currentPage = window.location.pathname.split('/').pop();

        // Admin pages access control
        if (currentPage === 'adminDashboard.html' && role !== CONSTANTS.ROLES.PLATFORM) {
            return false;
        }

        return true;
    }

    canAccessSurveys() {
        const role = this.storage.getItem(CONSTANTS.STORAGE_KEYS.USER_ROLE);
        return role === CONSTANTS.ROLES.USER || role === CONSTANTS.ROLES.PLATFORM;
    }

    loadFromStorage(key, defaultValue) {
        try {
            const item = this.storage.getItem(key);
            if (item === null) return defaultValue;

            // If using cache expiration
            if (this.cacheMaxAge > 0) {
                const stored = JSON.parse(item);
                if (stored.expires && stored.expires < Date.now()) {
                    this.storage.removeItem(key);
                    return defaultValue;
                }
                return stored.value;
            }

            return item;
        } catch (error) {
            console.error(`Error loading ${key} from storage:`, error);
            return defaultValue;
        }
    }

    saveToStorage(key, value) {
        try {
            // If using cache expiration
            if (this.cacheMaxAge > 0) {
                const item = {
                    value: value,
                    expires: Date.now() + (this.cacheMaxAge * 1000)
                };
                this.storage.setItem(key, JSON.stringify(item));
            } else {
                this.storage.setItem(key, value);
            }
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to storage:`, error);
            return false;
        }
    }

    clearStorage() {
        // Clear both local and session storage
        this.storage.clear();
        this.session.clear();
        
        // Clear cookies with proper domain and path
        const cookies = document.cookie.split(';');
        const domain = window.location.hostname;
        cookies.forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
        });
    }

    getUserInfo() {
        return {
            username: this.storage.getItem(CONSTANTS.STORAGE_KEYS.USERNAME) || 'User',
            role: this.storage.getItem(CONSTANTS.STORAGE_KEYS.USER_ROLE) || 'User'
        };
    }

    // New method to handle token management
    getAuthToken() {
        return this.loadFromStorage(CONSTANTS.STORAGE_KEYS.AUTH, null);
    }

    setAuthToken(token) {
        return this.saveToStorage(CONSTANTS.STORAGE_KEYS.AUTH, token);
    }

    getRefreshToken() {
        return this.loadFromStorage(CONSTANTS.STORAGE_KEYS.REFRESH, null);
    }

    setRefreshToken(token) {
        return this.saveToStorage(CONSTANTS.STORAGE_KEYS.REFRESH, token);
    }
}

export default new DatabaseService();
