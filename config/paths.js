// Site state constant to control environment
export const SITE_STATE = 'dev'; // Change to 'prod' for production

// Path configuration based on site state
let BASE_URL, ASSET_PATH, VIEW_PATH, STYLE_PATH, MODULE_PATH;

if (SITE_STATE === 'dev') {
    // Development paths (Go Live server on port 5500)
    BASE_URL = 'http://127.0.0.1:5500';
    ASSET_PATH = '/assets';
    VIEW_PATH = '/src/views';
    STYLE_PATH = '/src/views/styles';
    MODULE_PATH = '/src';
} else {
    // Production paths (AWS server)
    BASE_URL = '${AWS_URL}';
    ASSET_PATH = '/assets';
    VIEW_PATH = '/views';
    STYLE_PATH = '/styles';
    MODULE_PATH = '/';
}

// Core paths configuration
const CORE_PATHS = {
    // Assets
    assets: {
        logo: `${ASSET_PATH}/qeLogoBW.png`
    },
    
    // CSS files in load order
    styles: {
        core: [
            `${STYLE_PATH}/core/variables.css`,
            `${STYLE_PATH}/core/base.css`,
            `${STYLE_PATH}/core/typography.css`
        ],
        themes: [
            `${STYLE_PATH}/themes/light.css`,
            `${STYLE_PATH}/themes/dark.css`
        ],
        layouts: [
            `${STYLE_PATH}/layouts/container.css`,
            `${STYLE_PATH}/layouts/grid.css`
        ],
        components: [
            `${STYLE_PATH}/components/button.css`,
            `${STYLE_PATH}/components/form.css`,
            `${STYLE_PATH}/components/message.css`,
            `${STYLE_PATH}/components/navigation.css`,
            `${STYLE_PATH}/components/admin-control-panel.css`
        ],
        utilities: [
            `${STYLE_PATH}/utilities/helpers.css`,
            `${STYLE_PATH}/utilities/typography.css`
        ],
        pages: [
            `${STYLE_PATH}/admin-dashboard.css`
        ]
    },
    
    // HTML components
    components: {
        head: `${VIEW_PATH}/components/head.html`,
        nav: `${VIEW_PATH}/components/nav.html`,
        sidebar: `${VIEW_PATH}/components/sidebar.html`,
        header: `${VIEW_PATH}/components/header.html`
    },
    
    // Pages
    pages: {
        root: '/',  // Root directory for index.html
        login: `${VIEW_PATH}/pages/login.html`,
        genesisAdmin: `${VIEW_PATH}/pages/genesisAdmin.html`,
        adminControlPanel: `${VIEW_PATH}/pages/adminControlPanel.html`,
        settings: `${VIEW_PATH}/pages/settings.html`,
        userProfile: `${VIEW_PATH}/pages/userProfile.html`
    },
    
    // Utils
    utils: {
        logger: `${MODULE_PATH}/utils/logging/test-logger.html`
    },

    // Data files
    data: {
        users: `${MODULE_PATH}/models/data/users.json`
    },

    // Module paths
    modules: {
        // Models
        dataService: `${MODULE_PATH}/models/dataservice.js`,
        user: `${MODULE_PATH}/models/user.js`,
        
        // Services
        navigation: `${MODULE_PATH}/services/navigation/navigation.js`,
        logger: `${MODULE_PATH}/utils/logging/logger.js`,
        config: '/config/client.js',
        themeManager: `${MODULE_PATH}/services/state/thememanager.js`,
        fontManager: `${MODULE_PATH}/services/state/fontmanager.js`,
        
        // Controllers
        index: `${MODULE_PATH}/controllers/index.js`,
        admincontrolpanel: `${MODULE_PATH}/controllers/admin/admincontrolpanel.js`,
        login: `${MODULE_PATH}/controllers/auth/login.js`,
        settings: `${MODULE_PATH}/controllers/user/settings.js`,
        userprofile: `${MODULE_PATH}/controllers/user/userprofile.js`
    }
};

// Path configuration
const paths = {
    // Environment
    SITE_STATE,
    BASE_URL,
    
    // Core paths
    core: CORE_PATHS,
    
    // Helper functions
    resolve: (path, isModule = false) => {
        if (!path) return '';
        
        // Handle root path specially
        if (path === '/') {
            return SITE_STATE === 'dev' ? BASE_URL : BASE_URL + '/';
        }
        
        // Clean the path
        const cleanPath = path.replace(/^\/+/, '');
        
        // For development environment
        if (SITE_STATE === 'dev') {
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
            ...CORE_PATHS.styles.core,
            ...CORE_PATHS.styles.themes,
            ...CORE_PATHS.styles.layouts,
            ...CORE_PATHS.styles.components,
            ...CORE_PATHS.styles.utilities,
            ...CORE_PATHS.styles.pages
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
        return paths.resolve(pagePath);
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
        return paths.resolve(modulePath, true); // Pass true for module paths
    }
};

export default paths;
