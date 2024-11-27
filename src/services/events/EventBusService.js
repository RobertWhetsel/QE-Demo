import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

class EventBusService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #subscribers = new Map();
    #eventHistory = [];
    #maxHistorySize = 100;
    #debugMode = SITE_STATE === 'dev';
    #reservedEvents = new Set([
        'userDataReady',
        'appInitialized',
        'showNotification',
        'showError',
        'clearErrors'
    ]);

    constructor() {
        if (EventBusService.instance) {
            return EventBusService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('EventBusService initializing');
        this.#initialize();
        EventBusService.instance = this;
    }

    async #initialize() {
        try {
            // Setup global error handling for events
            this.#setupErrorHandling();
            
            // Initialize event history
            this.#loadEventHistory();

            this.#isInitialized = true;
            this.#logger.info('EventBusService initialized successfully');
        } catch (error) {
            this.#logger.error('EventBusService initialization error:', error);
            throw error;
        }
    }

    #setupErrorHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason._isEventError) {
                this.#handleEventError(event.reason);
                event.preventDefault();
            }
        });
    }

    #loadEventHistory() {
        if (this.#debugMode) {
            const savedHistory = localStorage.getItem('eventHistory');
            if (savedHistory) {
                this.#eventHistory = JSON.parse(savedHistory);
            }
        }
    }

    subscribe(eventType, callback, options = {}) {
        try {
            const {
                once = false,
                priority = 0,
                async = false
            } = options;

            if (!eventType || typeof callback !== 'function') {
                throw new Error('Invalid subscription parameters');
            }

            if (!this.#subscribers.has(eventType)) {
                this.#subscribers.set(eventType, new Set());
            }

            const subscriber = {
                callback,
                once,
                priority,
                async
            };

            this.#subscribers.get(eventType).add(subscriber);

            this.#logger.debug('Event subscription added:', {
                eventType,
                subscriberCount: this.#subscribers.get(eventType).size
            });

            // Return unsubscribe function
            return () => this.unsubscribe(eventType, callback);

        } catch (error) {
            this.#logger.error('Subscription error:', error);
            throw error;
        }
    }

    unsubscribe(eventType, callback) {
        try {
            if (!this.#subscribers.has(eventType)) {
                return false;
            }

            const subscribers = this.#subscribers.get(eventType);
            const subscriber = Array.from(subscribers)
                .find(s => s.callback === callback);

            if (subscriber) {
                subscribers.delete(subscriber);
                
                // Clean up if no subscribers left
                if (subscribers.size === 0) {
                    this.#subscribers.delete(eventType);
                }

                this.#logger.debug('Event subscription removed:', { eventType });
                return true;
            }

            return false;

        } catch (error) {
            this.#logger.error('Unsubscribe error:', error);
            throw error;
        }
    }

    async publish(eventType, data = {}) {
        try {
            if (!this.#isInitialized) {
                throw new Error('EventBus not initialized');
            }

            this.#logger.debug('Publishing event:', { eventType, data });

            // Add event to history
            this.#addToHistory(eventType, data);

            if (!this.#subscribers.has(eventType)) {
                return;
            }

            const subscribers = Array.from(this.#subscribers.get(eventType))
                .sort((a, b) => b.priority - a.priority);

            const results = [];

            // Process subscribers
            for (const subscriber of subscribers) {
                try {
                    if (subscriber.async) {
                        results.push(subscriber.callback(data));
                    } else {
                        results.push(Promise.resolve(subscriber.callback(data)));
                    }

                    if (subscriber.once) {
                        this.unsubscribe(eventType, subscriber.callback);
                    }
                } catch (error) {
                    this.#handleEventError(error, eventType, subscriber);
                }
            }

            // Wait for all async subscribers
            await Promise.all(results);

            this.#logger.debug('Event published successfully:', { eventType });

        } catch (error) {
            this.#logger.error('Publish error:', error);
            throw error;
        }
    }

    #addToHistory(eventType, data) {
        if (!this.#debugMode) return;

        const event = {
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        };

        this.#eventHistory.unshift(event);

        // Trim history if needed
        if (this.#eventHistory.length > this.#maxHistorySize) {
            this.#eventHistory = this.#eventHistory.slice(0, this.#maxHistorySize);
        }

        // Save to localStorage in debug mode
        if (this.#debugMode) {
            localStorage.setItem('eventHistory', JSON.stringify(this.#eventHistory));
        }
    }

    #handleEventError(error, eventType = '', subscriber = null) {
        const eventError = new Error(`Event error: ${error.message}`);
        eventError._isEventError = true;
        eventError.originalError = error;
        eventError.eventType = eventType;
        eventError.subscriber = subscriber;

        this.#logger.error('Event handling error:', eventError);

        // Publish error event
        this.publish('eventError', {
            error: eventError,
            eventType,
            timestamp: new Date().toISOString()
        }).catch(e => {
            this.#logger.error('Error publishing error event:', e);
        });
    }

    // Public utility methods
    getEventTypes() {
        return Array.from(this.#subscribers.keys());
    }

    getSubscriberCount(eventType) {
        return this.#subscribers.get(eventType)?.size || 0;
    }

    getEventHistory() {
        return [...this.#eventHistory];
    }

    clearHistory() {
        this.#eventHistory = [];
        if (this.#debugMode) {
            localStorage.removeItem('eventHistory');
        }
    }

    isReservedEvent(eventType) {
        return this.#reservedEvents.has(eventType);
    }

    static getInstance() {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }
}

// Create and export singleton instance
const eventBusService = EventBusService.getInstance();
export default eventBusService;