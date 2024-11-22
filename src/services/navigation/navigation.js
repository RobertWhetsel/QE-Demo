import { User } from '../../models/user.js';

class Navigation {
    constructor() {
        if (!Navigation.instance) {
            Navigation.instance = this;
        }
        return Navigation.instance;
    }

    navigateTo(path) {
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
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/src/views/pages/login.html';
            return;
        }

        // Check if user has permission to access the page
        const userRole = User.getCurrentUserRole();
        console.log('Current user role:', userRole);
        
        if (!this.hasPermission(path, userRole)) {
            console.log('User does not have permission to access:', path);
            this.navigateToDefaultPage(userRole);
            return;
        }

        console.log('Navigation authorized to:', path);
        window.location.href = path;
    }

    hasPermission(path, role) {
        console.log('Checking permission for:', { path, role });
        
        // Common pages accessible to all authenticated users
        const commonPages = [
            '/src/views/pages/settings.html',
            '/src/views/pages/userProfile.html'
        ];

        // Define role-based access rules
        const accessRules = {
            'Genesis Admin': [
                ...commonPages,
                '/src/views/pages/adminControlPanel.html',
                '/src/views/pages/platformAdmin.html',
                '/src/views/pages/genesisAdmin.html',
                '/src/views/pages/research.html',
                '/src/views/pages/researchDashboard.html'
            ],
            'Platform Admin': [
                ...commonPages,
                '/src/views/pages/platformAdmin.html',
                '/src/views/pages/adminControlPanel.html',
                '/src/views/pages/research.html'
            ],
            'User Admin': [
                ...commonPages,
                '/src/views/pages/platformAdmin.html',
                '/src/views/pages/adminControlPanel.html'
            ],
            'User': [
                ...commonPages,
                '/src/views/pages/dashboard.html',
                '/src/views/pages/volunteerDashboard.html',
                '/src/views/pages/tasks.html',
                '/src/views/pages/messages.html',
                '/src/views/pages/survey.html',
                '/src/views/pages/availableSurveys.html',
                '/src/views/pages/completedSurveys.html'
            ],
            'Guest': [
                '/src/views/pages/login.html',
                '/src/views/pages/forgot-password.html'
            ]
        };

        // Check if role exists and path is allowed
        if (!accessRules[role]) {
            console.error('Invalid role:', role);
            return false;
        }

        const hasAccess = accessRules[role].includes(path);
        console.log('Access check result:', hasAccess);
        return hasAccess;
    }

    navigateToDefaultPage(role) {
        console.log('Navigating to default page for role:', role);
        
        switch (role) {
            case 'Genesis Admin':
                window.location.href = '/src/views/pages/adminControlPanel.html';
                break;
            case 'Platform Admin':
            case 'User Admin':
                window.location.href = '/src/views/pages/platformAdmin.html';
                break;
            case 'User':
                window.location.href = '/src/views/pages/dashboard.html';
                break;
            case 'Guest':
                window.location.href = '/src/views/pages/login.html';
                break;
            default:
                console.log('No default page for role:', role);
                this.logout();
        }
    }

    logout() {
        console.log('Logging out...');
        User.logout(); // This will redirect to login without clearing storage
    }

    exitApplication() {
        console.log('Exiting application...');
        User.exitApplication(); // This will clear storage and redirect to login
    }
}

// Create and export singleton instance
const navigation = new Navigation();
export default navigation;
