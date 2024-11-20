// Data Models
export { DataService } from './dataservice.js';

// Database Models
export { Database } from './database.js';

// Constants and Types
export const DATA_PATHS = {
    USERS: '/src/models/data/users.csv',
    CONFIG: '/src/models/data/config.json'
};

export const MODEL_TYPES = {
    USER: 'user',
    ADMIN: 'admin',
    SURVEY: 'survey',
    RESPONSE: 'response'
};

// Data Validation Schemas
export const SCHEMAS = {
    USER: {
        required: ['username', 'email', 'password', 'role'],
        properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['genesis', 'platform', 'user'] }
        }
    },
    SURVEY: {
        required: ['title', 'questions', 'createdBy'],
        properties: {
            title: { type: 'string', minLength: 1 },
            questions: { type: 'array', minItems: 1 },
            createdBy: { type: 'string' }
        }
    }
};
