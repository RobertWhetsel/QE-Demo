import { ROLES } from './index.js';
import paths from '../../config/paths.js';
import Logger from '../utils/logging/logger.js';

// Page access configuration
const PAGE_ACCESS = {
    [paths.join(paths.pages, 'platformAdmin.html')]: [
        ROLES.GENESIS_ADMIN,
        ROLES.PLATFORM_ADMIN
    ],
    [paths.join(paths.pages, 'adminControlPanel.html')]: [
        ROLES.GENESIS_ADMIN
    ],
    [paths.join(paths.pages, 'genesisAdmin.html')]: [
        ROLES.GENESIS_ADMIN
    ],
    [paths.join(paths.pages, 'userProfile.html')]: [
        ROLES.GENESIS_ADMIN,
        ROLES.PLATFORM_ADMIN,
        ROLES.USER_ADMIN,
        ROLES.USER
    ],
    [paths.join(paths.pages, 'settings.html')]: [
        ROLES.GENESIS_ADMIN,
        ROLES.PLATFORM_ADMIN,
        ROLES.USER_ADMIN,
        ROLES.USER
    ],
    [paths.join(paths.pages, 'dashboard.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'volunteerDashboard.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'tasks.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'messages.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'survey.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'availableSurveys.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'completedSurveys.html')]: [
        ROLES.USER
    ],
    [paths.join(paths.pages, 'research.html')]: [
        ROLES.GENESIS_ADMIN,
        ROLES.PLATFORM_ADMIN
    ],
    [paths.join(paths.pages, 'researchDashboard.html')]: [
        ROLES.GENESIS_ADMIN
    ]
};

// Public pages that don't require authentication
const PUBLIC_PAGES = [
    paths.join(paths.pages, 'login.html'),
    paths.join(paths.pages, 'forgot-password.html')
];

/**
 * Check if user has access to current page
 * @param {string} role - User's role
 * @param {string} currentPage - Current page path
 * @returns {boolean} - Whether user has access
 */
function checkPageAccess(role, currentPage) {
    Logger.info('Checking page access:', { role, currentPage });

    // Allow access to public pages
    if (PUBLIC_PAGES.includes(currentPage)) {
        Logger.debug('Access granted: public page');
        return true;
    }

    // Genesis Admin has access to all pages
    if (role === ROLES.GENESIS_ADMIN) {
        Logger.debug('Access granted: Genesis Admin');
        return true;
    }

    // Check if page exists in access configuration
    if (!PAGE_ACCESS[currentPage]) {
        Logger.warn('Page not found in access configuration:', currentPage);
        return false;
    }

    // Check if user's role is allowed for this page
    const hasAccess = PAGE_ACCESS[currentPage].includes(role);
    Logger.info('Access check result:', { 
        role, 
        currentPage, 
        hasAccess,
        allowedRoles: PAGE_ACCESS[currentPage]
    });

    return hasAccess;
}

/**
 * Get allowed pages for a role
 * @param {string} role - User's role
 * @returns {string[]} - Array of page paths the user can access
 */
function getAllowedPages(role) {
    Logger.info('Getting allowed pages for role:', role);

    if (role === ROLES.GENESIS_ADMIN) {
        // Genesis Admin can access all pages except public pages
        const allPages = Object.keys(PAGE_ACCESS);
        Logger.debug('Genesis Admin allowed pages:', allPages);
        return allPages;
    }

    // For other roles, check PAGE_ACCESS configuration
    const allowedPages = Object.entries(PAGE_ACCESS)
        .filter(([_, roles]) => roles.includes(role))
        .map(([page]) => page);

    Logger.debug('Allowed pages:', { role, pages: allowedPages });
    return allowedPages;
}

export {
    checkPageAccess,
    getAllowedPages,
    PUBLIC_PAGES,
    PAGE_ACCESS
};
