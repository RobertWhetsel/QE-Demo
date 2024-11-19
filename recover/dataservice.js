// Consolidated Data Service implementation
const DataService = (function() {
  // Private data store
  let instance = null;
  
  class DataServiceClass {
    constructor() {
      if (instance) {
        return instance;
      }
      console.log('Creating new DataService instance'); // Debug log
      this.data = null;
      this.init();
      instance = this;
    }

    // Initialize data from sessionStorage or create new
    async init() {
      try {
        console.log('Initializing DataService'); // Debug log
        // Try to get data from sessionStorage first
        const storedData = sessionStorage.getItem('appData');
        if (storedData) {
          console.log('Found stored data in session'); // Debug log
          this.data = JSON.parse(storedData);
          return;
        }

        // If no stored data, try CSV
        try {
          const response = await fetch('data.csv');
          if (!response.ok) {
            throw new Error('CSV file not found');
          }
          const csvText = await response.text();
          console.log('Loading data from CSV:', csvText); // Debug log
          this.data = this.parseCSV(csvText);
        } catch (error) {
          console.log('CSV read failed:', error);
          this.data = [];
        }
        
        // Store in sessionStorage
        sessionStorage.setItem('appData', JSON.stringify(this.data));
      } catch (error) {
        console.error('Error initializing data:', error);
        this.data = [];
        sessionStorage.setItem('appData', JSON.stringify(this.data));
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
        console.error('Error parsing CSV:', error);
        return [];
      }
    }

    // Convert data to CSV
    toCSV() {
      if (!this.data || this.data.length === 0) {
        // Return headers including password field
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
      console.log('Getting data:', this.data); // Debug log
      return this.data || [];
    }

    // Save data
    async saveData(newData) {
      try {
        console.log('Saving data:', newData); // Debug log
        this.data = newData;
        
        // Always save to sessionStorage
        sessionStorage.setItem('appData', JSON.stringify(this.data));

        // Try to save to CSV if possible
        const csvContent = this.toCSV();
        try {
          const response = await fetch('data.csv', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/csv',
            },
            body: csvContent
          });
          
          if (!response.ok) {
            console.log('CSV save failed, using sessionStorage only');
          }
        } catch (error) {
          console.log('CSV save failed, using sessionStorage only');
        }

        return true;
      } catch (error) {
        console.error('Error saving data:', error);
        return false;
      }
    }

    // Add new record
    async addRecord(record) {
      if (!record) {
        throw new Error('Invalid record data');
      }
      
      console.log('Adding record:', record); // Debug log
      this.data = this.data || [];
      this.data.push(record);
      return this.saveData(this.data);
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

    // Save session data to CSV before exit
    async saveSessionData() {
      try {
        // Get all session data
        const sessionData = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          sessionData[key] = sessionStorage.getItem(key);
        }

        // Add session data to existing data
        const currentTime = new Date().toISOString();
        const sessionRecord = {
          id: `session_${Date.now()}`,
          name: sessionData.userName || '',
          email: '',
          type: sessionData.userRole || '',
          created: currentTime,
          ...sessionData
        };

        // Add to data array
        this.data = this.data || [];
        this.data.push(sessionRecord);

        // Save to CSV
        const csvContent = this.toCSV();
        const response = await fetch('data.csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/csv',
          },
          body: csvContent
        });

        if (!response.ok) {
          throw new Error('Failed to save to CSV');
        }

        return true;
      } catch (error) {
        console.error('Error saving session data:', error);
        throw error;
      }
    }
  }

  // Return singleton instance
  return {
    getInstance: function() {
      if (!instance) {
        instance = new DataServiceClass();
      }
      return instance;
    }
  };
})();

// Export as global variable
window.DataService = DataService;
