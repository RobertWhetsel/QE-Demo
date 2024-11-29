// Data service implementation following singleton pattern
class DataService {
    #initialized = false;
    #cache = new Map();
    #pendingRequests = new Map();
    static instance = null;

    constructor() {
        if (DataService.instance) {
            return DataService.instance;
        }
        DataService.instance = this;
    }

    async initialize() {
        if (this.#initialized) {
            return true;
        }

        try {
            // First initialize with empty state
            this.#cache = new Map();
            
            // Set up storage event listener for cross-tab sync
            window.addEventListener('storage', this.#handleStorageChange.bind(this));

            // Mark as initialized - actual data will be loaded on demand
            this.#initialized = true;
            return true;
        } catch (error) {
            console.error('DataService initialization error:', error);
            throw error;
        }
    }

    #handleStorageChange(event) {
        if (!event.key || !event.newValue) return;

        try {
            const data = JSON.parse(event.newValue);
            this.#cache.set(event.key, data);
        } catch (error) {
            console.error('Storage sync error:', error);
        }
    }

    async #ensureInitialized() {
        if (!this.#initialized) {
            await this.initialize();
        }
    }

    async getData(key, forceRefresh = false) {
        await this.#ensureInitialized();

        // Check for pending requests
        if (this.#pendingRequests.has(key)) {
            return this.#pendingRequests.get(key);
        }

        // Return cached data if available and not forcing refresh
        if (!forceRefresh && this.#cache.has(key)) {
            return this.#cache.get(key);
        }

        try {
            // Create promise for this request
            const requestPromise = this.#fetchData(key);
            this.#pendingRequests.set(key, requestPromise);

            // Await result
            const result = await requestPromise;

            // Update cache
            this.#cache.set(key, result);

            // Remove from pending requests
            this.#pendingRequests.delete(key);

            return result;
        } catch (error) {
            // Clean up on error
            this.#pendingRequests.delete(key);
            throw error;
        }
    }

    async #fetchData(key) {
        const { default: paths } = await import(window.env.PATHS_MODULE);
        
        // Handle different data types
        switch (key) {
            case 'users':
                try {
                    // First try localStorage
                    const cached = localStorage.getItem('users');
                    if (cached) {
                        return JSON.parse(cached);
                    }
                    
                    // Then try file system
                    const usersResponse = await fetch('/data/users.json');
                    if (usersResponse.ok) {
                        const userData = await usersResponse.json();
                        // Cache in localStorage
                        localStorage.setItem('users', JSON.stringify(userData));
                        return userData;
                    }

                    // Fallback to CSV if JSON fails
                    const csvResponse = await fetch('/data/users.csv');
                    if (csvResponse.ok) {
                        const csvText = await csvResponse.text();
                        const userData = this.#parseCSVUsers(csvText);
                        // Cache in localStorage
                        localStorage.setItem('users', JSON.stringify(userData));
                        return userData;
                    }
                    
                    // Return empty data structure if both fail
                    return { users: [] };
                } catch (error) {
                    console.error('Error fetching users:', error);
                    return { users: [] };
                }
            default:
                throw new Error(`Unknown data key: ${key}`);
        }
    }

    #parseCSVUsers(csvText) {
        try {
            const lines = csvText.split('\n');
            if (lines.length < 2) return { users: [] }; // No data or only headers

            const headers = lines[0].split(',').map(h => h.trim());
            const users = lines.slice(1)
                .filter(line => line.trim().length > 0)
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const userData = {};
                    headers.forEach((header, index) => {
                        userData[header] = values[index];
                    });
                    return userData;
                });

            return { users };
        } catch (error) {
            console.error('Error parsing CSV users:', error);
            return { users: [] };
        }
    }

    async setData(key, value) {
        await this.#ensureInitialized();

        try {
            // Update cache
            this.#cache.set(key, value);

            // Persist to localStorage for cross-tab sync
            localStorage.setItem(key, JSON.stringify(value));

            return true;
        } catch (error) {
            console.error('Data update error:', error);
            throw error;
        }
    }

    async clearCache() {
        this.#cache.clear();
        return true;
    }
}

// Export a function that returns the singleton instance
export default async function() {
    const instance = new DataService();
    await instance.initialize();
    return instance;
}
