// Database operations and authentication
const CONSTANTS = {
    ROLES: {
        GENESIS: 'genesis',
        PLATFORM: 'platform',
        USER: 'user'
    }
};

class DatabaseService {
    constructor() {
        this.storage = localStorage;
        this.session = sessionStorage;
    }

    isAuthenticated() {
        return this.storage.getItem('isAuthenticated') === 'true';
    }

    hasAccess() {
        const role = this.storage.getItem('userRole');
        const currentPage = window.location.pathname.split('/').pop();

        // Admin pages access control
        if (currentPage === 'adminDashboard.html' && role !== CONSTANTS.ROLES.PLATFORM) {
            return false;
        }

        return true;
    }

    canAccessSurveys() {
        const role = this.storage.getItem('userRole');
        return role === CONSTANTS.ROLES.USER || role === CONSTANTS.ROLES.PLATFORM;
    }

    loadFromStorage(key, defaultValue) {
        try {
            const value = this.storage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            console.error(`Error loading ${key} from storage:`, error);
            return defaultValue;
        }
    }

    saveToStorage(key, value) {
        try {
            this.storage.setItem(key, value);
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
        
        // Clear cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    }

    getUserInfo() {
        return {
            username: this.storage.getItem('username') || 'User',
            role: this.storage.getItem('userRole') || 'User'
        };
    }
}

export default new DatabaseService();
