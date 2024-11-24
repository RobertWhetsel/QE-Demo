import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

// Consolidated Data Service implementation
class DataServiceClass {
    constructor() {
        if (DataServiceClass.instance) {
            return DataServiceClass.instance;
        }
        Logger.info('Creating new DataService instance');
        this.data = null;
        this.init();
        DataServiceClass.instance = this;
    }

    // Initialize data from localStorage or create new
    async init() {
        try {
            Logger.info('Initializing DataService');
            // Try to get data from localStorage first
            const storedData = localStorage.getItem('appData');
            if (storedData) {
                Logger.info('Found stored data in localStorage');
                this.data = JSON.parse(storedData);
                return;
            }

            // If no stored data, try CSV
            try {
                const csvPath = paths.join(paths.data, 'data.csv');
                const response = await fetch(paths.resolve(csvPath));
                if (!response.ok) {
                    throw new Error('CSV file not found');
                }
                const csvText = await response.text();
                Logger.info('Loading data from CSV');
                this.data = this.parseCSV(csvText);
            } catch (error) {
                Logger.error('CSV read failed:', error);
                this.data = [];
            }
            
            // Store in localStorage
            localStorage.setItem('appData', JSON.stringify(this.data));
        } catch (error) {
            Logger.error('Error initializing data:', error);
            this.data = [];
            localStorage.setItem('appData', JSON.stringify(this.data));
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
            Logger.error('Error parsing CSV:', error);
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
        Logger.info('Getting data:', this.data);
        return this.data || [];
    }

    // Save data
    async saveData(newData) {
        try {
            Logger.info('Saving data');
            this.data = newData;
            
            // Always save to localStorage
            localStorage.setItem('appData', JSON.stringify(this.data));

            // Try to save to CSV
            const csvContent = this.toCSV();
            const csvPath = paths.join(paths.data, 'data.csv');
            const response = await fetch(paths.resolve(csvPath), {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/csv',
                },
                body: csvContent
            });
            
            if (!response.ok) {
                Logger.error('Failed to save to CSV:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            Logger.error('Error saving data:', error);
            return false;
        }
    }

    // Add new record
    async addRecord(record) {
        if (!record) {
            throw new Error('Invalid record data');
        }
        
        Logger.info('Adding record:', record);
        this.data = this.data || [];
        this.data.push(record);
        
        // Save to both localStorage and CSV
        const saved = await this.saveData(this.data);
        if (!saved) {
            Logger.error('Failed to save record');
            // Even if CSV save fails, keep in localStorage
            localStorage.setItem('appData', JSON.stringify(this.data));
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

    // Get singleton instance
    static getInstance() {
        if (!DataServiceClass.instance) {
            DataServiceClass.instance = new DataServiceClass();
        }
        return DataServiceClass.instance;
    }
}

// Create and export singleton instance
const DataService = DataServiceClass.getInstance();
export default DataService;
