//import logger from '../logger/LoggerService.js';
//import errorHandler from '../error/ErrorHandlerService.js';
//import databaseService from '../database/DatabaseService.js';
//import cacheService from '../cache/CacheService.js';
//import { ROLES } from '../../models/index.js';
//import config from '../../../config/client.js';
//import { checkPageAccess, PUBLIC_PAGES } from '../../models/database.js';
//import { hashPassword, comparePasswords } from '../../utils/crypto.js';


// Get paths from window.env
const { PATHS_MODULE } = window.env;
const paths = await import(PATHS_MODULE);

class AuthService {
    #logger;
    #isInitialized = false;
    #currentUser = null;
    #isAuthenticated = false;
    #sessionTimeout = 3600000; // 1 hour
    #refreshTokenTimeout = 86400000; // 24 hours
    #sessionTimer = null;
    #refreshTimer = null;
    #subscribers = new Set();
    #storage = localStorage;
    #storageKeys = config.storage.keys;

    constructor() {
        this.#logger = logger;
        this.#logger.info('AuthService initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check for existing session
            await this.#restoreSession();
            
            // Setup session management
            this.#setupSessionManagement();

            // Setup storage listeners
            this.#setupStorageListeners();

            this.#isInitialized = true;
            this.#logger.info('AuthService initialized successfully');
        } catch (error) {
            this.#logger.error('AuthService initialization error:', error);
            errorHandler.handleError('Failed to initialize authentication service');
        }
    }

    async #restoreSession() {
        try {
            const sessionData = this.#storage.getItem(this.#storageKeys.auth);
            if (!sessionData) return;

            const session = JSON.parse(sessionData);
            if (session.expires && new Date(session.expires) > new Date()) {
                this.#currentUser = session.user;
                this.#isAuthenticated = true;
                this.#startSessionTimer();
                this.#notifySubscribers();
                this.#logger.info('Session restored');
            } else {
                await this.logout();
            }
        } catch (error) {
            this.#logger.error('Error restoring session:', error);
            await this.logout();
        }
    }

    #setupSessionManagement() {
        // Check for inactivity
        document.addEventListener('click', () => this.#resetSessionTimer());
        document.addEventListener('keypress', () => this.#resetSessionTimer());

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.#pauseSessionTimer();
            } else {
                this.#resumeSessionTimer();
            }
        });
    }

    #setupStorageListeners() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.#storageKeys.auth) {
                this.#handleStorageChange(event);
            }
        });
    }

    #handleStorageChange(event) {
        if (!event.newValue) {
            // Session was cleared in another tab
            this.logout();
        } else {
            try {
                const session = JSON.parse(event.newValue);
                this.#currentUser = session.user;
                this.#isAuthenticated = true;
                this.#startSessionTimer();
                this.#notifySubscribers();
            } catch (error) {
                this.#logger.error('Error handling storage change:', error);
            }
        }
    }

    async login(username, password) {
        try {
            this.#logger.info('Login attempt:', { username });

            // Validate credentials
            const user = await this.#validateCredentials(username, password);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Create session
            await this.#createSession(user);

            this.#logger.info('Login successful:', { username });
            return true;

        } catch (error) {
            this.#logger.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            this.#logger.info('Logging out user');

            // Clear session data
            this.#clearSession();

            // Clear timers
            this.#clearTimers();

            // Clear storage
            this.#storage.removeItem(this.#storageKeys.auth);

            // Notify subscribers
            this.#notifySubscribers();

            return true;
        } catch (error) {
            this.#logger.error('Logout error:', error);
            return false;
        }
    }

    async #validateCredentials(username, password) {
        try {
            const users = await databaseService.query('users', {
                where: { username }
            });

            const user = users[0];
            if (!user) return null;

            const isValid = await comparePasswords(password, user.password);
            if (!isValid) return null;

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
        } catch (error) {
            this.#logger.error('Credential validation error:', error);
            return null;
        }
    }

    async #createSession(user) {
        const session = {
            user,
            created: new Date().toISOString(),
            expires: new Date(Date.now() + this.#sessionTimeout).toISOString()
        };

        this.#storage.setItem(this.#storageKeys.auth, JSON.stringify(session));
        this.#currentUser = user;
        this.#isAuthenticated = true;

        // Start session management
        this.#startSessionTimer();

        // Notify subscribers
        this.#notifySubscribers();
    }

    #clearSession() {
        this.#currentUser = null;
        this.#isAuthenticated = false;
    }

    #startSessionTimer() {
        this.#clearTimers();
        
        this.#sessionTimer = setTimeout(() => {
            this.logout();
        }, this.#sessionTimeout);

        this.#refreshTimer = setTimeout(() => {
            this.#refreshSession();
        }, this.#sessionTimeout / 2);
    }

    #resetSessionTimer() {
        if (this.#isAuthenticated) {
            this.#startSessionTimer();
        }
    }

    #pauseSessionTimer() {
        this.#clearTimers();
    }

    #resumeSessionTimer() {
        if (this.#isAuthenticated) {
            this.#startSessionTimer();
        }
    }

    #clearTimers() {
        if (this.#sessionTimer) {
            clearTimeout(this.#sessionTimer);
            this.#sessionTimer = null;
        }
        if (this.#refreshTimer) {
            clearTimeout(this.#refreshTimer);
            this.#refreshTimer = null;
        }
    }

    async #refreshSession() {
        if (!this.#isAuthenticated) return;

        try {
            const session = {
                user: this.#currentUser,
                created: new Date().toISOString(),
                expires: new Date(Date.now() + this.#sessionTimeout).toISOString()
            };

            this.#storage.setItem(this.#storageKeys.auth, JSON.stringify(session));
            this.#startSessionTimer();
        } catch (error) {
            this.#logger.error('Session refresh error:', error);
            await this.logout();
        }
    }

    #notifySubscribers() {
        this.#subscribers.forEach(callback => {
            try {
                callback({
                    isAuthenticated: this.#isAuthenticated,
                    user: this.#currentUser
                });
            } catch (error) {
                this.#logger.error('Subscriber notification error:', error);
            }
        });
    }

    // Public access methods
    isAuthenticated() {
        return this.#isAuthenticated;
    }

    getCurrentUser() {
        return this.#currentUser ? { ...this.#currentUser } : null;
    }

    hasRole(role) {
        return this.#currentUser?.role === role;
    }

    hasAccess(path) {
        if (!this.#isAuthenticated) {
            return PUBLIC_PAGES.includes(path);
        }
        return checkPageAccess(this.#currentUser?.role, path);
    }

    // Public subscription method
    subscribe(callback) {
        this.#subscribers.add(callback);
        callback({
            isAuthenticated: this.#isAuthenticated,
            user: this.#currentUser
        });
        return () => this.#subscribers.delete(callback);
    }

    // Public utility methods
    async changePassword(currentPassword, newPassword) {
        if (!this.#isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            // Validate current password
            const isValid = await this.#validateCredentials(
                this.#currentUser.username,
                currentPassword
            );

            if (!isValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedPassword = await hashPassword(newPassword);

            // Update password
            await databaseService.update('users', this.#currentUser.id, {
                password: hashedPassword
            });

            return true;
        } catch (error) {
            this.#logger.error('Password change error:', error);
            throw error;
        }
    }

    async requestPasswordReset(email) {
        try {
            const users = await databaseService.query('users', {
                where: { email }
            });

            if (users.length === 0) {
                throw new Error('User not found');
            }

            // In a real application, send reset email here
            this.#logger.info('Password reset requested:', { email });
            return true;
        } catch (error) {
            this.#logger.error('Password reset request error:', error);
            throw error;
        }
    }

    // Session configuration methods
    setSessionTimeout(timeout) {
        this.#sessionTimeout = timeout;
        if (this.#isAuthenticated) {
            this.#startSessionTimer();
        }
    }

    setRefreshTokenTimeout(timeout) {
        this.#refreshTokenTimeout = timeout;
    }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;