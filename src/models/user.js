export class User {
    constructor(data) {
        this.username = data.username;
        this.role = data.role;
        this.status = data.status;
    }

    static isAuthenticated() {
        return sessionStorage.getItem('isAuthenticated') === 'true';
    }

    static getCurrentUser() {
        const userData = sessionStorage.getItem('currentUser');
        return userData ? new User(JSON.parse(userData)) : null;
    }

    static getCurrentUserRole() {
        const userRole = sessionStorage.getItem('userRole');
        return userRole || null;
    }

    static async login(username, password) {
        try {
            // Try to fetch users data from CSV first
            try {
                const response = await fetch('/src/models/data/users.csv');
                if (!response.ok) {
                    throw new Error(`Failed to fetch users.csv: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                if (!csvText.trim()) {
                    throw new Error('users.csv is empty');
                }
                
                // Parse CSV manually since we're in browser
                const users = this.parseCSV(csvText);
                if (!users || users.length === 0) {
                    throw new Error('No users found in CSV');
                }
                
                // Find matching user
                const user = users.find(u => 
                    u.username === username && 
                    u.password === password && 
                    u.status === 'active'
                );

                if (user) {
                    // Store user info in session
                    sessionStorage.setItem('isAuthenticated', 'true');
                    sessionStorage.setItem('username', user.username);
                    sessionStorage.setItem('userRole', user.role);
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                    
                    return new User(user);
                }
            } catch (csvError) {
                console.warn('Failed to load CSV, falling back to default users:', csvError);
            }

            // Fall back to default users if CSV fails
            const defaultUsers = this.getDefaultUsers();
            const user = defaultUsers.find(u => 
                u.username === username && 
                u.password === password
            );

            if (user) {
                // Store user info in session
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('userRole', user.role);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                
                return new User(user);
            }
            
            return null;
        } catch (error) {
            console.error('Login error:', error);
            throw new Error('Login failed: ' + (error.message || 'Unknown error'));
        }
    }

    static parseCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            if (lines.length < 2) {
                throw new Error('CSV must have headers and at least one user');
            }

            const headers = lines[0].split(',').map(h => h.trim());
            if (!headers.includes('username') || !headers.includes('password') || !headers.includes('role')) {
                throw new Error('CSV missing required headers');
            }
            
            return lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const user = {};
                    headers.forEach((header, i) => {
                        user[header] = values[i] || '';
                    });
                    return user;
                });
        } catch (error) {
            console.error('CSV parsing error:', error);
            throw new Error('Failed to parse users.csv: ' + error.message);
        }
    }

    static async logout() {
        await this.clearAllStorage();
    }

    static async clearAllStorage() {
        sessionStorage.clear();
        localStorage.removeItem('userPreferences');
        localStorage.removeItem('users_json');
    }

    static verifyStorageConsistency() {
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const username = sessionStorage.getItem('username');
        const userRole = sessionStorage.getItem('userRole');
        const currentUser = sessionStorage.getItem('currentUser');

        return isAuthenticated && username && userRole && currentUser;
    }

    static getUserPreferences() {
        try {
            const prefs = localStorage.getItem('userPreferences');
            return prefs ? JSON.parse(prefs) : null;
        } catch (error) {
            console.error('Error reading user preferences:', error);
            return null;
        }
    }

    static updateUserPreferences(preferences) {
        try {
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
            throw new Error('Failed to save user preferences');
        }
    }

    static getDefaultUsers() {
        return [
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
    }

    static saveUsers(users) {
        try {
            if (!Array.isArray(users)) {
                throw new Error('Users must be an array');
            }
            localStorage.setItem('users_json', JSON.stringify(users));
            
            // Also update CSV format for consistency
            const headers = ['username', 'fullName', 'email', 'phoneNumber', 'role', 'status', 'created', 'password'];
            const csvContent = [
                headers.join(','),
                ...users.map(user => 
                    headers.map(header => user[header] || '').join(',')
                )
            ].join('\n');
            
            localStorage.setItem('users_csv', csvContent);
        } catch (error) {
            console.error('Error saving users:', error);
            throw new Error('Failed to save users');
        }
    }
}
