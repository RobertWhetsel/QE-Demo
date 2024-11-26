import { User } from '../../models/user.js';
import logger from '../logger/LoggerService.js';
import navigation from './NavigationService.js';
import errorHandler from '../error/ErrorHandlerService.js';
import { ROLES } from '../../models/index.js';
import { checkPageAccess, PUBLIC_PAGES } from '../../models/database.js';
import paths from '../../../config/paths.js';

class NavigationGuardService {
    #logger;
    #isInitialized = false;
    #history = [];
    #maxHistorySize = 10;
    #defaultRedirect = 'login';
    #guardedRoutes = new Map();
    #navigationStack = [];

    constructor() {
        this.#logger = logger;
        this.#logger.info('NavigationGuardService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup navigation guards
            this.#setupDefaultGuards();
            
            // Setup navigation listeners
            this.#setupNavigationListeners();

            this.#isInitialized = true;
            this.#logger.info('NavigationGuardService initialized successfully');
        } catch (error) {
            this.#logger.error('NavigationGuardService initialization error:', error);
            errorHandler.handleError('Failed to initialize navigation guard');
        }
    }

    #setupDefaultGuards() {
        // Add authentication guard for protected routes
        this.addGuard('auth', (to) => {
            const isAuthenticated = User.isAuthenticated();
            const isPublicPage = PUBLIC_PAGES.includes(to);

            if (!isAuthenticated && !isPublicPage) {
                this.#logger.warn('Unauthorized access attempt:', { to });
                return {
                    redirect: 'login',
                    params: { returnUrl: to }
                };
            }

            return true;
        });

        // Add role-based guard
        this.addGuard('role', (to) => {
            if (PUBLIC_PAGES.includes(to)) return true;

            const userRole = User.getCurrentUserRole();
            const hasAccess = checkPageAccess(userRole, to);

            if (!hasAccess) {
                this.#logger.warn('Insufficient permissions:', { to, role: userRole });
                return {
                    redirect: 'unauthorized',
                    params: { requiredRole: userRole }
                };
            }

            return true;
        });
    }

    #setupNavigationListeners() {
        // Listen for navigation events
        window.addEventListener('popstate', (event) => {
            this.#handlePopState(event);
        });

        // Listen for clicks on navigation elements
        document.addEventListener('click', (event) => {
            this.#handleNavigationClick(event);
        });
    }

    #handlePopState(event) {
        const to = window.location.pathname;
        this.#checkGuards(to, true);
    }

    #handleNavigationClick(event) {
        // Check if click was on a navigation element
        const link = event.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href.startsWith('/') || href.startsWith(paths.BASE_URL)) {
            event.preventDefault();
            this.navigate(href);
        }
    }

    async navigate(to, options = {}) {
        const {
            replace = false,
            params = {},
            skipGuards = false
        } = options;

        try {
            if (!skipGuards) {
                const guardResult = await this.#checkGuards(to);
                if (guardResult !== true) {
                    this.#handleGuardRedirect(guardResult);
                    return false;
                }
            }

            // Add to navigation stack
            if (!replace) {
                this.#navigationStack.push(to);
            } else {
                this.#navigationStack.pop();
                this.#navigationStack.push(to);
            }

            // Add to history
            this.#addToHistory(to);

            // Perform navigation
            navigation.navigateTo(to, params);
            return true;

        } catch (error) {
            this.#logger.error('Navigation error:', error);
            errorHandler.handleError('Navigation failed');
            return false;
        }
    }

    async #checkGuards(to, isPopState = false) {
        for (const [name, guard] of this.#guardedRoutes) {
            try {
                const result = await guard(to, { isPopState });
                if (result !== true) {
                    this.#logger.info('Navigation guard blocked:', { guard: name, to });
                    return result;
                }
            } catch (error) {
                this.#logger.error('Guard error:', { guard: name, error });
                return {
                    redirect: this.#defaultRedirect,
                    params: { error: 'Navigation guard error' }
                };
            }
        }
        return true;
    }

    #handleGuardRedirect(guardResult) {
        const { redirect, params = {} } = guardResult;
        
        if (redirect) {
            this.navigate(paths.getPagePath(redirect), {
                params,
                skipGuards: true // Prevent guard loops
            });
        }
    }

    #addToHistory(path) {
        this.#history.unshift({
            path,
            timestamp: new Date().toISOString()
        });

        if (this.#history.length > this.#maxHistorySize) {
            this.#history.pop();
        }
    }

    // Public guard management methods
    addGuard(name, guardFn) {
        if (this.#guardedRoutes.has(name)) {
            this.#logger.warn('Overwriting existing guard:', name);
        }

        this.#guardedRoutes.set(name, guardFn);
        this.#logger.info('Guard added:', name);
    }

    removeGuard(name) {
        if (this.#guardedRoutes.has(name)) {
            this.#guardedRoutes.delete(name);
            this.#logger.info('Guard removed:', name);
            return true;
        }
        return false;
    }

    // Public navigation methods
    back() {
        if (this.#navigationStack.length > 1) {
            this.#navigationStack.pop(); // Remove current
            const previous = this.#navigationStack.pop(); // Get & remove previous
            return this.navigate(previous, { replace: true });
        }
        return false;
    }

    forward() {
        return window.history.forward();
    }

    // Public utility methods
    getGuards() {
        return Array.from(this.#guardedRoutes.keys());
    }

    getHistory() {
        return [...this.#history];
    }

    clearHistory() {
        this.#history = [];
    }

    // Configuration methods
    setDefaultRedirect(path) {
        this.#defaultRedirect = path;
    }

    setMaxHistorySize(size) {
        this.#maxHistorySize = size;
        // Trim history if needed
        while (this.#history.length > size) {
            this.#history.pop();
        }
    }

    // Helper methods
    isPublicRoute(path) {
        return PUBLIC_PAGES.includes(path);
    }

    hasAccess(path, role = User.getCurrentUserRole()) {
        return checkPageAccess(role, path);
    }
}

// Create and export singleton instance
const navigationGuard = new NavigationGuardService();
export default navigationGuard;