// Use proper path resolution from window.env
const { default: Logger } = await import(window.env.PathResolver.resolve(window.env.CORE_PATHS.utils.logging.logger));

class EventBusService {
    #subscribers = new Map();
    #logger;
    #eventHistory = [];
    #maxHistoryLength = 100;

    constructor() {
        if (EventBusService.instance) {
            return EventBusService.instance;
        }
        EventBusService.instance = this;
        this.#logger = Logger;
        this.#logger.info('EventBusService initialized');
    }

    // Core event methods
    subscribe(eventName, callback) {
        if (!this.#subscribers.has(eventName)) {
            this.#subscribers.set(eventName, new Set());
        }
        this.#subscribers.get(eventName).add(callback);
        this.#logger.debug(`Subscribed to event: ${eventName}`);
        return () => this.unsubscribe(eventName, callback);
    }

    unsubscribe(eventName, callback) {
        if (this.#subscribers.has(eventName)) {
            this.#subscribers.get(eventName).delete(callback);
            if (this.#subscribers.get(eventName).size === 0) {
                this.#subscribers.delete(eventName);
            }
            this.#logger.debug(`Unsubscribed from event: ${eventName}`);
        }
    }

    publish(eventName, data) {
        this.#logEvent(eventName, data);
        if (this.#subscribers.has(eventName)) {
            this.#subscribers.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.#logger.error(`Error in event handler for ${eventName}:`, error);
                }
            });
        }
    }

    // Style loading specific events
    publishStyleLoadSuccess(path) {
        this.publish('styleLoadSuccess', { path });
    }

    publishStyleLoadError(path, error) {
        this.publish('styleLoadError', { path, error });
    }

    publishStyleLoadProgress(loaded, total) {
        this.publish('styleLoadProgress', { loaded, total });
    }

    // Navigation events
    publishNavigationStart(route) {
        this.publish('navigationStart', { route });
    }

    publishNavigationEnd(route) {
        this.publish('navigationEnd', { route });
    }

    publishNavigationError(error) {
        this.publish('navigationError', { error });
    }

    // Auth events
    publishAuthStateChange(state) {
        this.publish('authStateChange', { state });
    }

    publishLoginSuccess(user) {
        this.publish('loginSuccess', { user });
    }

    publishLogoutSuccess() {
        this.publish('logoutSuccess', {});
    }

    // State management events
    publishStateChange(key, value) {
        this.publish('stateChange', { key, value });
    }

    publishThemeChange(theme) {
        this.publish('themeChange', { theme });
    }

    publishFontChange(font) {
        this.publish('fontChange', { font });
    }

    // Error events
    publishError(error) {
        this.publish('error', { error });
    }

    publishValidationError(errors) {
        this.publish('validationError', { errors });
    }

    // Data events
    publishDataUpdate(key, data) {
        this.publish('dataUpdate', { key, data });
    }

    publishDataError(key, error) {
        this.publish('dataError', { key, error });
    }

    // Private methods
    #logEvent(eventName, data) {
        const event = {
            eventName,
            data,
            timestamp: new Date().toISOString()
        };

        this.#eventHistory.unshift(event);
        if (this.#eventHistory.length > this.#maxHistoryLength) {
            this.#eventHistory.pop();
        }

        this.#logger.debug(`Event published: ${eventName}`, data);
    }

    // Public getters
    get eventHistory() {
        return [...this.#eventHistory];
    }

    get subscriberCount() {
        return Array.from(this.#subscribers.values())
            .reduce((total, subscribers) => total + subscribers.size, 0);
    }

    get eventTypes() {
        return Array.from(this.#subscribers.keys());
    }
}

// Create and export singleton instance
const EventBus = new EventBusService();
export { EventBus };
