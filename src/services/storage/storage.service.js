import config from '../../../config/client.js';

class StorageService {
    #prefix = 'qe_';
    #debugMode = window.env.SITE_STATE === 'dev';
    #encryptionEnabled = window.env.SITE_STATE !== 'dev';

    constructor() {
        if (this.#debugMode) {
            console.log('StorageService initializing');
        }
        this.#validateStorage();
    }

    #validateStorage() {
        try {
            const testKey = `${this.#prefix}test`;
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (error) {
            console.error('Storage is not available:', error);
            throw new Error('Storage is not available');
        }
    }

    #getFullKey(key) {
        return `${this.#prefix}${key}`;
    }

    #encrypt(data) {
        if (!this.#encryptionEnabled) return data;
        // Implement encryption here
        return btoa(JSON.stringify(data));
    }

    #decrypt(data) {
        if (!this.#encryptionEnabled) return data;
        // Implement decryption here
        try {
            return JSON.parse(atob(data));
        } catch {
            return data;
        }
    }

    setItem(key, value) {
        try {
            const fullKey = this.#getFullKey(key);
            const serializedValue = JSON.stringify(value);
            const encryptedValue = this.#encrypt(serializedValue);
            localStorage.setItem(fullKey, encryptedValue);

            if (this.#debugMode) {
                console.log(`Stored value for key: ${key}`);
            }
        } catch (error) {
            console.error(`Error storing value for key ${key}:`, error);
            throw error;
        }
    }

    getItem(key) {
        try {
            const fullKey = this.#getFullKey(key);
            const encryptedValue = localStorage.getItem(fullKey);
            
            if (encryptedValue === null) {
                return null;
            }

            const decryptedValue = this.#decrypt(encryptedValue);
            return JSON.parse(decryptedValue);
        } catch (error) {
            console.error(`Error retrieving value for key ${key}:`, error);
            return null;
        }
    }

    removeItem(key) {
        try {
            const fullKey = this.#getFullKey(key);
            localStorage.removeItem(fullKey);

            if (this.#debugMode) {
                console.log(`Removed value for key: ${key}`);
            }
        } catch (error) {
            console.error(`Error removing value for key ${key}:`, error);
            throw error;
        }
    }

    clear() {
        try {
            // Only clear items with our prefix
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.#prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));

            if (this.#debugMode) {
                console.log('Cleared all storage');
            }
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.#prefix)) {
                keys.push(key.slice(this.#prefix.length));
            }
        }
        return keys;
    }

    getSize() {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.#prefix)) {
                totalSize += localStorage.getItem(key).length;
            }
        }
        return totalSize;
    }

    hasKey(key) {
        const fullKey = this.#getFullKey(key);
        return localStorage.getItem(fullKey) !== null;
    }
}

// Create and export singleton instance
const storage = new StorageService();
export default storage;
