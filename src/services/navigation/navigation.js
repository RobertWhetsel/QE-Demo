import paths, { SITE_STATE } from '/config/paths.js';
import Logger from '/src/utils/logging/logger.js';

class Navigation {
    constructor() {
        this.sidebarState = false; // Closed by default
        Logger.info('Navigation service initialized');
    }

    navigateTo(path) {
        try {
            const resolvedPath = paths.resolve(path);
            Logger.info('Navigating to:', resolvedPath);
            window.location.href = resolvedPath;
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
        }
    }

    navigateToPage(pageName) {
        try {
            Logger.info('Navigating to page:', pageName);
            // Handle root navigation specially
            if (pageName === 'root') {
                Logger.info('Navigating to root');
                window.location.href = paths.resolve('/');
                return;
            }

            // Get page path from paths.js
            const pagePath = paths.core.pages[pageName];
            Logger.info('Page path from config:', pagePath);
            
            if (!pagePath) {
                Logger.error('Page path not found:', pageName);
                throw new Error(`Page path not found for: ${pageName}`);
            }

            // For dev environment, ensure we're using the full URL
            const resolvedPath = SITE_STATE === 'dev' 
                ? paths.resolve(pagePath)
                : pagePath;
            Logger.info('Resolved page path:', resolvedPath);
            
            // Navigate to the page
            window.location.href = resolvedPath;
            
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
        }
    }

    navigateToUtil(utilName) {
        try {
            Logger.info('Navigating to util:', utilName);
            const utilPath = paths.core.utils[utilName];
            if (!utilPath) {
                throw new Error(`Util path not found for: ${utilName}`);
            }

            const resolvedPath = paths.resolve(utilPath);
            Logger.info('Resolved util path:', resolvedPath);
            window.open(resolvedPath, '_blank');
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.dashboard__content');
        
        if (sidebar) {
            this.sidebarState = !this.sidebarState;
            Logger.info('Toggling sidebar:', { state: this.sidebarState });
            
            if (this.sidebarState) {
                sidebar.classList.add('is-open');
                if (content) content.classList.add('dashboard__content--shifted');
            } else {
                sidebar.classList.remove('is-open');
                if (content) content.classList.remove('dashboard__content--shifted');
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.dashboard__content');
        
        if (sidebar) {
            this.sidebarState = false;
            Logger.info('Closing sidebar');
            
            sidebar.classList.remove('is-open');
            if (content) content.classList.remove('dashboard__content--shifted');
        }
    }

    navigateToRoot() {
        try {
            Logger.info('Navigating to root');
            window.location.href = paths.resolve('/');
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
        }
    }

    reload() {
        window.location.reload();
    }

    goBack() {
        window.history.back();
    }
}

const navigation = new Navigation();
export default navigation;
