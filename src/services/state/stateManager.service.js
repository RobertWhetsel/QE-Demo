import Logger from '../../utils/logging/loggerService.utils.js';
import config from '../../../config/client.js';
import errorHandler from '../error/ErrorHandlerService.js';

class StateManagerService {
    #logger;
    #state = {
        users: [],
        pendingUsers: [],
        teams: [],
        workspaces: [],
        tasks: [],
        surveys: [],
        feedbackLog: [],
        preferences: {}
    };
    #observers = new Map();
    #history = [];
    #maxHistoryLength = 50;
    #isInitialized = false;
    #persistentKeys = ['preferences', 'users', 'teams'];

    constructor() {
        this.#logger = Logger;
        this.#logger.info('StateManagerService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Load persistent state
            this.#loadPersistedState();
            
            // Setup state change tracking
            this.#setupStateTracking();
            
            // Setup storage sync
            this.#setupStorageSync();

            this.#isInitialized = true;
            this.#logger.info('StateManagerService initialized successfully');
        } catch (error) {
            this.#logger.error('StateManagerService initialization error:', error);
            errorHandler.handleError('Failed to initialize state management');
        }
    }

    #loadPersistedState() {
        try {
            const storedData = sessionStorage.getItem('appData');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                // Only merge persistent keys
                this.#persistentKeys.forEach(key => {
                    if (parsedData[key]) {
                        this.#state[key] = parsedData[key];
                    }
                });
            }
            this.#logger.info('Persisted state loaded');
        } catch (error) {
            this.#logger.error('Error loading persisted state:', error);
            throw error;
        }
    }

    #setupStateTracking() {
        // Store initial state in history
        this.#addToHistory(this.#getStateSnapshot());

        // Setup unload handler to persist state
        window.addEventListener('beforeunload', () => {
            this.#persistState();
        });
    }

    #setupStorageSync() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'appData') {
                this.#handleStorageChange(event);
            }
        });
    }

    #handleStorageChange(event) {
        try {
            const newData = JSON.parse(event.newValue || '{}');
            let hasChanges = false;

            // Only sync persistent keys
            this.#persistentKeys.forEach(key => {
                if (newData[key] && JSON.stringify(this.#state[key]) !== JSON.stringify(newData[key])) {
                    this.#state[key] = newData[key];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                this.#notifyObservers();
            }
        } catch (error) {
            this.#logger.error('Error handling storage change:', error);
        }
    }

    #persistState() {
        try {
            const persistentState = {};
            this.#persistentKeys.forEach(key => {
                persistentState[key] = this.#state[key];
            });
            sessionStorage.setItem('appData', JSON.stringify(persistentState));
            this.#logger.info('State persisted successfully');
        } catch (error) {
            this.#logger.error('Error persisting state:', error);
        }
    }

    #getStateSnapshot() {
        return JSON.parse(JSON.stringify(this.#state));
    }

    #addToHistory(snapshot) {
        this.#history.unshift(snapshot);
        if (this.#history.length > this.#maxHistoryLength) {
            this.#history.pop();
        }
    }

    #notifyObservers(key) {
        if (key) {
            // Notify observers of specific key
            const observers = this.#observers.get(key);
            if (observers) {
                observers.forEach(callback => {
                    try {
                        callback(this.#state[key]);
                    } catch (error) {
                        this.#logger.error(`Error notifying observer for ${key}:`, error);
                    }
                });
            }
        } else {
            // Notify all observers
            for (const [key, observers] of this.#observers) {
                observers.forEach(callback => {
                    try {
                        callback(this.#state[key]);
                    } catch (error) {
                        this.#logger.error(`Error notifying observer for ${key}:`, error);
                    }
                });
            }
        }
    }

    #validateStateKey(key) {
        if (!this.#state.hasOwnProperty(key)) {
            throw new Error(`Invalid state key: ${key}`);
        }
    }

    // Public subscription methods
    subscribe(key, callback) {
        this.#validateStateKey(key);

        if (!this.#observers.has(key)) {
            this.#observers.set(key, new Set());
        }
        this.#observers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const observers = this.#observers.get(key);
            if (observers) {
                observers.delete(callback);
                if (observers.size === 0) {
                    this.#observers.delete(key);
                }
            }
        };
    }

    // Public state access methods
    getState(key) {
        if (key) {
            this.#validateStateKey(key);
            return JSON.parse(JSON.stringify(this.#state[key]));
        }
        return this.#getStateSnapshot();
    }

    setState(updates, options = {}) {
        const { batch = false, persist = true } = options;

        try {
            if (typeof updates === 'string') {
                // Single key update
                this.#validateStateKey(updates);
                this.#state[updates] = value;
                this.#addToHistory(this.#getStateSnapshot());
                this.#notifyObservers(updates);
            } else if (typeof updates === 'object') {
                // Batch update
                Object.entries(updates).forEach(([key, value]) => {
                    this.#validateStateKey(key);
                    this.#state[key] = value;
                });
                this.#addToHistory(this.#getStateSnapshot());
                if (!batch) {
                    this.#notifyObservers();
                }
            }

            if (persist) {
                this.#persistState();
            }

            return true;
        } catch (error) {
            this.#logger.error('Error updating state:', error);
            errorHandler.handleError('Failed to update application state');
            return false;
        }
    }

    // User management methods
    addUser(user) {
        try {
            this.#validateUserData(user);
            const users = [...this.#state.users];
            users.push(user);
            return this.setState({ users });
        } catch (error) {
            this.#logger.error('Error adding user:', error);
            return false;
        }
    }

    updateUser(username, updates) {
        try {
            const users = [...this.#state.users];
            const index = users.findIndex(u => u.username === username);
            if (index === -1) throw new Error('User not found');
            
            users[index] = { ...users[index], ...updates };
            return this.setState({ users });
        } catch (error) {
            this.#logger.error('Error updating user:', error);
            return false;
        }
    }

    #validateUserData(user) {
        if (!user?.username || !user?.role) {
            throw new Error('Invalid user data');
        }
    }

    // Public utility methods
    undo() {
        if (this.#history.length < 2) return false;
        
        // Remove current state
        this.#history.shift();
        // Get previous state
        const previousState = this.#history[0];
        
        // Apply previous state
        this.#state = JSON.parse(JSON.stringify(previousState));
        this.#notifyObservers();
        return true;
    }

    reset() {
        this.#state = {
            users: [],
            pendingUsers: [],
            teams: [],
            workspaces: [],
            tasks: [],
            surveys: [],
            feedbackLog: [],
            preferences: {}
        };
        this.#history = [this.#getStateSnapshot()];
        this.#notifyObservers();
        this.#persistState();
    }

    // Debug methods (only available in dev mode)
    getDebugInfo() {
        if (config.features.debugMode) {
            return {
                currentState: this.#getStateSnapshot(),
                historyLength: this.#history.length,
                observers: Array.from(this.#observers.entries())
                    .map(([key, observers]) => ({
                        key,
                        observerCount: observers.size
                    }))
            };
        }
        return null;
    }
}

// Create and export singleton instance
const stateManager = new StateManagerService();
export default stateManager;