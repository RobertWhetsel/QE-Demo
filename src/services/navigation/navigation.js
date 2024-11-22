import { User } from '../../models/user.js';

// Centralized role configuration
const ROLES = {
    GENESIS_ADMIN: 'Genesis Admin',
    PLATFORM_ADMIN: 'Platform Admin',
    USER_ADMIN: 'User Admin',
    USER: 'User',
    GUEST: 'Guest'
};

// Role configuration object that defines all role-specific settings
const roleConfig = {
    [ROLES.GENESIS_ADMIN]: {
        defaultPage: '/src/views/pages/adminControlPanel.html',
        allowedPages: [
            '/src/views/pages/settings.html',
            '/src/views/pages/userProfile.html',
            '/src/views/pages/adminControlPanel.html',
            '/src/views/pages/platformAdmin.html',
            '/src/views/pages/genesisAdmin.html',
            '/src/views/pages/research.html',
            '/src/views/pages/researchDashboard.html'
        ]
    },
    [ROLES.PLATFORM_ADMIN]: {
        defaultPage: '/src/views/pages/platformAdmin.html',
        allowedPages: [
            '/src/views/pages/settings.html',
            '/src/views/pages/userProfile.html',
            '/src/views/pages/platformAdmin.html',
            '/src/views/pages/adminControlPanel.html',
            '/src/views/pages/research.html'
        ]
    },
    [ROLES.USER_ADMIN]: {
        defaultPage: '/src/views/pages/platformAdmin.html',
        allowedPages: [
            '/src/views/pages/settings.html',
            '/src/views/pages/userProfile.html',
            '/src/views/pages/platformAdmin.html',
            '/src/views/pages/adminControlPanel.html'
        ]
    },
    [ROLES.USER]: {
        defaultPage: '/src/views/pages/dashboard.html',
        allowedPages: [
            '/src/views/pages/settings.html',
            '/src/views/pages/userProfile.html',
            '/src/views/pages/dashboard.html',
            '/src/views/pages/volunteerDashboard.html',
            '/src/views/pages/tasks.html',
            '/src/views/pages/messages.html',
            '/src/views/pages/survey.html',
            '/src/views/pages/availableSurveys.html',
            '/src/views/pages/completedSurveys.html'
        ]
    },
    [ROLES.GUEST]: {
        defaultPage: '/src/views/pages/login.html',
        allowedPages: [
            '/src/views/pages/login.html',
            '/src/views/pages/forgot-password.html'
        ]
    }
};

class Navigation {
    constructor() {
        if (!Navigation.instance) {
            Navigation.instance = this;
        }
        return Navigation.instance;
    }

    async navigateTo(path) {
        try {
            console.log('Navigating to:', path);
            
            // Normalize path to include /src/ prefix if missing
            if (!path.startsWith('/src/')) {
                path = '/src' + (path.startsWith('/') ? '' : '/') + path;
            }

            // Special case for login page
            if (path.includes('login.html')) {
                window.location.href = path;
                return;
            }

            if (!User.isAuthenticated()) {
                console.warn('Navigation attempted without authentication');
                await this.handleUnauthenticatedAccess();
                return;
            }

            // Check if user has permission to access the page
            const userRole = User.getCurrentUserRole();
            console.log('Current user role:', userRole);
            
            if (!this.hasPermission(path, userRole)) {
                console.error('Access denied:', {
                    path,
                    userRole,
                    timestamp: new Date().toISOString()
                });
                await this.handleUnauthorizedAccess(path, userRole);
                return;
            }

            console.log('Navigation authorized to:', path);
            window.location.href = path;
        } catch (error) {
            console.error('Navigation error:', {
                message: error.message,
                stack: error.stack,
                path,
                timestamp: new Date().toISOString()
            });
            await this.handleNavigationError(error);
        }
    }

    hasPermission(path, role) {
        try {
            console.log('Checking permission for:', { path, role });
            
            const config = roleConfig[role];
            if (!config) {
                console.error('Invalid role configuration:', {
                    role,
                    availableRoles: Object.keys(roleConfig),
                    timestamp: new Date().toISOString()
                });
                return false;
            }

            const hasAccess = config.allowedPages.includes(path);
            console.log(`Access check result for ${role} to ${path}: ${hasAccess}`);
            return hasAccess;
        } catch (error) {
            console.error('Permission check error:', {
                message: error.message,
                stack: error.stack,
                path,
                role,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    async navigateToDefaultPage(role) {
        try {
            console.log('Navigating to default page for role:', role);
            
            const config = roleConfig[role];
            if (!config) {
                console.error('No default page configuration:', {
                    role,
                    timestamp: new Date().toISOString()
                });
                await this.handleInvalidRole(role);
                return;
            }

            window.location.href = config.defaultPage;
        } catch (error) {
            console.error('Default page navigation error:', {
                message: error.message,
                stack: error.stack,
                role,
                timestamp: new Date().toISOString()
            });
            await this.handleNavigationError(error);
        }
    }

    async handleInvalidRole(role) {
        console.error('Invalid role detected:', {
            role,
            timestamp: new Date().toISOString()
        });
        await this.logout();
    }

    async handleUnauthenticatedAccess() {
        console.warn('Unauthenticated access attempt');
        await User.clearAllStorage();
        window.location.href = '/src/views/pages/login.html';
    }

    async handleUnauthorizedAccess(path, role) {
        console.warn('Unauthorized access attempt:', {
            path,
            role,
            timestamp: new Date().toISOString()
        });
        await this.navigateToDefaultPage(role);
    }

    async handleNavigationError(error) {
        console.error('Critical navigation error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        await User.clearAllStorage();
        window.location.href = '/src/views/pages/login.html';
    }

    async logout() {
        try {
            console.log('Logging out...');
            await User.logout();
        } catch (error) {
            console.error('Logout error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            await User.clearAllStorage();
            window.location.href = '/src/views/pages/login.html';
        }
    }

    async exitApplication() {
        try {
            console.log('Exiting application...');
            await User.exitApplication();
        } catch (error) {
            console.error('Exit application error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            await User.clearAllStorage();
            window.location.href = '/src/views/pages/login.html';
        }
    }

    // Helper method to get all roles
    static getRoles() {
        return ROLES;
    }

    // Helper method to get role configuration
    static getRoleConfig() {
        return roleConfig;
    }
}

// Create and export singleton instance
const navigation = new Navigation();
export default navigation;
