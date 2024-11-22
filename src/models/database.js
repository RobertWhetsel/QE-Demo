// Database access control constants
const CONSTANTS = {
    ROLES: {
        GENESIS: 'Genesis Admin',
        PLATFORM: 'Platform Admin',
        USER: 'User Admin'
    }
};

// Check if user has access to current page
function checkPageAccess(role, currentPage) {
    // Genesis Admin has access to all pages
    if (role === CONSTANTS.ROLES.GENESIS) {
        return true;
    }

    // Platform Admin pages access control
    if (currentPage === 'platformAdmin.html' && role !== CONSTANTS.ROLES.PLATFORM) {
        return false;
    }

    // User Admin pages access control
    if (currentPage === 'userProfile.html' && role !== CONSTANTS.ROLES.USER) {
        return false;
    }

    return true;
}

// Export database constants and functions
export { CONSTANTS, checkPageAccess };
