import paths, { SITE_STATE } from '../../../config/paths.js';
import Logger from '../../utils/logging/LoggerService.js';
import { checkPageAccess } from '../../models/database.js';
import { User } from '../../models/user.js';

class NavigationService {
    #logger;
    #sidebarState = false;
    #history = [];
    #maxHistoryLength = 50;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('NavigationService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Set up history tracking
            this.#setupHistoryTracking();
            
            // Listen for popstate events
            this.#setupPopStateListener();

            this.#isInitialized = true;
            this.#logger.info('NavigationService initialized successfully');
        } catch (error) {
            this.#logger.error('NavigationService initialization error:', error);
            throw error;
        }
    }

    #setupHistoryTracking() {
        // Track initial page
        this.#addToHistory(window.location.pathname);

        // Set up navigation observer
        const observer = new MutationObserver(() => {
            this.#addToHistory(window.location.pathname);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    #setupPopStateListener() {
        window.addEventListener('popstate', (event) => {
            this.#logger.info('Handling popstate event:', event.state);
            if (event.state?.path) {
                this.navigateTo(event.state.path, false);
            }
        });
    }

    async navigateTo(path, addToHistory = true) {
        try {
            const resolvedPath = paths.resolve(path);
            this.#logger.info('Navigating to:', resolvedPath);

            // Check authorization for path
            if (!this.#checkAuthorization(resolvedPath)) {
                this.#logger.warn('Navigation denied: unauthorized');
                this.navigateToPage('login');
                return;
            }

            // Add to browser history if needed
            if (addToHistory) {
                window.history.pushState({ path: resolvedPath }, '', resolvedPath);
                this.#addToHistory(resolvedPath);
            }

            window.location.href = resolvedPath;
        } catch (error) {
            this.#logger.error('Navigation error:', error);
            throw error;
        }
    }

    navigateToPage(pageName) {
        try {
            this.#logger.info('Navigating to page:', pageName);
            
            // Handle root navigation specially
            if (pageName === 'root') {
                this.#logger.info('Navigating to root');
                this.navigateTo('/');
                return;
            }

            // Get resolved page path
            const resolvedPath = paths.getPagePath(pageName);
            this.#logger.info('Resolved page path:', resolvedPath);
            
            if (!resolvedPath) {
                throw new Error(`Page path not found for: ${pageName}`);
            }
            
            this.navigateTo(resolvedPath);
        } catch (error) {
            this.#logger.error('Page navigation error:', error);
            throw error;
        }
    }

    navigateToUtil(utilName) {
        try {
            this.#logger.info('Navigating to util:', utilName);
            const utilPath = paths.core.utils[utilName];
            
            if (!utilPath) {
                throw new Error(`Util path not found for: ${utilName}`);
            }

            const resolvedPath = paths.resolve(utilPath);
            this.#logger.info('Resolved util path:', resolvedPath);
            window.open(resolvedPath, '_blank');
        } catch (error) {
            this.#logger.error('Util navigation error:', error);
            throw error;
        }
    }

    #checkAuthorization(path) {
        const userRole = User.getCurrentUserRole();
        return checkPageAccess(userRole, path);
    }

    #addToHistory(path) {
        this.#history.unshift(path);
        if (this.#history.length > this.#maxHistoryLength) {
            this.#history.pop();
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.dashboard__content');
        
        if (sidebar) {
            this.#sidebarState = !this.#sidebarState;
            this.#logger.info('Toggling sidebar:', { state: this.#sidebarState });
            
            if (this.#sidebarState) {
                sidebar.classList.add('sidebar--open');
                if (content) content.classList.add('dashboard__content--shifted');
            } else {
                sidebar.classList.remove('sidebar--open');
                if (content) content.classList.remove('dashboard__content--shifted');
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.dashboard__content');
        
        if (sidebar) {
            this.#sidebarState = false;
            this.#logger.info('Closing sidebar');
            
            sidebar.classList.remove('sidebar--open');
            if (content) content.classList.remove('dashboard__content--shifted');
        }
    }

    goBack() {
        window.history.back();
    }

    reload() {
        window.location.reload();
    }

    // Public getters
    get sidebarState() {
        return this.#sidebarState;
    }

    get currentPath() {
        return window.location.pathname;
    }

    get navigationHistory() {
        return [...this.#history];
    }

    // Public utility methods
    isCurrentPage(pageName) {
        const pagePath = paths.getPagePath(pageName);
        return this.currentPath === pagePath;
    }

    getBaseUrl() {
        return SITE_STATE === 'dev' ? 'http://127.0.0.1:5500' : paths.BASE_URL;
    }
}

// Create and export singleton instance
const navigationService = new NavigationService();
export default navigationService;