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

            // If no stored data, try CSV
            try {
                const response = await fetch('/src/models/data/data.csv');
                if (!response.ok) {
                    throw new Error('CSV file not found');
                }
                const csvText = await response.text();
                this.log('Loading data from CSV');
                this.data = this.parseCSV(csvText);
            } catch (error) {
                this.error('CSV read failed:', error);
                this.data = [];
            }
            
            // Store in storage with expiration
            this.saveToStorage(this.data);
        } catch (error) {
            this.error('Error initializing data:', error);
            this.data = [];
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
            return [];
        }

        const lines = csv.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            return [];
        }

        try {
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
            this.error('Error parsing CSV:', error);
            return [];
        }
    }

    // Convert data to CSV
    toCSV() {
        if (!this.data || this.data.length === 0) {
            return 'id,name,email,password,type,created';
        }
        
        const headers = ['id', 'name', 'email', 'password', 'type', 'created'];
        const csvLines = [
            headers.join(','),
            ...this.data.map(row => 
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
        return this.data || [];
    }

    // Save data
    async saveData(newData) {
        try {
            this.log('Saving data');
            this.data = newData;
            
            // Save to storage
            this.saveToStorage(this.data);

            // Try to save to CSV
            const csvContent = this.toCSV();
            const response = await fetch('/src/models/data/data.csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/csv',
                },
                body: csvContent
            });
            
            if (!response.ok) {
                this.error('Failed to save to CSV:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            this.error('Error saving data:', error);
            return false;
        }
    }

    // Add new record
    async addRecord(record) {
        if (!record) {
            throw new Error('Invalid record data');
        }
        
        this.log('Adding record:', record);
        this.data = this.data || [];
        this.data.push(record);
        
        // Save to both storage and CSV
        const saved = await this.saveData(this.data);
        if (!saved) {
            this.error('Failed to save record to CSV, but saved to storage');
            this.saveToStorage(this.data);
        }
        
        return true;
    }

    // Update record
    async updateRecord(id, updates) {
        const index = this.data.findIndex(record => record.id === id);
        if (index === -1) {
            throw new Error('Record not found');
        }
        
        this.data[index] = { ...this.data[index], ...updates };
        return this.saveData(this.data);
    }

    // Delete record
    async deleteRecord(id) {
        this.data = this.data.filter(record => record.id !== id);
        return this.saveData(this.data);
    }

    // Search records
    searchRecords(criteria) {
        return this.data.filter(record => 
            Object.entries(criteria).every(([key, value]) => 
                record[key] === value
            )
        );
    }
}
