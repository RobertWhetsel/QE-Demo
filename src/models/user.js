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
                const response = await fetch('../models/data/users.csv');
                const csvText = await response.text();
                
                // Parse CSV manually since we're in browser
                const users = this.parseCSV(csvText);
                
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
            throw error;
        }
    }

    static parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const user = {};
                headers.forEach((header, i) => {
                    user[header] = values[i];
                });
                return user;
            });
    }

    static async logout() {
        await this.clearAllStorage();
    }

    static async clearAllStorage() {
        sessionStorage.clear();
        localStorage.removeItem('userPreferences');
    }

    static verifyStorageConsistency() {
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const username = sessionStorage.getItem('username');
        const userRole = sessionStorage.getItem('userRole');
        const currentUser = sessionStorage.getItem('currentUser');

        return isAuthenticated && username && userRole && currentUser;
    }

    static getUserPreferences() {
        const prefs = localStorage.getItem('userPreferences');
        return prefs ? JSON.parse(prefs) : null;
    }

    static updateUserPreferences(preferences) {
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }

    static getDefaultUsers() {
        return [
            {
                username: 'genesis',
                password: 'admin123',
                role: 'Genesis Admin',
                status: 'active'
            },
            {
                username: 'admin',
                password: 'admin123',
                role: 'Platform Admin',
                status: 'active'
            }
        ];
    }

    static saveUsers(users) {
        localStorage.setItem('users_json', JSON.stringify(users));
    }
}
