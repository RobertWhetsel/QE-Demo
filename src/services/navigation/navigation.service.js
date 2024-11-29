// Navigation service following MVC and modular patterns
class NavigationService {
    constructor() {
        if (NavigationService.instance) {
            return NavigationService.instance;
        }
        NavigationService.instance = this;
        
        // Initialize state
        this.currentPath = window.location.pathname;
        this.history = [];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Get paths configuration
            const { default: paths } = await import(window.env.PATHS_MODULE);
            this.paths = paths;

            // Set up event listeners
            window.addEventListener('popstate', this.handlePopState.bind(this));
            
            // Mark as initialized
            this.isInitialized = true;
            
            return true;
        } catch (error) {
            console.error('Navigation service initialization failed:', error);
            return false;
        }
    }

    handlePopState(event) {
        this.currentPath = window.location.pathname;
        this.notifyListeners();
    }

    async navigate(path) {
        if (!this.isInitialized) {
            throw new Error('Navigation service not initialized');
        }

        try {
            const resolvedPath = this.paths.resolve(path);
            
            // Update history
            this.history.push(this.currentPath);
            this.currentPath = resolvedPath;

            // Update browser history
            window.history.pushState({}, '', resolvedPath);
            
            // Notify listeners
            this.notifyListeners();
            
            return true;
        } catch (error) {
            console.error('Navigation failed:', error);
            return false;
        }
    }

    notifyListeners() {
        // Dispatch navigation event
        const event = new CustomEvent('navigation', {
            detail: {
                path: this.currentPath,
                previousPath: this.history[this.history.length - 1]
            }
        });
        document.dispatchEvent(event);
    }

    getCurrentPath() {
        return this.currentPath;
    }

    goBack() {
        if (this.history.length > 0) {
            const previousPath = this.history.pop();
            this.navigate(previousPath);
        }
    }
}

// Export singleton instance
export default new NavigationService();