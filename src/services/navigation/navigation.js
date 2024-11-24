import paths, { SITE_STATE } from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

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

            // Get resolved page path from paths.js
            const resolvedPath = paths.getPagePath(pageName);
            Logger.info('Resolved page path:', resolvedPath);
            
            if (!resolvedPath) {
                Logger.error('Page path not found:', pageName);
                throw new Error(`Page path not found for: ${pageName}`);
            }
            
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
            this.sidebarState = false;
            Logger.info('Closing sidebar');
            
            sidebar.classList.remove('sidebar--open');
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
