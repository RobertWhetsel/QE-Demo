import logger from '../logger/LoggerService.js';
import { SITE_STATE } from '../../../config/paths.js';

class StorageService {
    #logger;
    #prefix = 'qe_';
    #isInitialized = false;
    #encryptionKey = SITE_STATE === 'dev' ? 'dev_key' : process.env.STORAGE_KEY;
    #observers = new Map();
    #maxStorageSize = 5242880; // 5MB
    #sensitiveKeys = ['password', 'token', 'auth'];
    #storageTypes = {
        LOCAL: 'localStorage',
        SESSION: 'sessionStorage'
    };

    constructor() {
        this.#logger = logger;
        this.#logger.info('StorageService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Check storage availability
            this.#checkStorageAvailability();
            
            // Setup storage event listeners
            this.#setupStorageListeners();

            // Clean up expired items
            this.#cleanupExpiredItems();

            this.#isInitialized = true;
            this.#logger.info('StorageService initialized successfully');
        } catch (error) {
            this.#logger.error('StorageService initialization error:', error);
            throw error;
        }
    }

    #checkStorageAvailability() {
        const testKey = '__storage_test__';
        
        try {
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            sessionStorage.setItem(testKey, testKey);
            sessionStorage.removeItem(testKey);
        } catch (error) {
            this.#logger.error('Storage not available:', error);
            throw new Error('Storage is not available');
        }
    }

    #setupStorageListeners() {
        window.addEventListener('storage', (event) => {
            if (event.key?.startsWith(this.#prefix)) {
                this.#handleStorageChange(event);
            }
        });
    }

    #handleStorageChange(event) {
        const key = event.key.slice(this.#prefix.length);
        if (this.#observers.has(key)) {
            const observers = this.#observers.get(key);
            observers.forEach(callback => {
                try {
                    const newValue = event.newValue ? JSON.parse(event.newValue) : null;
                    callback(newValue);
                } catch (error) {
                    this.#logger.error('Error notifying storage observer:', error);
                }
            });
        }
    }

    #cleanupExpiredItems() {
        const storageTypes = [localStorage, sessionStorage];
        
        storageTypes.forEach(storage => {
            Object.keys(storage).forEach(key => {
                if (key.startsWith(this.#prefix)) {
                    try {
                        const value = JSON.parse(storage.getItem(key));
                        if (value?.expires && value.expires < Date.now()) {
                            storage.removeItem(key);
                            this.#logger.info('Removed expired item:', key);
                        }
                    } catch (error) {
                        this.#logger.error('Error cleaning up storage item:', error);
                    }
                }
            });
        });
    }

    #getFullKey(key) {
        return this.#prefix + key;
    }

    #shouldEncrypt(key) {
        return this.#sensitiveKeys.some(sensitiveKey => 
            key.toLowerCase().includes(sensitiveKey)
        );
    }

    #encrypt(data) {
        if (!this.#encryptionKey) return data;
        
        try {
            const jsonStr = JSON.stringify(data);
            return btoa(
                encodeURIComponent(jsonStr)
                    .split('')
                    .map((c, i) => 
                        String.fromCharCode(
                            c.charCodeAt(0) ^ this.#encryptionKey.charCodeAt(i % this.#encryptionKey.length)
                        )
                    )
                    .join('')
            );
        } catch (error) {
            this.#logger.error('Encryption error:', error);
            throw error;
        }
    }

    #decrypt(data) {
        if (!this.#encryptionKey) return data;
        
        try {
            const decrypted = decodeURIComponent(
                atob(data)
                    .split('')
                    .map((c, i) => 
                        String.fromCharCode(
                            c.charCodeAt(0) ^ this.#encryptionKey.charCodeAt(i % this.#encryptionKey.length)
                        )
                    )
                    .join('')
            );
            return JSON.parse(decrypted);
        } catch (error) {
            this.#logger.error('Decryption error:', error);
            throw error;
        }
    }

    #checkStorageQuota(value) {
        const size = new Blob([value]).size;
        return size <= this.#maxStorageSize;
    }

    #notifyObservers(key, value) {
        if (this.#observers.has(key)) {
            const observers = this.#observers.get(key);
            observers.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    this.#logger.error('Error notifying observer:', error);
                }
            });
        }
    }

    // Public storage methods
    setItem(key, value, options = {}) {
        const {
            storage = this.#storageTypes.LOCAL,
            expires = null,
            encrypt = this.#shouldEncrypt(key)
        } = options;

        try {
            const fullKey = this.#getFullKey(key);
            const storageValue = {
                value,
                expires: expires ? Date.now() + expires : null,
                timestamp: Date.now()
            };

            const serializedValue = encrypt 
                ? this.#encrypt(storageValue)
                : JSON.stringify(storageValue);

            if (!this.#checkStorageQuota(serializedValue)) {
                throw new Error('Storage quota exceeded');
            }

            window[storage].setItem(fullKey, serializedValue);
            this.#notifyObservers(key, value);
            return true;
        } catch (error) {
            this.#logger.error('Error setting storage item:', error);
            return false;
        }
    }

    getItem(key, options = {}) {
        const {
            storage = this.#storageTypes.LOCAL,
            decrypt = this.#shouldEncrypt(key),
            defaultValue = null
        } = options;

        try {
            const fullKey = this.#getFullKey(key);
            const item = window[storage].getItem(fullKey);
            
            if (!item) return defaultValue;

            const parsed = decrypt 
                ? this.#decrypt(item)
                : JSON.parse(item);

            if (parsed.expires && parsed.expires < Date.now()) {
                window[storage].removeItem(fullKey);
                return defaultValue;
            }

            return parsed.value;
        } catch (error) {
            this.#logger.error('Error getting storage item:', error);
            return defaultValue;
        }
    }

    removeItem(key, options = {}) {
        const { storage = this.#storageTypes.LOCAL } = options;

        try {
            const fullKey = this.#getFullKey(key);
            window[storage].removeItem(fullKey);
            this.#notifyObservers(key, null);
            return true;
        } catch (error) {
            this.#logger.error('Error removing storage item:', error);
            return false;
        }
    }

    clear(options = {}) {
        const { storage = this.#storageTypes.LOCAL } = options;

        try {
            const store = window[storage];
            Object.keys(store).forEach(key => {
                if (key.startsWith(this.#prefix)) {
                    store.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            this.#logger.error('Error clearing storage:', error);
            return false;
        }
    }

    // Public utility methods
    subscribe(key, callback) {
        if (!this.#observers.has(key)) {
            this.#observers.set(key, new Set());
        }
        this.#observers.get(key).add(callback);
        return () => this.#observers.get(key).delete(callback);
    }

    getStorageSize(storage = this.#storageTypes.LOCAL) {
        let size = 0;
        const store = window[storage];
        
        Object.keys(store).forEach(key => {
            if (key.startsWith(this.#prefix)) {
                size += new Blob([store.getItem(key)]).size;
            }
        });

        return size;
    }

    getRemainingSpace(storage = this.#storageTypes.LOCAL) {
        return this.#maxStorageSize - this.getStorageSize(storage);
    }

    isStorageAvailable(storage = this.#storageTypes.LOCAL) {
        try {
            const testKey = '__storage_test__';
            window[storage].setItem(testKey, testKey);
            window[storage].removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    getKeys(storage = this.#storageTypes.LOCAL) {
        const keys = [];
        const store = window[storage];
        
        Object.keys(store).forEach(key => {
            if (key.startsWith(this.#prefix)) {
                keys.push(key.slice(this.#prefix.length));
            }
        });

        return keys;
    }

    getStorageInfo(storage = this.#storageTypes.LOCAL) {
        return {
            size: this.getStorageSize(storage),
            remaining: this.getRemainingSpace(storage),
            keys: this.getKeys(storage),
            isAvailable: this.isStorageAvailable(storage)
        };
    }
}

// Create and export singleton instance
const storageService = new StorageService();
export default storageService;