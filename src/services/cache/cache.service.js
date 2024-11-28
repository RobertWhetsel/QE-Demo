import { User } from '../../models/user.js';

class CacheService {
    #cache = new Map();
    #debugMode = window.env.SITE_STATE === 'dev';
    #maxSize = 1000;
    #defaultTTL = 3600000; // 1 hour in milliseconds

    constructor() {
        if (this.#debugMode) {
            console.log('CacheService initializing');
        }
        this.#initialize();
    }

    #initialize() {
        // Setup periodic cleanup
        setInterval(() => this.#cleanup(), 300000); // Cleanup every 5 minutes

        if (this.#debugMode) {
            console.log('CacheService initialized');
        }
    }

    #cleanup() {
        const now = Date.now();
        let cleanupCount = 0;

        for (const [key, value] of this.#cache.entries()) {
            if (value.expiry && value.expiry < now) {
                this.#cache.delete(key);
                cleanupCount++;
            }
        }

        if (this.#debugMode && cleanupCount > 0) {
            console.log(`Cleaned up ${cleanupCount} expired cache entries`);
        }
    }

    set(key, value, ttl = this.#defaultTTL) {
        if (this.#cache.size >= this.#maxSize) {
            // Remove oldest entry
            const oldestKey = this.#cache.keys().next().value;
            this.#cache.delete(oldestKey);

            if (this.#debugMode) {
                console.log('Cache full, removed oldest entry:', oldestKey);
            }
        }

        const expiry = ttl ? Date.now() + ttl : null;
        this.#cache.set(key, { value, expiry });

        if (this.#debugMode) {
            console.log(`Cached value for key: ${key}, TTL: ${ttl}ms`);
        }
    }

    get(key) {
        const entry = this.#cache.get(key);
        
        if (!entry) {
            if (this.#debugMode) {
                console.log(`Cache miss for key: ${key}`);
            }
            return null;
        }

        if (entry.expiry && entry.expiry < Date.now()) {
            this.#cache.delete(key);
            if (this.#debugMode) {
                console.log(`Cache entry expired for key: ${key}`);
            }
            return null;
        }

        if (this.#debugMode) {
            console.log(`Cache hit for key: ${key}`);
        }

        return entry.value;
    }

    delete(key) {
        const deleted = this.#cache.delete(key);
        
        if (this.#debugMode) {
            console.log(`Cache entry ${deleted ? 'deleted' : 'not found'} for key: ${key}`);
        }

        return deleted;
    }

    clear() {
        this.#cache.clear();
        
        if (this.#debugMode) {
            console.log('Cache cleared');
        }
    }

    has(key) {
        const entry = this.#cache.get(key);
        if (!entry) return false;
        
        if (entry.expiry && entry.expiry < Date.now()) {
            this.#cache.delete(key);
            return false;
        }

        return true;
    }

    size() {
        return this.#cache.size;
    }

    keys() {
        return Array.from(this.#cache.keys());
    }

    setMaxSize(size) {
        this.#maxSize = size;
        
        if (this.#debugMode) {
            console.log(`Cache max size set to: ${size}`);
        }

        // Cleanup if necessary
        while (this.#cache.size > this.#maxSize) {
            const oldestKey = this.#cache.keys().next().value;
            this.#cache.delete(oldestKey);
        }
    }

    setDefaultTTL(ttl) {
        this.#defaultTTL = ttl;
        
        if (this.#debugMode) {
            console.log(`Cache default TTL set to: ${ttl}ms`);
        }
    }

    getStats() {
        const now = Date.now();
        let activeEntries = 0;
        let expiredEntries = 0;

        for (const [, value] of this.#cache.entries()) {
            if (!value.expiry || value.expiry > now) {
                activeEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.#cache.size,
            activeEntries,
            expiredEntries,
            maxSize: this.#maxSize,
            defaultTTL: this.#defaultTTL
        };
    }
}

// Create and export singleton instance
const cache = new CacheService();
export default cache;
