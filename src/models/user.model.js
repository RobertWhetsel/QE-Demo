export class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.username = data.username || '';
        this.email = data.email || '';
        this.password = data.password || null; // Added password field
        this.role = data.role || 'volunteer';
        this.lastLogin = data.lastLogin || null;
        this.dateCreated = data.dateCreated || new Date().toISOString();
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this._authenticated = false;
        this.preferences = data.preferences || User.getDefaultPreferences();
    }

    // Static Methods
    static getDefaultPreferences() {
        return {
            theme: 'light',
            font: 'default',
            fontSize: 'medium',
            language: 'en',
            notifications: true,
            accessibility: {
                highContrast: false,
                fontSize: 'medium',
                reduceMotion: false
            }
        };
    }

    static async getUserPreferences() {
        try {
            // Try to get preferences from session storage first
            const storedPrefs = sessionStorage.getItem('userPreferences');
            if (storedPrefs) {
                return JSON.parse(storedPrefs);
            }

            // If user is authenticated, get their saved preferences
            if (await this.isAuthenticated()) {
                const currentUser = await this.getCurrentUser();
                if (currentUser && currentUser.preferences) {
                    return currentUser.preferences;
                }
            }

            // Return default preferences if nothing else is available
            return this.getDefaultPreferences();
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    static async isAuthenticated() {
        try {
            const authToken = sessionStorage.getItem('authToken');
            if (!authToken) return false;

            const currentUser = sessionStorage.getItem('currentUser');
            return Boolean(currentUser && authToken);
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    static async checkExistingUsers() {
        try {
            const { PathResolver } = window.env;
            if (!PathResolver) {
                throw new Error('PathResolver not initialized');
            }

            // First try to get users from CSV
            const csvResponse = await fetch(PathResolver.resolve('data/users.csv'));
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                return csvText.trim().length > 0;
            }

            // Fallback to JSON if CSV fails
            const jsonResponse = await fetch(PathResolver.resolve('data/users.json'));
            if (jsonResponse.ok) {
                const data = await jsonResponse.json();
                return Array.isArray(data.users) && data.users.length > 0;
            }

            return false;
        } catch (error) {
            console.error('Error checking existing users:', error);
            return false;
        }
    }

    static async getCurrentUser() {
        try {
            const currentUser = sessionStorage.getItem('currentUser');
            return currentUser ? new User(JSON.parse(currentUser)) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    static async getUser(username) {
        try {
            const users = await this.getAllUsers();
            return users.find(user => user.username === username) || null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    static async getAllUsers() {
        try {
            const { PathResolver } = window.env;
            if (!PathResolver) {
                throw new Error('PathResolver not initialized');
            }

            // First try CSV
            const csvResponse = await fetch(PathResolver.resolve('data/users.csv'));
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                return this.parseCSVUsers(csvText);
            }

            // Fallback to JSON
            const jsonResponse = await fetch(PathResolver.resolve('data/users.json'));
            if (jsonResponse.ok) {
                const data = await jsonResponse.json();
                return Array.isArray(data.users) ? data.users.map(user => new User(user)) : [];
            }

            return [];
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    static parseCSVUsers(csvText) {
        try {
            const lines = csvText.split('\n');
            if (lines.length < 2) return []; // No data or only headers

            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1)
                .filter(line => line.trim().length > 0)
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const userData = {};
                    headers.forEach((header, index) => {
                        userData[header] = values[index];
                    });
                    return new User(userData);
                });
        } catch (error) {
            console.error('Error parsing CSV users:', error);
            return [];
        }
    }

    // Instance Methods
    isAuthenticated() {
        return this._authenticated;
    }

    async authenticate(password = null) {
        try {
            // For GENESIS_USER or if password matches stored password
            if (this.role === 'GENESIS_ADMINUSER' || (password && this.password === password)) {
                this._authenticated = true;
                sessionStorage.setItem('authToken', 'temp-token');
                // Don't include password in sessionStorage
                const userDataForStorage = { ...this.toJSON() };
                delete userDataForStorage.password;
                sessionStorage.setItem('currentUser', JSON.stringify(userDataForStorage));
                // Save preferences when authenticating
                sessionStorage.setItem('userPreferences', JSON.stringify(this.preferences));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error authenticating user:', error);
            return false;
        }
    }

    async logout() {
        try {
            this._authenticated = false;
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('userPreferences');
            return true;
        } catch (error) {
            console.error('Error logging out user:', error);
            return false;
        }
    }

    async updatePreferences(newPreferences) {
        try {
            this.preferences = {
                ...this.preferences,
                ...newPreferences
            };
            sessionStorage.setItem('userPreferences', JSON.stringify(this.preferences));
            return await this.save();
        } catch (error) {
            console.error('Error updating preferences:', error);
            return false;
        }
    }

    async save() {
        try {
            // Implementation would depend on backend storage mechanism
            console.log('User saved:', this);
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    }

    async update(data) {
        try {
            Object.assign(this, data);
            return await this.save();
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    }

    validate() {
        return {
            isValid: this.username && this.role,
            errors: {
                username: !this.username ? 'Username is required' : '',
                role: !this.role ? 'Role is required' : '',
                password: !this.password ? 'Password is required' : ''
            }
        };
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            password: this.password, // Include password in JSON representation
            role: this.role,
            lastLogin: this.lastLogin,
            dateCreated: this.dateCreated,
            isActive: this.isActive,
            preferences: this.preferences
        };
    }
}
