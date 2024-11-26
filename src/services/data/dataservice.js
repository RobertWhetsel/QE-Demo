import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import logger from '../logger/LoggerService.js';

class DataService {
    static instance = null;
    #logger;
    #data = null;
    #storageKey = config.storage.keys.userData;
    #cacheMaxAge = config.cache.maxAge * 1000; // Convert to milliseconds
    #subscribers = new Map();
    #isInitialized = false;
    #pendingUpdates = new Map();
    #updateDebounceTime = 300;
    #storage = localStorage;

    constructor() {
        if (DataService.instance) {
            return DataService.instance;
        }
        this.#logger = logger;
        this.#logger.info('DataService creating new instance');
        this.#initialize();
        DataService.instance = this;
    }

    async #initialize() {
        try {
            // Initialize storage
            await this.#initializeStorage();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Setup cleanup interval
            this.#setupCleanupInterval();

            this.#isInitialized = true;
            this.#logger.info('DataService initialized successfully');
        } catch (error) {
            this.#logger.error('DataService initialization error:', error);
            throw error;
        }
    }

    async #initializeStorage() {
        try {
            // Try to get data from storage first
            const storedData = this.#getFromStorage();
            if (storedData) {
                this.#logger.info('Found stored data');
                this.#data = storedData;
                return;
            }

            // If no stored data, load from CSV/JSON
            try {
                const data = await this.#loadInitialData();
                if (data) {
                    this.#data = data;
                    await this.#saveToStorage(data);
                } else {
                    this.#data = {
                        users: [],
                        pendingUsers: [],
                        tasks: [],
                        surveys: [],
                        teams: [],
                        workspaces: []
                    };
                }
            } catch (error) {
                this.#logger.error('Failed to load initial data:', error);
                this.#data = {
                    users: [],
                    pendingUsers: [],
                    tasks: [],
                    surveys: [],
                    teams: [],
                    workspaces: []
                };
            }

            await this.#saveToStorage(this.#data);
        } catch (error) {
            this.#logger.error('Error initializing storage:', error);
            throw error;
        }
    }

    #setupEventListeners() {
        // Listen for storage events from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === this.#storageKey) {
                this.#handleStorageChange(event);
            }
        });
    }

    #setupCleanupInterval() {
        // Clean up expired cache entries every hour
        setInterval(() => {
            this.#cleanupStorage();
        }, 3600000); // 1 hour
    }

    async #loadInitialData() {
        try {
            // Try loading JSON first
            const jsonPath = paths.getDataPath('users');
            const jsonResponse = await fetch(paths.resolve(jsonPath));
            if (jsonResponse.ok) {
                return await jsonResponse.json();
            }

            // Fall back to CSV
            const csvPath = paths.join(paths.data, 'users.csv');
            const csvResponse = await fetch(paths.resolve(csvPath));
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                return this.#parseCSV(csvText);
            }

            return null;
        } catch (error) {
            this.#logger.error('Error loading initial data:', error);
            return null;
        }
    }

    #parseCSV(csv) {
        if (!csv || csv.trim() === '') {
            return null;
        }

        try {
            const lines = csv.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim());
            
            if (lines.length === 1) {
                return [];
            }

            return lines.slice(1)
                .filter(line => line.trim() !== '')
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = values[i] || '';
                    });
                    return obj;
                });
        } catch (error) {
            this.#logger.error('Error parsing CSV:', error);
            return null;
        }
    }

    #getFromStorage() {
        try {
            const item = this.#storage.getItem(this.#storageKey);
            if (!item) return null;

            const stored = JSON.parse(item);
            if (stored.expires && stored.expires < Date.now()) {
                this.#storage.removeItem(this.#storageKey);
                return null;
            }
            return stored.value;
        } catch (error) {
            this.#logger.error('Error reading from storage:', error);
            return null;
        }
    }

    async #saveToStorage(value) {
        try {
            const item = {
                value,
                expires: Date.now() + this.#cacheMaxAge
            };
            this.#storage.setItem(this.#storageKey, JSON.stringify(item));
            return true;
        } catch (error) {
            this.#logger.error('Error saving to storage:', error);
            return false;
        }
    }

    #handleStorageChange(event) {
        try {
            if (event.newValue) {
                const newData = JSON.parse(event.newValue).value;
                this.#data = newData;
                this.#notifySubscribers('all');
            }
        } catch (error) {
            this.#logger.error('Error handling storage change:', error);
        }
    }

    #cleanupStorage() {
        try {
            const stored = this.#getFromStorage();
            if (!stored) {
                this.#storage.removeItem(this.#storageKey);
            }
        } catch (error) {
            this.#logger.error('Error cleaning storage:', error);
        }
    }

    #notifySubscribers(type) {
        if (this.#subscribers.has(type)) {
            this.#subscribers.get(type).forEach(callback => {
                try {
                    callback(this.#data);
                } catch (error) {
                    this.#logger.error('Error notifying subscriber:', error);
                }
            });
        }
    }

    // Public data access methods
    getData() {
        return this.#data ? JSON.parse(JSON.stringify(this.#data)) : null;
    }

    async saveData(newData) {
        try {
            this.#data = newData;
            const success = await this.#saveToStorage(this.#data);
            if (success) {
                this.#notifySubscribers('all');
            }
            return success;
        } catch (error) {
            this.#logger.error('Error saving data:', error);
            return false;
        }
    }

    // User management methods
    async addUser(user) {
        if (!user) {
            throw new Error('Invalid user data');
        }
        
        this.#logger.info('Adding user:', user);
        this.#data.users.push(user);
        
        return this.saveData(this.#data);
    }

    async updateUser(username, updates) {
        const index = this.#data.users.findIndex(user => user.username === username);
        if (index === -1) {
            throw new Error('User not found');
        }
        
        this.#data.users[index] = { ...this.#data.users[index], ...updates };
        return this.saveData(this.#data);
    }

    async deleteUser(username) {
        this.#data.users = this.#data.users.filter(user => user.username !== username);
        return this.saveData(this.#data);
    }

    // Task management methods
    async addTask(task) {
        if (!task) {
            throw new Error('Invalid task data');
        }

        this.#data.tasks.push(task);
        return this.saveData(this.#data);
    }

    async updateTask(taskId, updates) {
        const taskIndex = this.#data.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        this.#data.tasks[taskIndex] = { ...this.#data.tasks[taskIndex], ...updates };
        return this.saveData(this.#data);
    }

    // Survey management methods
    async addSurvey(survey) {
        if (!survey) {
            throw new Error('Invalid survey data');
        }

        this.#data.surveys.push(survey);
        return this.saveData(this.#data);
    }

    async updateSurvey(surveyId, updates) {
        const surveyIndex = this.#data.surveys.findIndex(survey => survey.id === surveyId);
        if (surveyIndex === -1) {
            throw new Error('Survey not found');
        }

        this.#data.surveys[surveyIndex] = { ...this.#data.surveys[surveyIndex], ...updates };
        return this.saveData(this.#data);
    }

    // Subscription methods
    subscribe(type, callback) {
        if (!this.#subscribers.has(type)) {
            this.#subscribers.set(type, new Set());
        }
        this.#subscribers.get(type).add(callback);
        return () => this.#subscribers.get(type).delete(callback);
    }

    // Export/Import methods
    async exportToCSV() {
        const headers = Object.keys(this.#data);
        const rows = [headers];

        headers.forEach(header => {
            const data = this.#data[header];
            if (Array.isArray(data)) {
                data.forEach(item => {
                    rows.push(Object.values(item));
                });
            }
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    async importFromCSV(csv) {
        const data = this.#parseCSV(csv);
        if (data) {
            return this.saveData(data);
        }
        return false;
    }

    // Static accessor
    static getInstance() {
        if (!DataService.instance) {
            DataService.instance = new DataService();
        }
        return DataService.instance;
    }
}

// Export singleton instance
const dataService = DataService.getInstance();
export default dataService;