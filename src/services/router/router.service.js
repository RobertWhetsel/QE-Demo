class RouterService {
    constructor() {
        this.routes = {};
        this.currentPath = '';
        window.addEventListener('popstate', () => this.loadRoute());
    }

    /**
     * Define a route with a path, template, and component function.
     * @param {string} path - The URL path for the route.
     * @param {(function|string)} template - The HTML template or a function that returns HTML.
     * @param {function} component - The function to execute when the route is navigated to.
     */
    addRoute(path, template, component) {
        this.routes[path] = { template, component };
    }

    /**
     * Initialize the router and load the initial route.
     */
    initialize() {
        this.loadRoute();
    }

    /**
     * Navigate to a specified path in the app.
     * @param {string} path - The URL path to navigate to.
     */
    navigateTo(path) {
        if (path !== this.currentPath) {
            history.pushState({}, '', path);
            this.loadRoute();
        }
    }

    /**
     * Load the current route based on the browser's location.
     */
    loadRoute() {
        this.currentPath = window.location.pathname;
        const route = this.routes[this.currentPath];
        if (route) {
            document.querySelector('main').innerHTML = typeof route.template === 'function' ? route.template() : route.template;
            route.component();
        } else {
            this.showNotFound();
        }
    }

    /**
     * Show a default "not found" message for unknown routes.
     */
    showNotFound() {
        document.querySelector('main').innerHTML = '<h1>404 - Page not found</h1>';
    }
}

// Example usage
const router = new RouterService();
router.addRoute('/', '<h1>Home</h1>', () => console.log('Home loaded'));
router.addRoute('/dashboard', '<h1>Dashboard</h1>', () => console.log('Dashboard loaded'));
router.addRoute('/research', '<h1>Research</h1>', () => console.log('Research loaded'));
// Add more routes as needed...

document.addEventListener('DOMContentLoaded', () => router.initialize());

export default router;