import cache from '../cache/cache.service.js';

class RouterService {
    constructor() {
        this.routes = new Map();
        this.currentPath = '';
        this.loadingElement = null;
        window.addEventListener('popstate', () => this.loadRoute());
    }

    /**
     * Define a route with a path and its module path.
     * @param {string} path - The URL path for the route
     * @param {string} modulePath - Path to the module containing template and component
     */
    addRoute(path, modulePath) {
        this.routes.set(path, modulePath);
    }

    /**
     * Initialize the router, setup loading element, and load initial route.
     */
    initialize() {
        // Create loading element if it doesn't exist
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.innerHTML = '<div class="loading">Loading...</div>';
            document.body.appendChild(this.loadingElement);
        }
        this.loadRoute();
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.loadingElement.style.display = 'block';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.loadingElement.style.display = 'none';
    }

    /**
     * Navigate to a specified path in the app.
     * @param {string} path - The URL path to navigate to
     */
    navigateTo(path) {
        if (path !== this.currentPath) {
            history.pushState({}, '', path);
            this.loadRoute();
        }
    }

    /**
     * Dynamically import a module
     * @param {string} modulePath - Path to the module
     * @returns {Promise} - Module contents
     */
    async importModule(modulePath) {
        try {
            // Check cache first
            const cachedModule = cache.get(modulePath);
            if (cachedModule) {
                return cachedModule;
            }

            // If not in cache, dynamically import
            const module = await import(/* webpackChunkName: "[request]" */ modulePath);
            
            // Cache the result
            cache.set(modulePath, module);
            
            return module;
        } catch (error) {
            console.error(`Error importing module ${modulePath}:`, error);
            throw error;
        }
    }

    /**
     * Load the current route based on the browser's location
     */
    async loadRoute() {
        this.showLoading();
        this.currentPath = window.location.pathname;
        
        try {
            const modulePath = this.routes.get(this.currentPath);
            
            if (!modulePath) {
                this.showNotFound();
                return;
            }

            const module = await this.importModule(modulePath);
            const mainContent = document.querySelector('main');

            if (module.default) {
                // If module has a default export, use it as the template
                mainContent.innerHTML = typeof module.default === 'function' 
                    ? module.default() 
                    : module.default;
            }

            // Execute component initialization if it exists
            if (module.initialize) {
                await module.initialize();
            }

            // Preload adjacent routes
            this.preloadAdjacentRoutes();

        } catch (error) {
            console.error('Error loading route:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Preload adjacent routes for faster navigation
     */
    async preloadAdjacentRoutes() {
        const currentIndex = Array.from(this.routes.keys()).indexOf(this.currentPath);
        const routeEntries = Array.from(this.routes.entries());
        
        // Preload next and previous routes
        const adjacentIndices = [currentIndex - 1, currentIndex + 1];
        
        for (const index of adjacentIndices) {
            if (index >= 0 && index < routeEntries.length) {
                const [, modulePath] = routeEntries[index];
                // Only preload if not already in cache
                if (!cache.has(modulePath)) {
                    // Use low priority import
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = modulePath;
                    document.head.appendChild(link);
                }
            }
        }
    }

    /**
     * Show a default "not found" message for unknown routes
     */
    showNotFound() {
        document.querySelector('main').innerHTML = `
            <div class="error-page">
                <h1>404 - Page Not Found</h1>
                <p>The requested page could not be found.</p>
            </div>
        `;
    }

    /**
     * Show a general error message
     */
    showError() {
        document.querySelector('main').innerHTML = `
            <div class="error-page">
                <h1>Error</h1>
                <p>An error occurred while loading the page. Please try again.</p>
            </div>
        `;
    }
}

// Create router instance
const router = new RouterService();

// Example route registration with dynamic imports
router.addRoute('/', '/src/views/pages/home.js');
router.addRoute('/dashboard', '/src/views/pages/dashboard.js');
router.addRoute('/research', '/src/views/pages/research.js');

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => router.initialize());

export default router;
