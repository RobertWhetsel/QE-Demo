// Use globally available env
const env = window.env;

// Path configuration based on site state
const BASE_URL = env.SITE_STATE === 'dev' ? env.DEV_URL : env.AWS_URL;
const paths_config = env.SITE_STATE === 'dev' ? env.DEV_PATHS : env.PROD_PATHS;
const { ASSET_PATH, VIEW_PATH, STYLE_PATH, MODULE_PATH, CONFIG_PATH } = paths_config;

// Core paths configuration
const CORE_PATHS = {
    // Assets
    assets: {
        logo: `${ASSET_PATH}/qeLogoBW.png`,
        acme: `${ASSET_PATH}/acme.png`
    },
    
    // CSS files in load order
    styles: {
        base: [
            `${STYLE_PATH}/base/_variables.css`,
            `${STYLE_PATH}/base/_reset.css`,
            `${STYLE_PATH}/base/_typography.css`
        ],
        layouts: [
            `${STYLE_PATH}/layouts/_containers.css`,
            `${STYLE_PATH}/layouts/_grid.css`
        ],
        components: [
            `${STYLE_PATH}/components/_admin-form.css`,
            `${STYLE_PATH}/components/_admin-panel.css`,
            `${STYLE_PATH}/components/_button.css`,
            `${STYLE_PATH}/components/_form.css`,
            `${STYLE_PATH}/components/_loading.css`,
            `${STYLE_PATH}/components/_login.css`,
            `${STYLE_PATH}/components/_navigation.css`,
            `${STYLE_PATH}/components/_test-panel.css`,
            `${STYLE_PATH}/components/_welcome.css`
        ],
        utilities: [
            `${STYLE_PATH}/utilities/_helpers.css`
        ]
    },
    
    // HTML components
    components: {
        head: `${VIEW_PATH}/components/head.views.html`,
        nav: `${VIEW_PATH}/components/nav.views.html`,
        sidebar: `${VIEW_PATH}/components/sidebar.views.html`,
        header: `${VIEW_PATH}/components/header.views.html`,
        'shared/layout': `${VIEW_PATH}/components/shared/layout.views.html`,
        'admin/user-creation-form': `${VIEW_PATH}/components/admin/user-creation-form.views.html`
    },
    
    // Pages
    pages: {
        root: '/',
        adminControlPanel: `${VIEW_PATH}/pages/admin-control-panel.views.html`,
        auth: `${VIEW_PATH}/pages/auth.views.html`,
        availableSurveys: `${VIEW_PATH}/pages/available-surveys.views.html`,
        base: `${VIEW_PATH}/pages/base.views.html`,
        completedSurveys: `${VIEW_PATH}/pages/completed-surveys.views.html`,
        dashboard: `${VIEW_PATH}/pages/dashboard.views.html`,
        forgotPassword: `${VIEW_PATH}/pages/forgot-password.views.html`,
        genesisAdmin: `${VIEW_PATH}/pages/genesis-admin.views.html`,
        login: `${VIEW_PATH}/pages/login.views.html`,
        messages: `${VIEW_PATH}/pages/messages.views.html`,
        research: `${VIEW_PATH}/pages/research.views.html`,
        researchDashboard: `${VIEW_PATH}/pages/research-dashboard.views.html`,
        settings: `${VIEW_PATH}/pages/settings.views.html`,
        spreadsheet: `${VIEW_PATH}/pages/spreadsheet.views.html`,
        survey: `${VIEW_PATH}/pages/survey.views.html`,
        tasks: `${VIEW_PATH}/pages/tasks.views.html`,
        userProfile: `${VIEW_PATH}/pages/user-profile.views.html`,
        volunteerDashboard: `${VIEW_PATH}/pages/volunteer-dashboard.views.html`
    },
    
    // Utils
    utils: {
        logger: `${MODULE_PATH}/utils/logging/test-logger.utils.html`,
        test: `${MODULE_PATH}/utils/testPage.utils.html`,
        testUser: `${MODULE_PATH}/utils/test-user.utils.html`
    },

    // Data files
    data: {
        users: `${MODULE_PATH}/models/data/users.json`
    },

    // Module paths
    modules: {
        // Core modules
        init: env.INIT_PATH,
        paths: `${CONFIG_PATH}/paths.services.js`,
        
        // Models
        dataService: `${MODULE_PATH}/models/data.services.js`,
        user: `${MODULE_PATH}/models/user.models.js`,
        
        // Services
        navigation: `${MODULE_PATH}/services/navigation/navigation.services.js`,
        logger: `${MODULE_PATH}/utils/logging/logger.services.js`,
        config: `${CONFIG_PATH}/client.js`,
        themeManager: `${MODULE_PATH}/services/state/themeManager.services.js`,
        fontManager: `${MODULE_PATH}/services/state/fontManager.services.js`,
        
        // Controllers
        index: `${MODULE_PATH}/controllers/index.controllers.js`,
        admincontrolpanel: `${MODULE_PATH}/controllers/admin/admincontrolpanel.js`,
        login: `${MODULE_PATH}/controllers/auth/login.js`,
        settings: `${MODULE_PATH}/controllers/user/settings.js`,
        userprofile: `${MODULE_PATH}/controllers/user/userprofile.js`,
        test: `${MODULE_PATH}/controllers/test/testController.js`
    }
};

// Path configuration
const paths = {
    // Environment
    BASE_URL,
    
    // Core paths
    core: CORE_PATHS,
    
    // Helper functions
    resolve: (path, isModule = false) => {
        if (!path) return '';
        
        // Handle root path specially
        if (path === '/') {
            return env.SITE_STATE === 'dev' ? BASE_URL : BASE_URL + '/';
        }
        
        // Clean the path
        const cleanPath = path.replace(/^\/+/, '');
        
        // For development environment
        if (env.SITE_STATE === 'dev') {
            // For module imports, we need the / prefix
            if (isModule) {
                return `/${cleanPath}`;
            }
            // For other resources, combine with base URL
            return `${BASE_URL}/${cleanPath}`;
        }
        
        // For production, prepend AWS URL
        return `${BASE_URL}/${cleanPath}`;
    },

    // Get all CSS paths in correct order
    getCssPaths: () => {
        const allStyles = [
            ...CORE_PATHS.styles.base,
            ...CORE_PATHS.styles.layouts,
            ...CORE_PATHS.styles.components,
            ...CORE_PATHS.styles.utilities
        ];
        return allStyles.map(path => paths.resolve(path));
    },

    // Get asset path
    getAssetPath: (name) => {
        const assetPath = CORE_PATHS.assets[name];
        return paths.resolve(assetPath);
    },

    // Get component path
    getComponentPath: (name) => {
        const componentPath = CORE_PATHS.components[name];
        return paths.resolve(componentPath);
    },

    // Get page path
    getPagePath: (name) => {
        const pagePath = CORE_PATHS.pages[name];
        return env.SITE_STATE === 'dev' ? `${BASE_URL}${pagePath}` : paths.resolve(pagePath);
    },

    // Get utility path
    getUtilPath: (name) => {
        const utilPath = CORE_PATHS.utils[name];
        return paths.resolve(utilPath);
    },

    // Get data file path
    getDataPath: (name) => {
        const dataPath = CORE_PATHS.data[name];
        return paths.resolve(dataPath);
    },

    // Get module path
    getModulePath: (name) => {
        const modulePath = CORE_PATHS.modules[name];
        return paths.resolve(modulePath, true);
    }
};

export default paths;
