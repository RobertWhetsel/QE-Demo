import logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

class CacheService {
    #logger;
    #isInitialized = false;
    #storage = localStorage;
    #memoryCache = new Map();
    #keyPrefix = 'cache_';
    #defaultTTL = config.cache.maxAge * 1000;
    #maxSize = 50 * 1024 * 1024; // 50MB
    #currentSize = 0;
    #cleanupInterval = 300000; // 5 minutes
    #compressionThreshold = 1024; // 1KB
    #debug = SITE_STATE === 'dev';
    #priorityLevels = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1
    };

    constructor() {
        this.#logger = logger;
        this.#logger.info('CacheService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Calculate current cache size
            this.#calculateCurrentSize();
            
            // Setup cleanup interval
            this.#setupCleanupInterval();

            // Setup storage event listener
            this.#setupStorageListener();

            this.#isInitialized = true;
            this.#logger.info('CacheService initialized successfully');
        } catch (error) {
            this.#logger.error('CacheService initialization error:', error);
            throw error;
        }
    }

    #calculateCurrentSize() {
        try {
            let size = 0;
            for (let i = 0; i < this.#storage.length; i++) {
                const key = this.#storage.key(i);
                if (key.startsWith(this.#keyPrefix)) {
                    size += this.#storage.getItem(key).length * 2; // UTF-16
                }
            }
            this.#currentSize = size;
            this.#logger.info('Current cache size:', this.#formatSize(size));
        } catch (error) {
            this.#logger.error('Error calculating cache size:', error);
        }
    }

    #setupCleanupInterval() {
        setInterval(() => {
            this.#cleanup();
        }, this.#cleanupInterval);
    }

    #setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key?.startsWith(this.#keyPrefix)) {
                this.#handleStorageChange(event);
            }
        });
    }

    #handleStorageChange(event) {
        try {
            if (!event.newValue) {
                // Item was removed
                this.#memoryCache.delete(event.key.slice(this.#keyPrefix.length));
            } else {
                // Item was added or modified
                const data = JSON.parse(event.newValue);
                this.#memoryCache.set(
                    event.key.slice(this.#keyPrefix.length),
                    data.value
                );
            }
            this.#calculateCurrentSize();
        } catch (error) {
            this.#logger.error('Error handling storage change:', error);
        }
    }

    async set(key, value, options = {}) {
        const {
            ttl = this.#defaultTTL,
            priority = this.#priorityLevels.MEDIUM,
            compress = true,
            force = false
        } = options;

        try {
            const cacheKey = this.#keyPrefix + key;
            const serializedValue = JSON.stringify(value);
            const size = serializedValue.length * 2;

            // Check size limits unless forced
            if (!force && size > this.#maxSize) {
                this.#logger.warn('Cache item too large:', { key, size: this.#formatSize(size) });
                return false;
            }

            // Compress if needed
            const finalValue = await this.#processValue(serializedValue, compress);

            const cacheItem = {
                value: finalValue,
                timestamp: Date.now(),
                expires: Date.now() + ttl,
                size,
                priority,
                compressed: compress && size > this.#compressionThreshold
            };

            // Ensure space is available
            if (!force && this.#currentSize + size > this.#maxSize) {
                await this.#makeSpace(size);
            }

            // Store in memory and persistent cache
            this.#memoryCache.set(key, value);
            this.#storage.setItem(cacheKey, JSON.stringify(cacheItem));
            
            this.#currentSize += size;
            this.#log('Cache set:', { key, size: this.#formatSize(size) });
            
            return true;
        } catch (error) {
            this.#logger.error('Error setting cache:', error);
            return false;
        }
    }

    async get(key) {
        try {
            // Check memory cache first
            if (this.#memoryCache.has(key)) {
                this.#log('Cache hit (memory):', key);
                return this.#memoryCache.get(key);
            }

            const cacheKey = this.#keyPrefix + key;
            const item = this.#storage.getItem(cacheKey);
            
            if (!item) {
                this.#log('Cache miss:', key);
                return null;
            }

            const cacheItem = JSON.parse(item);

            // Check expiration
            if (cacheItem.expires < Date.now()) {
                this.#log('Cache expired:', key);
                await this.remove(key);
                return null;
            }

            // Decompress if needed
            const value = await this.#processValue(cacheItem.value, cacheItem.compressed, true);
            
            // Update memory cache
            this.#memoryCache.set(key, value);
            
            this.#log('Cache hit (storage):', key);
            return value;

        } catch (error) {
            this.#logger.error('Error getting from cache:', error);
            return null;
        }
    }

    async remove(key) {
        try {
            const cacheKey = this.#keyPrefix + key;
            
            // Remove from memory cache
            this.#memoryCache.delete(key);
            
            // Remove from storage
            this.#storage.removeItem(cacheKey);
            
            this.#log('Cache removed:', key);
            return true;
        } catch (error) {
            this.#logger.error('Error removing from cache:', error);
            return false;
        }
    }

    async clear() {
        try {
            // Clear memory cache
            this.#memoryCache.clear();

            // Clear storage cache
            Object.keys(this.#storage)
                .filter(key => key.startsWith(this.#keyPrefix))
                .forEach(key => this.#storage.removeItem(key));

            this.#currentSize = 0;
            this.#logger.info('Cache cleared');
            return true;
        } catch (error) {
            this.#logger.error('Error clearing cache:', error);
            return false;
        }
    }

    async #cleanup() {
        try {
            const now = Date.now();
            let cleared = 0;

            // Check all cache items
            for (let i = 0; i < this.#storage.length; i++) {
                const key = this.#storage.key(i);
                if (!key.startsWith(this.#keyPrefix)) continue;

                const item = JSON.parse(this.#storage.getItem(key));
                if (item.expires <= now) {
                    this.#storage.removeItem(key);
                    this.#memoryCache.delete(key.slice(this.#keyPrefix.length));
                    cleared++;
                }
            }

            if (cleared > 0) {
                this.#calculateCurrentSize();
                this.#logger.info('Cache cleanup complete:', { itemsCleared: cleared });
            }

            return cleared;
        } catch (error) {
            this.#logger.error('Error during cache cleanup:', error);
            return 0;
        }
    }

    async #makeSpace(required) {
        const items = [];
        
        // Collect all items with their metadata
        for (let i = 0; i < this.#storage.length; i++) {
            const key = this.#storage.key(i);
            if (!key.startsWith(this.#keyPrefix)) continue;

            const item = JSON.parse(this.#storage.getItem(key));
            items.push({
                key,
                ...item
            });
        }

        // Sort by priority (lowest first) and then by age (oldest first)
        items.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.timestamp - b.timestamp;
        });

        // Remove items until we have enough space
        let freedSpace = 0;
        for (const item of items) {
            if (freedSpace >= required) break;
            
            await this.remove(item.key.slice(this.#keyPrefix.length));
            freedSpace += item.size;
        }

        return freedSpace >= required;
    }

    async #processValue(value, shouldCompress, decompress = false) {
        if (!shouldCompress || value.length <= this.#compressionThreshold) {
            return value;
        }

        try {
            if (decompress) {
                const decompressed = await this.#decompress(value);
                return JSON.parse(decompressed);
            } else {
                return await this.#compress(value);
            }
        } catch (error) {
            this.#logger.error('Compression/Decompression error:', error);
            return value;
        }
    }

    async #compress(value) {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const compressed = await this.#gzipCompress(data);
        return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    }

    async #decompress(value) {
        const data = Uint8Array.from(atob(value), c => c.charCodeAt(0));
        const decompressed = await this.#gzipDecompress(data);
        const decoder = new TextDecoder();
        return decoder.decode(decompressed);
    }

    async #gzipCompress(data) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        writer.write(data);
        writer.close();
        return new Response(stream.readable).arrayBuffer();
    }

    async #gzipDecompress(data) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        writer.write(data);
        writer.close();
        return new Response(stream.readable).arrayBuffer();
    }

    #formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unit = 0;
        
        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit++;
        }

        return `${size.toFixed(2)} ${units[unit]}`;
    }

    #log(message, data) {
        if (this.#debug) {
            this.#logger.debug(message, data);
        }
    }

    // Public utility methods
    getStats() {
        return {
            size: this.#currentSize,
            formattedSize: this.#formatSize(this.#currentSize),
            maxSize: this.#maxSize,
            itemCount: this.#memoryCache.size,
            compressionEnabled: true,
            compressionThreshold: this.#compressionThreshold
        };
    }

    setCacheSize(size) {
        this.#maxSize = size;
        this.#cleanup();
    }

    setCompressionThreshold(bytes) {
        this.#compressionThreshold = bytes;
    }

    keys() {
        return Array.from(this.#memoryCache.keys());
    }
}

// Create and export singleton instance
const cacheService = new CacheService();
export default cacheService;