import paths from '../../config/paths.js';
import config from '../../config/client.js';
import Logger from '../utils/logging/logger.js';

export class User {
    constructor(data) {
        this.username = data.username;
        this.role = data.role;
        this.status = data.status;
        this.email = data.email;
    }

    static isAuthenticated() {
        try {
            Logger.info('Checking authentication status');
            const authStatus = localStorage.getItem(config.storage.keys.auth) === 'true';
            Logger.info('Auth status:', authStatus);
            return authStatus;
        } catch (error) {
            Logger.error('Error checking authentication:', error);
            return false;
        }
    }

    static getCurrentUser() {
        try {
            Logger.info('Getting current user');
            const userData = localStorage.getItem(config.storage.keys.userData);
            
            if (!userData) {
                Logger.info('No user data found');
                return null;
            }
            
            // Try parsing as direct user data first
            try {
                const user = new User(JSON.parse(userData));
                Logger.info('Current user:', user);
                return user;
            } catch {
                // If direct parsing fails, try parsing as value wrapper
                const parsed = JSON.parse(userData);
                if (parsed.value && parsed.value.users) {
                    const username = localStorage.getItem(config.storage.keys.username);
                    const user = parsed.value.users.find(u => u.username === username);
                    if (user) {
                        Logger.info('Found user in wrapped data:', user);
                        return new User(user);
                    }
                }
                Logger.warn('Failed to parse user data');
                return null;
            }
        } catch (error) {
            Logger.error('Error getting current user:', error);
            return null;
        }
    }

    static getCurrentUserRole() {
        try {
            Logger.info('Getting current user role');
            const userRole = localStorage.getItem(config.storage.keys.userRole);
            Logger.info('Current role:', userRole);
            return userRole || null;
        } catch (error) {
            Logger.error('Error getting user role:', error);
            return null;
        }
    }

    static async login(username, password) {
        try {
            Logger.info('Starting login process for:', { username });
            
            // Debug: Log initial storage state
            Logger.info('Initial storage state:', {
                auth: localStorage.getItem(config.storage.keys.auth),
                username: localStorage.getItem(config.storage.keys.username),
                role: localStorage.getItem(config.storage.keys.userRole),
                userData: localStorage.getItem(config.storage.keys.userData)
            });
            
            // Try to get users from localStorage first
            const storedUsers = localStorage.getItem(config.storage.keys.users);
            let users = [];
            
            if (storedUsers) {
                Logger.info('Found stored users');
                users = JSON.parse(storedUsers);
            } else {
                Logger.info('No stored users, using defaults');
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
                localStorage.setItem(config.storage.keys.userData, JSON.stringify({
                    username: user.username,
                    role: user.role,
                    status: user.status,
                    email: user.email
                }));

                // Debug: Log final storage state
                Logger.info('Final storage state:', {
                    auth: localStorage.getItem(config.storage.keys.auth),
                    username: localStorage.getItem(config.storage.keys.username),
                    role: localStorage.getItem(config.storage.keys.userRole),
                    userData: localStorage.getItem(config.storage.keys.userData)
                });

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
        Logger.info('Logging out user');
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