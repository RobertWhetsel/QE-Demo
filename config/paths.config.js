/**
 * Global path configuration module
 */

console.log('Initializing path configurations...');

// Verify window.env exists
if (!window.env) {
    console.error('window.env not found. env.json must be loaded first.');
    throw new Error('Environment not initialized');
}

try {
    // Destructure necessary environment variables
    const { SITE_STATE, DEV_URL, AWS_URL, DEV_PATHS, PROD_PATHS } = window.env;

    // Determine the paths and baseURL based on SITE_STATE
    const envPaths = SITE_STATE === 'dev' ? DEV_PATHS : PROD_PATHS;
    const baseURL = SITE_STATE === 'dev' ? DEV_URL : AWS_URL;

    console.log('Environment:', SITE_STATE);
    console.log('Base URL:', baseURL);

    // Define PathResolver utility
    window.env.PathResolver = {
        resolve: (path) => `${baseURL}${path}`,
        getAssetPath: (name) => `${envPaths.ASSET_PATH}/${name}`,
        getModulePath: (name) => `${envPaths.MODULE_PATH}/${name}`,
    };

    // Define style paths
    window.env.STYLE_PATHS = {
        base: [
            `${envPaths.STYLE_PATH}/base/_variables.css`,
            `${envPaths.STYLE_PATH}/base/_reset.css`,
            `${envPaths.STYLE_PATH}/base/_typography.css`,
        ],
        layouts: [
            `${envPaths.STYLE_PATH}/layouts/_containers.css`,
            `${envPaths.STYLE_PATH}/layouts/_grid.css`,
        ],
        components: [
            `${envPaths.STYLE_PATH}/components/_admin-form.css`,
            `${envPaths.STYLE_PATH}/components/_admin-panel.css`,
            `${envPaths.STYLE_PATH}/components/_button.css`,
            `${envPaths.STYLE_PATH}/components/_form.css`,
            `${envPaths.STYLE_PATH}/components/_loading.css`,
            `${envPaths.STYLE_PATH}/components/_login.css`,
            `${envPaths.STYLE_PATH}/components/_navigation.css`,
            `${envPaths.STYLE_PATH}/components/_test-panel.css`,
            `${envPaths.STYLE_PATH}/components/_welcome.css`,
        ],
        utilities: [
            `${envPaths.STYLE_PATH}/utilities/_helpers.css`,
        ],
    };

    // Define view paths for navigation
    window.env.VIEW_PATHS = {
        login: window.env.PathResolver.resolve(`${envPaths.VIEW_PATH}/pages/login.view.html`),
        genesisAdmin: window.env.PathResolver.resolve(`${envPaths.VIEW_PATH}/pages/genesis-admin.view.html`),
        testPage: window.env.PathResolver.resolve(`${envPaths.MODULE_PATH}/utils/tests/test-page.view.html`)
    };

    console.log('Path configurations initialized successfully');
} catch (error) {
    console.error('Failed to initialize path configurations:', error);
    throw error;
}

// Export PathResolver for external module usage
export default window.env.PathResolver;
