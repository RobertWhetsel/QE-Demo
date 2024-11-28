import Logger from '../../utils/logging/LoggerService.js';
import config from '../../../config/client.js';

class NavigationService {
    #logger;
    #currentRoute;
    #routes = new Map();
    #debugMode = window.env.SITE_STATE === 'dev';
    #history = [];
    #maxHistoryLength = 50;

    constructor() {
        this.#logger = Logger;
        if (this.#debugMode) {
            this.#logger.info('NavigationService initializing');
        }
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup popstate listener
            window.addEventListener('popstate', (event) => {
                this.#handlePopState(event);
            });

            // Setup initial route
            this.#handleInitialRoute();

            if (this.#debugMode) {
                this.#logger.info('NavigationService initialized successfully');
            }
        } catch (error) {
            this.#logger.error('NavigationService initialization error:', error);
        }
    }

    #handleInitialRoute() {
        const path = window.location.pathname;
        this.#currentRoute = path;
        this.#addToHistory(path);
        this.#handleRoute(path);
    }

    #handlePopState(event) {
        const path = window.location.pathname;
        this.#currentRoute = path;
        this.#handleRoute(path);
    }

    #handleRoute(path) {
        const route = this.#routes.get(path);
        if (route) {
            try {
                route.handler();
                if (this.#debugMode) {
                    this.#logger.info(`Navigated to: ${path}`);
                }
            } catch (error) {
                this.#logger.error(`Error handling route ${path}:`, error);
            }
        } else {
            this.#logger.warn(`No handler found for route: ${path}`);
            this.navigateTo('/404');
        }
    }

    #addToHistory(path) {
        this.#history.unshift({
            path,
            timestamp: new Date().toISOString()
        });

        if (this.#history.length > this.#maxHistoryLength) {
            this.#history.pop();
        }
    }

    registerRoute(path, handler, options = {}) {
        this.#routes.set(path, { handler, options });
        
        if (this.#debugMode) {
            this.#logger.info(`Registered route: ${path}`);
        }
    }

    navigateTo(path, options = {}) {
        if (!this.#routes.has(path)) {
            this.#logger.warn(`Attempting to navigate to unregistered route: ${path}`);
            return false;
        }

        const { replace = false } = options;

        try {
            if (replace) {
                window.history.replaceState({}, '', path);
            } else {
                window.history.pushState({}, '', path);
            }

            this.#currentRoute = path;
            this.#addToHistory(path);
            this.#handleRoute(path);

            return true;
        } catch (error) {
            this.#logger.error(`Error navigating to ${path}:`, error);
            return false;
        }
    }

    back() {
        window.history.back();
    }

    forward() {
        window.history.forward();
    }

    getCurrentRoute() {
        return this.#currentRoute;
    }

    getHistory() {
        return [...this.#history];
    }

    clearHistory() {
        this.#history = [];
        if (this.#debugMode) {
            this.#logger.info('Navigation history cleared');
        }
    }

    isRegisteredRoute(path) {
        return this.#routes.has(path);
    }

    getRegisteredRoutes() {
        return Array.from(this.#routes.keys());
    }

    setMaxHistoryLength(length) {
        this.#maxHistoryLength = length;
        // Trim history if needed
        while (this.#history.length > length) {
            this.#history.pop();
        }
    }
}

// Create and export singleton instance
const navigation = new NavigationService();
export default navigation;
