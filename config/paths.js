// Site state constant to control environment
export const SITE_STATE = 'dev'; // Change to 'prod' for production

// Path configuration based on site state
let BASE_URL, ASSET_PATH, VIEW_PATH, STYLE_PATH, MODULE_PATH;

if (SITE_STATE === 'dev') {
    // Development paths (Go Live server on port 5500)
    BASE_URL = 'http://127.0.0.1:5500';
    ASSET_PATH = '/assets';
    VIEW_PATH = '/src/views';
    STYLE_PATH = '/src/styles';  // Updated to new styles location
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
        // Base styles must be loaded first
        base: [
            `${STYLE_PATH}/base/_variables.css`,
            `${STYLE_PATH}/base/_reset.css`,
            `${STYLE_PATH}/base/_typography.css`
        ],
        // Layout styles
        layouts: [
            `${STYLE_PATH}/layouts/_containers.css`,
            `${STYLE_PATH}/layouts/_grid.css`
        ],
        // Component styles
        components: [
            `${STYLE_PATH}/components/_button.css`,
            `${STYLE_PATH}/components/_form.css`,
            `${STYLE_PATH}/components/_loading.css`,
            `${STYLE_PATH}/components/_welcome.css`,
            `${STYLE_PATH}/components/_login.css`,
            `${STYLE_PATH}/components/_navigation.css`,
            `${STYLE_PATH}/components/_admin-panel.css`,
            `${STYLE_PATH}/components/_admin-form.css`  // Added for admin form
        ],
        // Utility styles loaded last
        utilities: [
            `${STYLE_PATH}/utilities/_helpers.css`
        ]
    },
    
    // HTML components
    components: {
        head: `${VIEW_PATH}/components/head.html`,
        nav: `${VIEW_PATH}/components/nav.html`,
        sidebar: `${VIEW_PATH}/components/sidebar.html`,
        header: `${VIEW_PATH}/components/header.html`,
        'shared/layout': `${VIEW_PATH}/components/shared/layout.html`,
        'admin/user-creation-form': `${VIEW_PATH}/components/admin/user-creation-form.html`  // Added admin form component
    },
    
    // Pages
    pages: {
        root: '/',  // Root directory for index.html
        login: `${VIEW_PATH}/pages/login.html`,
        genesisAdmin: `${VIEW_PATH}/pages/genesisAdmin.html`,
        adminControlPanel: `${VIEW_PATH}/pages/adminControlPanel.html`,
        platformAdmin: `${VIEW_PATH}/pages/platformAdmin.html`,
        settings: `${VIEW_PATH}/pages/settings.html`,
        userProfile: `${VIEW_PATH}/pages/userProfile.html`
    },
    
    // Utils
    utils: {
        logger: `${MODULE_PATH}/utils/logging/test-logger.html`,
        test: `${MODULE_PATH}/utils/testPage.html`
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
        userprofile: `${MODULE_PATH}/controllers/user/userprofile.js`,
        test: `${MODULE_PATH}/controllers/test/testController.js`
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
        // Load all styles in correct order
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
        return SITE_STATE === 'dev' ? `${BASE_URL}${pagePath}` : paths.resolve(pagePath);
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