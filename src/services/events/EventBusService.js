import logger from '../logger/LoggerService.js';

class EventBusService {
    #events = {};
    #debugMode = window.env.SITE_STATE === 'dev';
    #maxListeners = 10;
    #logger;

    constructor() {
        this.#logger = logger;
        if (this.#debugMode) {
            this.#logger.info('EventBusService initializing');
        }
    }

    on(event, callback) {
        if (!this.#events[event]) {
            this.#events[event] = [];
        }

        if (this.#events[event].length >= this.#maxListeners) {
            const warning = `Warning: Event '${event}' has exceeded ${this.#maxListeners} listeners`;
            this.#logger.warn(warning);
            if (this.#debugMode) {
                console.warn(warning);
            }
        }

        this.#events[event].push(callback);

        if (this.#debugMode) {
            this.#logger.debug(`Added listener for event: ${event}`);
        }

        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.#events[event]) return;

        const index = this.#events[event].indexOf(callback);
        if (index > -1) {
            this.#events[event].splice(index, 1);
            if (this.#debugMode) {
                this.#logger.debug(`Removed listener for event: ${event}`);
            }
        }

        if (this.#events[event].length === 0) {
            delete this.#events[event];
        }
    }

    once(event, callback) {
        const onceCallback = (...args) => {
            this.off(event, onceCallback);
            callback.apply(this, args);
        };
        return this.on(event, onceCallback);
    }

    emit(event, data) {
        if (!this.#events[event]) return;

        if (this.#debugMode) {
            this.#logger.debug(`Emitting event: ${event}`, data);
        }

        this.#events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.#logger.error(`Error in event listener for '${event}':`, error);
            }
        });
    }

    removeAllListeners(event) {
        if (event) {
            delete this.#events[event];
            if (this.#debugMode) {
                this.#logger.debug(`Removed all listeners for event: ${event}`);
            }
        } else {
            this.#events = {};
            if (this.#debugMode) {
                this.#logger.debug('Removed all event listeners');
            }
        }
    }

    listenerCount(event) {
        return this.#events[event]?.length || 0;
    }

    eventNames() {
        return Object.keys(this.#events);
    }

    setMaxListeners(n) {
        this.#maxListeners = n;
        if (this.#debugMode) {
            this.#logger.debug(`Max listeners set to: ${n}`);
        }
    }

    getMaxListeners() {
        return this.#maxListeners;
    }
}

// Create and export singleton instance
const eventBus = new EventBusService();
export default eventBus;
