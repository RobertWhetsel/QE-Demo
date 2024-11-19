// Application-wide constants
export const STATUS = {
    TEAM: {
        ACTIVE: 'ACTIVE',
        PENDING: 'PENDING',
        COMPLETED: 'COMPLETED',
        ARCHIVED: 'ARCHIVED'
    },
    PERSONNEL: {
        ACTIVE: 'ACTIVE',
        PENDING: 'PENDING',
        INACTIVE: 'INACTIVE'
    }
};

export const ROLES = {
    GENESIS: 'GENESIS',
    PLATFORM: 'PLATFORM',
    USER: 'USER',
    VOLUNTEER: 'VOLUNTEER',
    DATA_SCIENTIST: 'DATA_SCIENTIST',
    RESEARCHER: 'RESEARCHER'
};

export const DOM_SELECTORS = {
    TEAMS_LIST: '#teams-list',
    WORKSPACES_LIST: '#workspaces-list',
    PERSONNEL_LIST: '#personnel-list'
};

export const HTML_TEMPLATES = {
    TEAM_STATUS_OPTIONS: `
        <option value="ACTIVE">Active</option>
        <option value="PENDING">Pending</option>
        <option value="COMPLETED">Completed</option>
        <option value="ARCHIVED">Archived</option>
    `,
    PERSONNEL_STATUS_OPTIONS: `
        <option value="ACTIVE">Active</option>
        <option value="PENDING">Pending</option>
        <option value="INACTIVE">Inactive</option>
    `,
    ROLE_OPTIONS: `
        <option value="">Select Role</option>
        <option value="VOLUNTEER">Volunteer</option>
        <option value="DATA_SCIENTIST">Data Scientist</option>
        <option value="RESEARCHER">Researcher</option>
    `
};
