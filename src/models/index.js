import paths from '../../config/paths.js';

// Data Models
export { DataService } from './dataservice.js';

// Database Models
export { Database } from './database.js';

// User Model
export { User } from './user.js';

// Constants and Types
export const DATA_PATHS = {
    USERS: paths.join(paths.data, 'users.csv'),
    USERS_JSON: paths.join(paths.data, 'users.json'),
    CONFIG: paths.join(paths.data, 'config.json')
};

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

// Data Validation Schemas
export const SCHEMAS = {
    USER: {
        required: ['username', 'email', 'password', 'role'],
        properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { 
                type: 'string', 
                enum: Object.values(ROLES)
            },
            status: {
                type: 'string',
                enum: ['active', 'inactive', 'pending', 'suspended']
            }
        }
    },
    SURVEY: {
        required: ['title', 'questions', 'createdBy'],
        properties: {
            title: { type: 'string', minLength: 1 },
            questions: { type: 'array', minItems: 1 },
            createdBy: { type: 'string' },
            status: {
                type: 'string',
                enum: ['draft', 'active', 'closed', 'archived']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    },
    RESPONSE: {
        required: ['surveyId', 'userId', 'answers'],
        properties: {
            surveyId: { type: 'string' },
            userId: { type: 'string' },
            answers: { type: 'array' },
            submittedAt: { type: 'string', format: 'date-time' }
        }
    }
};

// Model Status Types
export const STATUS = {
    USER: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        PENDING: 'pending',
        SUSPENDED: 'suspended'
    },
    SURVEY: {
        DRAFT: 'draft',
        ACTIVE: 'active',
        CLOSED: 'closed',
        ARCHIVED: 'archived'
    }
};
