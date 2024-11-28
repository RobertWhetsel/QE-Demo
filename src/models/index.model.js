import paths from '../../config/paths.js';

// Core Models
export { User } from './user.model.js';
export { DataService } from './dataService.model.js';

// Constants and Types
export const MODEL_TYPES = {
    USER: 'user',
    ADMIN: 'admin',
    SURVEY: 'survey',
    RESPONSE: 'response',
    PLATFORM: 'platform',
    GENESIS: 'genesis'
};

// Role Types
export const ROLES = {
    GENESIS_ADMIN: 'Genesis Admin',
    PLATFORM_ADMIN: 'Platform Admin',
    USER_ADMIN: 'User Admin',
    USER: 'User',
    GUEST: 'Guest'
};

// Data Paths
export const DATA_PATHS = {
    USERS: paths.join(paths.data, 'users.csv'),
    USERS_JSON: paths.join(paths.data, 'users.json'),
    CONFIG: paths.join(paths.data, 'config.json')
};

// Export database utilities
export { checkPageAccess, getAllowedPages, PUBLIC_PAGES } from './database.model.js';