import paths from '/config/paths.js';
import Logger from '/src/utils/logging/logger.js';

class Navigation {
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
            // Handle root navigation specially
            if (pageName === 'root') {
                Logger.info('Navigating to root');
                window.location.href = paths.resolve('/');
                return;
            }

            const resolvedPath = paths.resolve(paths.core.pages[pageName]);
            Logger.info('Navigating to page:', pageName, resolvedPath);
            window.location.href = resolvedPath;
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
        }
    }

    navigateToUtil(utilName) {
        try {
            const resolvedPath = paths.resolve(paths.core.utils[utilName]);
            Logger.info('Navigating to util:', utilName, resolvedPath);
            window.open(resolvedPath, '_blank');
        } catch (error) {
            Logger.error('Navigation error:', error);
            throw error;
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
