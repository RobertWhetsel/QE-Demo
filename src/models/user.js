import config from '../../config/client.js';
import paths from '../../config/paths.js';
import Logger from '../utils/logging/logger.js';

export class User {
    constructor(data) {
        this.username = data.username;
        this.role = data.role;
        this.status = data.status;
    }

    static isAuthenticated() {
        return localStorage.getItem(config.storage.keys.auth) === 'true';
    }

    static getCurrentUser() {
        const userData = localStorage.getItem(config.storage.keys.userData);
        return userData ? new User(JSON.parse(userData)) : null;
    }

    static getCurrentUserRole() {
        const userRole = localStorage.getItem(config.storage.keys.userRole);
        return userRole || null;
    }

    static async login(username, password) {
        try {
            Logger.info('Starting login process for:', { username });
            
            // Try to get users from localStorage first
            const storedUsers = localStorage.getItem(config.storage.keys.users);
            let users = [];
            
            if (storedUsers) {
                Logger.info('Found stored users in localStorage');
                users = JSON.parse(storedUsers);
            } else {
                // If no stored users, use default users
                Logger.info('No stored users found, using default users');
                users = this.getDefaultUsers();
                localStorage.setItem(config.storage.keys.users, JSON.stringify(users));
            }

            Logger.info('Available users:', users);

            // Find matching user
            const user = users.find(u => 
                u.username === username && 
                u.password === password && 
                (!u.status || u.status === 'active')
            );

            if (user) {
                Logger.info('User found, storing session data:', { username: user.username, role: user.role });
                
                // Store user info in localStorage
                localStorage.setItem(config.storage.keys.auth, 'true');
                localStorage.setItem(config.storage.keys.username, user.username);
                localStorage.setItem(config.storage.keys.userRole, user.role);
                localStorage.setItem(config.storage.keys.userData, JSON.stringify(user));

                // Verify storage was set correctly
                const authSet = localStorage.getItem(config.storage.keys.auth) === 'true';
                const usernameSet = localStorage.getItem(config.storage.keys.username) === user.username;
                const roleSet = localStorage.getItem(config.storage.keys.userRole) === user.role;
                const userDataSet = localStorage.getItem(config.storage.keys.userData) !== null;

                Logger.info('Storage verification:', {
                    authSet,
                    usernameSet,
                    roleSet,
                    userDataSet
                });

                if (!authSet || !usernameSet || !roleSet || !userDataSet) {
                    throw new Error('Failed to set user data in storage');
                }
                
                return new User(user);
            }
            
            Logger.warn('No matching user found');
            return null;
        } catch (error) {
            Logger.error('Login error:', error);
            throw new Error('Login failed: ' + (error.message || 'Unknown error'));
        }
    }

    static async logout() {
        await this.clearAllStorage();
    }

    static async clearAllStorage() {
        Logger.info('Clearing storage');
        const keysToKeep = ['theme', 'language'];
        const keysToRemove = Object.values(config.storage.keys);
        
        keysToRemove.forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
    }

    static verifyStorageConsistency() {
        const isAuthenticated = localStorage.getItem(config.storage.keys.auth) === 'true';
        const username = localStorage.getItem(config.storage.keys.username);
        const userRole = localStorage.getItem(config.storage.keys.userRole);
        const currentUser = localStorage.getItem(config.storage.keys.userData);

        Logger.info('Storage consistency check:', {
            isAuthenticated,
            username,
            userRole,
            hasUserData: !!currentUser
        });

        return isAuthenticated && username && userRole && currentUser;
    }

    static getUserPreferences() {
        try {
            const prefs = localStorage.getItem('userPreferences');
            return prefs ? JSON.parse(prefs) : null;
        } catch (error) {
            Logger.error('Error reading user preferences:', error);
            return null;
        }
    }

    static updateUserPreferences(preferences) {
        try {
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
        } catch (error) {
            Logger.error('Error saving user preferences:', error);
            throw new Error('Failed to save user preferences');
        }
    }

    static getDefaultUsers() {
        const defaultUsers = [
            {
                username: 'genesis',
                password: 'admin123',
                role: 'Genesis Admin',
                status: 'active',
                email: 'genesis.admin@system.local',
                created: new Date().toISOString()
            },
            {
                username: 'admin',
                password: 'admin123',
                role: 'Platform Admin',
                status: 'active',
                email: 'admin@system.local',
                created: new Date().toISOString()
            }
        ];
        Logger.info('Generated default users:', defaultUsers);
        return defaultUsers;
    }

    static saveUsers(users) {
        try {
            if (!Array.isArray(users)) {
                throw new Error('Users must be an array');
            }
            localStorage.setItem(config.storage.keys.users, JSON.stringify(users));
            Logger.info('Users saved successfully:', users);
        } catch (error) {
            Logger.error('Error saving users:', error);
            throw new Error('Failed to save users');
        }
    }
}
