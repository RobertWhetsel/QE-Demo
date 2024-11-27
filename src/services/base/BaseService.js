import Logger from '../../utils/logging/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

export class BaseService {
    static #instances = new Map();
    #logger;
    #isInitialized = false;
    #serviceName;
    #subscribers = new Map();
    #debugMode = SITE_STATE === 'dev';

    constructor(serviceName) {
        // Ensure singleton pattern per service name
        if (BaseService.#instances.has(serviceName)) {
            return BaseService.#instances.get(serviceName);
        }

        this.#serviceName = serviceName;
        this.#logger = Logger;
        this.#logger.info(`${this.#serviceName} initializing`);

        // Initialize the service
        this.#initialize().catch(error => {
            this.#logger.error(`${this.#serviceName} initialization error:`, error);
            throw error;
        });

        // Store instance
        BaseService.#instances.set(serviceName, this);
    }

    async #initialize() {
        try {
            // Setup error handling
            this.#setupErrorHandling();
            
            // Initialize service-specific functionality
            if (this.initializeService) {
                await this.initializeService();
            }

            this.#isInitialized = true;
            this.#logger.info(`${this.#serviceName} initialized successfully`);
        } catch (error) {
            this.#logger.error(`${this.#serviceName} initialization error:`, error);
            throw error;
        }
    }

    #setupErrorHandling() {
        // Setup global error handler for service
        process.on('unhandledRejection', (reason, promise) => {
            this.#logger.error('Unhandled Rejection at:', {
                promise,
                reason,
                service: this.#serviceName
            });
        });
    }

    // Protected methods for child services
    subscribe(eventType, callback) {
        if (!this.#subscribers.has(eventType)) {
            this.#subscribers.set(eventType, new Set());
        }
        this.#subscribers.get(eventType).add(callback);

        // Return unsubscribe function
        return () => this.unsubscribe(eventType, callback);
    }

    unsubscribe(eventType, callback) {
        const subscribers = this.#subscribers.get(eventType);
        if (subscribers) {
            subscribers.delete(callback);
            if (subscribers.size === 0) {
                this.#subscribers.delete(eventType);
            }
        }
    }

    notify(eventType, data) {
        const subscribers = this.#subscribers.get(eventType);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.#logger.error('Error in subscriber callback:', {
                        error,
                        eventType,
                        service: this.#serviceName
                    });
                }
            });
        }
    }

    log(level, message, ...args) {
        if (!['info', 'warn', 'error', 'debug'].includes(level)) {
            level = 'info';
        }
        this.#logger[level](`[${this.#serviceName}] ${message}`, ...args);
    }

    handleError(error, context = {}) {
        this.#logger.error(`${this.#serviceName} error:`, {
            error,
            context,
            timestamp: new Date().toISOString()
        });

        // Notify subscribers of error
        this.notify('error', { error, context });
    }

    validateConfig(config, requiredFields = []) {
        const missingFields = requiredFields.filter(field => !config.hasOwnProperty(field));
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        return true;
    }

    // Debug utilities
    debugLog(...args) {
        if (this.#debugMode) {
            this.#logger.debug(`[${this.#serviceName}]`, ...args);
        }
    }

    // Public getter methods
    get serviceName() {
        return this.#serviceName;
    }

    get isInitialized() {
        return this.#isInitialized;
    }

    get isDebugMode() {
        return this.#debugMode;
    }

    // Optional lifecycle methods for child services to implement
    async initializeService() {}
    async start() {}
    async stop() {}
    async reset() {}
    async healthCheck() {
        return {
            status: 'healthy',
            service: this.#serviceName,
            initialized: this.#isInitialized,
            timestamp: new Date().toISOString()
        };
    }

    // Static method to get service instance
    static getInstance(serviceName) {
        if (!BaseService.#instances.has(serviceName)) {
            new this(serviceName);
        }
        return BaseService.#instances.get(serviceName);
    }

    // Static method to reset all instances (mainly for testing)
    static resetInstances() {
        BaseService.#instances.clear();
    }
}