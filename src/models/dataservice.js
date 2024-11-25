import config from '../../config/client.js';
import paths from '../../config/paths.js';
import Logger from '../utils/logging/LoggerService.js';
import { User } from './user.js';

// Consolidated Data Service implementation
export class DataService {
    constructor() {
        if (DataService.instance) {
            return DataService.instance;
        }
        this.debug = config.features.debugMode;
        Logger.info('Creating new DataService instance');
        this.data = null;
        this.storageKey = config.storage.keys.userData;
        this.storage = localStorage;
        this.cacheMaxAge = config.cache.maxAge * 1000; // Convert to milliseconds
        DataService.instance = this;
    }

    log(...args) {
        if (this.debug) {
            Logger.info('[DataService]', ...args);
        }
    }

    error(...args) {
        Logger.error('[DataService]', ...args);
    }

    static getInstance() {
        if (!DataService.instance) {
            DataService.instance = new DataService();
        }
        return DataService.instance;
    }

    // Initialize data from storage or create new
    async init() {
        try {
            this.log('Initializing DataService');
            // Try to get data from storage first
            const storedData = this.getFromStorage();
            if (storedData) {
                this.log('Found stored data');
                this.data = storedData;
                return this.data;
            }

            // If no stored data, use default users
            this.log('No stored data, using default users');
            const defaultUsers = User.getDefaultUsers();
            this.data = {
                users: defaultUsers,
                pendingUsers: []
            };
            
            // Store in storage
            await this.saveToStorage(this.data);
            
            // Also save to users data file
            await User.saveUsers(defaultUsers);
            
            return this.data;
        } catch (error) {
            this.error('Error initializing data:', error);
            this.data = { users: [], pendingUsers: [] };
            await this.saveToStorage(this.data);
            return this.data;
        }
    }

    getFromStorage() {
        try {
            const item = this.storage.getItem(this.storageKey);
            if (!item) return null;

            const stored = JSON.parse(item);
            if (stored.expires && stored.expires < Date.now()) {
                this.storage.removeItem(this.storageKey);
                return null;
            }
            return stored.value;
        } catch (error) {
            this.error('Error reading from storage:', error);
            return null;
        }
    }

    saveToStorage(value) {
        try {
            const item = {
                value: value,
                expires: Date.now() + this.cacheMaxAge
            };
            this.storage.setItem(this.storageKey, JSON.stringify(item));
            return true;
        } catch (error) {
            this.error('Error saving to storage:', error);
            return false;
        }
    }

    // Get all data
    getData() {
        this.log('Getting data:', this.data);
        return this.data || { users: [], pendingUsers: [] };
    }

    // Save data
    async saveData(newData) {
        try {
            this.log('Saving data');
            this.data = newData;
            
            // Save to storage
            const success = await this.saveToStorage(this.data);
            
            // Also update users data file
            if (success && this.data.users) {
                await User.saveUsers(this.data.users);
            }
            
            return success;
        } catch (error) {
            this.error('Error saving data:', error);
            return false;
        }
    }

    // Add new user
    async addUser(user) {
        if (!user) {
            throw new Error('Invalid user data');
        }
        
        this.log('Adding user:', user);
        this.data = this.data || { users: [], pendingUsers: [] };
        this.data.users.push(user);
        
        return this.saveData(this.data);
    }

    // Update user
    async updateUser(username, updates) {
        const index = this.data.users.findIndex(user => user.username === username);
        if (index === -1) {
            throw new Error('User not found');
        }
        
        this.data.users[index] = { ...this.data.users[index], ...updates };
        return this.saveData(this.data);
    }

    // Delete user
    async deleteUser(username) {
        this.data.users = this.data.users.filter(user => user.username !== username);
        return this.saveData(this.data);
    }

    // Find user
    findUser(username, password) {
        return this.data?.users?.find(
            user => user.username === username && user.password === password
        );
    }
}
