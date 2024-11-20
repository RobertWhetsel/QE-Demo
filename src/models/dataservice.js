import config from '../../config/client.js';

// Consolidated Data Service implementation
export class DataService {
    constructor() {
        if (DataService.instance) {
            return DataService.instance;
        }
        this.debug = config.features.debugMode;
        this.log('Creating new DataService instance');
        this.data = null;
        this.storageKey = 'appData';
        this.storage = config.cache.enableLocalStorage ? localStorage : sessionStorage;
        this.cacheMaxAge = config.cache.maxAge * 1000; // Convert to milliseconds
        this.init();
        DataService.instance = this;
    }

    log(...args) {
        if (this.debug) {
            console.log('[DataService]', ...args);
        }
    }

    error(...args) {
        console.error('[DataService]', ...args);
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
                return;
            }

            // Try JSON first
            try {
                const response = await fetch('/src/models/data/users.json');
                if (response.ok) {
                    const jsonData = await response.json();
                    this.log('Loading data from JSON');
                    this.data = jsonData;
                    this.saveToStorage(this.data);
                    return;
                }
            } catch (error) {
                this.error('JSON read failed:', error);
            }

            // If JSON fails, try CSV
            try {
                const response = await fetch('/src/models/data/users.csv');
                if (!response.ok) {
                    throw new Error('CSV file not found');
                }
                const csvText = await response.text();
                this.log('Loading data from CSV');
                this.data = this.parseCSV(csvText);
            } catch (error) {
                this.error('CSV read failed:', error);
                this.data = { users: [], pendingUsers: [] };
            }
            
            // Store in storage with expiration
            this.saveToStorage(this.data);
        } catch (error) {
            this.error('Error initializing data:', error);
            this.data = { users: [], pendingUsers: [] };
            this.saveToStorage(this.data);
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

    // Parse CSV to array of objects
    parseCSV(csv) {
        if (!csv || csv.trim() === '') {
            return { users: [], pendingUsers: [] };
        }

        const lines = csv.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            return { users: [], pendingUsers: [] };
        }

        try {
            const headers = lines[0].split(',').map(h => h.trim());
            if (lines.length === 1) {
                return { users: [], pendingUsers: [] };
            }
            
            const users = lines.slice(1)
                .filter(line => line.trim() !== '')
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = values[i] || '';
                    });
                    return obj;
                });

            return { users, pendingUsers: [] };
        } catch (error) {
            this.error('Error parsing CSV:', error);
            return { users: [], pendingUsers: [] };
        }
    }

    // Convert data to CSV
    toCSV() {
        if (!this.data?.users || this.data.users.length === 0) {
            return 'username,email,password,role,created';
        }
        
        const headers = ['username', 'email', 'password', 'role', 'created'];
        const csvLines = [
            headers.join(','),
            ...this.data.users.map(row => 
                headers.map(field => {
                    const value = row[field] || '';
                    // Escape commas and quotes in values
                    return value.includes(',') ? `"${value}"` : value;
                }).join(',')
            )
        ];
        
        return csvLines.join('\n');
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
            this.saveToStorage(this.data);

            // Save to JSON
            try {
                const response = await fetch('/src/models/data/users.json', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.data)
                });
                
                if (!response.ok) {
                    this.error('Failed to save to JSON:', response.statusText);
                }
            } catch (error) {
                this.error('Error saving to JSON:', error);
            }

            // Save to CSV
            try {
                const csvContent = this.toCSV();
                const response = await fetch('/src/models/data/users.csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/csv',
                    },
                    body: csvContent
                });
                
                if (!response.ok) {
                    this.error('Failed to save to CSV:', response.statusText);
                }
            } catch (error) {
                this.error('Error saving to CSV:', error);
            }

            return true;
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
