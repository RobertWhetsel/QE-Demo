import logger from '../logger/LoggerService.js';
import errorHandler from '../error/ErrorHandlerService.js';
import authService from '../auth/AuthService.js';
import navigationGuard from '../navigation/NavigationGuardService.js';
import paths from '../../../config/paths.js';
import { PUBLIC_PAGES } from '../../models/database.js';

class RouterService {
    #logger;
    #isInitialized = false;
    #routes = new Map();
    #currentRoute = null;
    #history = [];
    #maxHistorySize = 50;
    #subscribers = new Set();
    #defaultRoute = 'login';
    #notFoundRoute = '404';
    #loadingRoute = 'loading';
    #params = new Map();
    #queryParams = new URLSearchParams();
    #middlewares = [];
    #isNavigating = false;

    constructor() {
        this.#logger = logger;
        this.#logger.info('RouterService initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Setup routes
            this.#setupRoutes();
            
            // Setup history management
            this.#setupHistoryManagement();

            // Setup navigation listeners
            this.#setupNavigationListeners();

            // Initialize current route
            await this.#initializeCurrentRoute();

            this.#isInitialized = true;
            this.#logger.info('RouterService initialized successfully');
        } catch (error) {
            this.#logger.error('RouterService initialization error:', error);
            errorHandler.handleError('Failed to initialize router');
        }
    }

    #setupRoutes() {
        // Core routes
        this.#addRoute('login', {
            path: paths.getPagePath('login'),
            component: 'login',
            isPublic: true
        });

        this.#addRoute('admin', {
            path: paths.getPagePath('adminControlPanel'),
            component: 'adminControlPanel',
            middleware: ['auth', 'admin']
        });

        this.#addRoute('platform', {
            path: paths.getPagePath('platformAdmin'),
            component: 'platformAdmin',
            middleware: ['auth', 'platform']
        });

        this.#addRoute('profile', {
            path: paths.getPagePath('userProfile'),
            component: 'userProfile',
            middleware: ['auth']
        });

        this.#addRoute('settings', {
            path: paths.getPagePath('settings'),
            component: 'settings',
            middleware: ['auth']
        });

        // Error routes
        this.#addRoute('404', {
            path: paths.getPagePath('notFound'),
            component: 'notFound',
            isPublic: true
        });

        this.#addRoute('loading', {
            path: paths.getPagePath('loading'),
            component: 'loading',
            isPublic: true
        });
    }

    #setupHistoryManagement() {
        window.addEventListener('popstate', (event) => {
            this.#handlePopState(event);
        });
    }

    #setupNavigationListeners() {
        document.addEventListener('click', (event) => {
            this.#handleNavigationClick(event);
        });
    }

    async #initializeCurrentRoute() {
        const path = window.location.pathname;
        const route = this.#findRouteByPath(path);

        if (route) {
            await this.#navigateToRoute(route, false);
        } else {
            await this.#navigateToRoute(this.#routes.get(this.#notFoundRoute));
        }
    }

    #addRoute(name, config) {
        this.#routes.set(name, {
            name,
            ...config,
            params: this.#extractRouteParams(config.path)
        });
    }

    #extractRouteParams(path) {
        const params = [];
        const segments = path.split('/');
        segments.forEach(segment => {
            if (segment.startsWith(':')) {
                params.push(segment.slice(1));
            }
        });
        return params;
    }

    #findRouteByPath(path) {
        for (const [_, route] of this.#routes) {
            if (this.#matchRoute(route, path)) {
                return route;
            }
        }
        return null;
    }

    #matchRoute(route, path) {
        const routeSegments = route.path.split('/');
        const pathSegments = path.split('/');

        if (routeSegments.length !== pathSegments.length) {
            return false;
        }

        const params = new Map();

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const pathSegment = pathSegments[i];

            if (routeSegment.startsWith(':')) {
                params.set(routeSegment.slice(1), pathSegment);
            } else if (routeSegment !== pathSegment) {
                return false;
            }
        }

        this.#params = params;
        return true;
    }

    async #navigateToRoute(route, addToHistory = true) {
        if (!route || this.#isNavigating) return false;

        this.#isNavigating = true;
        this.#logger.info('Navigating to route:', route.name);

        try {
            // Check authorization
            if (!route.isPublic && !authService.isAuthenticated()) {
                this.#logger.warn('Unauthorized access attempt:', route.path);
                await this.navigate(this.#defaultRoute, { 
                    query: { returnUrl: route.path }
                });
                return false;
            }

            // Run middleware
            if (route.middleware) {
                for (const middleware of route.middleware) {
                    const result = await this.#runMiddleware(middleware, route);
                    if (!result) {
                        this.#logger.warn('Middleware blocked navigation:', middleware);
                        return false;
                    }
                }
            }

            // Update navigation guard
            navigationGuard.setCurrentRoute(route.name);

            // Show loading state
            this.#showLoading(true);

            // Load component
            await this.#loadComponent(route.component);

            // Update URL
            if (addToHistory) {
                const url = this.#buildUrl(route);
                window.history.pushState({ route: route.name }, '', url);
                this.#addToHistory(route);
            }

            // Update current route
            this.#currentRoute = route;

            // Notify subscribers
            this.#notifySubscribers();

            return true;

        } catch (error) {
            this.#logger.error('Navigation error:', error);
            errorHandler.handleError('Navigation failed');
            return false;

        } finally {
            this.#showLoading(false);
            this.#isNavigating = false;
        }
    }

    async #loadComponent(componentName) {
        try {
            const component = await import(
                paths.getModulePath(`controllers/${componentName}`)
            );
            return component.default;
        } catch (error) {
            this.#logger.error('Component loading error:', error);
            throw error;
        }
    }

    #buildUrl(route) {
        let url = route.path;

        // Replace route params
        this.#params.forEach((value, key) => {
            url = url.replace(`:${key}`, value);
        });

        // Add query params
        const query = this.#queryParams.toString();
        if (query) {
            url += `?${query}`;
        }

        return url;
    }

    #showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    async #runMiddleware(middleware, route) {
        const handler = this.#middlewares.find(m => m.name === middleware);
        if (!handler) {
            this.#logger.warn('Middleware not found:', middleware);
            return true;
        }

        try {
            return await handler.handle(route);
        } catch (error) {
            this.#logger.error('Middleware error:', error);
            return false;
        }
    }

    #handlePopState(event) {
        if (event.state?.route) {
            const route = this.#routes.get(event.state.route);
            if (route) {
                this.#navigateToRoute(route, false);
            }
        }
    }

    #handleNavigationClick(event) {
        const link = event.target.closest('a[data-route]');
        if (!link) return;

        event.preventDefault();
        const routeName = link.dataset.route;
        this.navigate(routeName);
    }

    #addToHistory(route) {
        this.#history.unshift({
            route: route.name,
            timestamp: new Date().toISOString()
        });

        if (this.#history.length > this.#maxHistorySize) {
            this.#history.pop();
        }
    }

    #notifySubscribers() {
        this.#subscribers.forEach(callback => {
            try {
                callback({
                    route: this.#currentRoute,
                    params: Object.fromEntries(this.#params),
                    query: Object.fromEntries(this.#queryParams)
                });
            } catch (error) {
                this.#logger.error('Subscriber notification error:', error);
            }
        });
    }

    // Public navigation methods
    async navigate(routeName, options = {}) {
        const {
            params = {},
            query = {},
            replace = false
        } = options;

        const route = this.#routes.get(routeName);
        if (!route) {
            this.#logger.error('Route not found:', routeName);
            return false;
        }

        // Set params
        this.#params = new Map(Object.entries(params));

        // Set query params
        this.#queryParams = new URLSearchParams(query);

        return this.#navigateToRoute(route, !replace);
    }

    back() {
        window.history.back();
    }

    forward() {
        window.history.forward();
    }

    // Public subscription method
    subscribe(callback) {
        this.#subscribers.add(callback);
        if (this.#currentRoute) {
            callback({
                route: this.#currentRoute,
                params: Object.fromEntries(this.#params),
                query: Object.fromEntries(this.#queryParams)
            });
        }
        return () => this.#subscribers.delete(callback);
    }

    // Public middleware management
    addMiddleware(name, handler) {
        this.#middlewares.push({ name, handle: handler });
    }

    removeMiddleware(name) {
        const index = this.#middlewares.findIndex(m => m.name === name);
        if (index !== -1) {
            this.#middlewares.splice(index, 1);
            return true;
        }
        return false;
    }

    // Public route management
    addRoutes(routes) {
        Object.entries(routes).forEach(([name, config]) => {
            this.#addRoute(name, config);
        });
    }

    // Public utility methods
    getCurrentRoute() {
        return this.#currentRoute ? { ...this.#currentRoute } : null;
    }

    getParams() {
        return Object.fromEntries(this.#params);
    }

    getQuery() {
        return Object.fromEntries(this.#queryParams);
    }

    getHistory() {
        return [...this.#history];
    }
}

// Create and export singleton instance
const routerService = new RouterService();
export default routerService;