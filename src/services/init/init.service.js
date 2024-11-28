// Import paths configuration
import paths from '/config/paths.config.js';

// Import dependencies using paths.resolve after paths is available
let ThemeManager, FontManager, User, DataService, Logger, config, navigation;

// Load CSS files
async function loadStyles() {
    return new Promise((resolve) => {
        const cssPaths = paths.getCssPaths();
        let loaded = 0;

        cssPaths.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                loaded++;
                if (loaded === cssPaths.length) {
                    resolve();
                }
            };
            document.head.appendChild(link);
        });
    });
}

// Initialize state managers
export async function initializeApp() {
    try {
        // Load CSS files first and wait for them to complete
        await loadStyles();
        document.documentElement.setAttribute('data-styles-loaded', 'true');

        // Set logo source using paths configuration
        const logo = document.getElementById('logoImg');
        if (logo) {
            logo.src = paths.getAssetPath('logo');
        }

        // Import modules using paths.resolve
        ThemeManager = (await import(paths.getModulePath('themeManager'))).default;
        FontManager = (await import(paths.getModulePath('fontManager'))).default;
        User = (await import(paths.getModulePath('user'))).User;
        DataService = (await import(paths.getModulePath('dataService'))).DataService;
        Logger = (await import(paths.getModulePath('logger'))).default;
        config = (await import(paths.getModulePath('config'))).default;
        navigation = (await import(paths.getModulePath('navigation'))).default;

        await Logger.info('Application Initialization Started');

        // Initialize managers
        ThemeManager.initialize();
        FontManager.initialize();
        
        // Initialize global QE object
        window.QE = window.QE || {};
        window.QE.User = User;
        window.QE.config = config;
        
        // Initialize DataService
        const dataService = new DataService();
        await dataService.init();
        window.QE.DataService = dataService;

        // Mark initialization as complete
        document.documentElement.setAttribute('data-app-initialized', 'true');
        document.dispatchEvent(new CustomEvent('appInitialized'));
        
    } catch (error) {
        console.error('Error during initialization:', error);
        if (Logger) {
            await Logger.error('Error during initialization:', error);
            await Logger.flush();
        }
    }
}

// Initialize immediately when script is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
        console.error('Error initializing application:', error);
    });
});
