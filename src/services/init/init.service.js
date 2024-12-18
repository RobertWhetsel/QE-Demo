/**
 * Initializes global path configurations and manages component loading sequence.
 * Assumes window.env is populated from env.json.
 */

console.log('Initializing QE namespace and services...');

// Verify window.env exists
if (!window.env) {
    console.error('window.env not found. env.json must be loaded first.');
    throw new Error('Environment not initialized');
}

class InitializationService {
    static instance = null;

    constructor() {
        if (InitializationService.instance) {
            return InitializationService.instance;
        }
        InitializationService.instance = this;

        this.initializeQENamespace();
        this.initializeLoadingSequence();
    }

    initializeQENamespace() {
        console.log('Setting up window.QE namespace...');
        window.QE = window.QE || {};
        
        // Initialize User service
        console.log('Initializing User service...');
        window.QE.User = {
            checkExistingUsers: async () => {
                try {
                    console.log('Checking for existing users...');
                    
                    // First check if we have a GENESIS_USER in env.json
                    if (window.env && window.env.GENESIS_USER) {
                        console.log('Found GENESIS_USER in env.json');
                        return true;
                    }

                    // Then check users.json
                    const response = await fetch('/src/models/data/users.json');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const users = await response.json();
                    const hasUsers = Array.isArray(users) && users.length > 0;
                    
                    if (!hasUsers) {
                        // If no users exist, try to load from users.csv
                        console.log('No users found, checking users.csv...');
                        const csvResponse = await fetch('/src/models/data/users.csv');
                        if (csvResponse.ok) {
                            const csvText = await csvResponse.text();
                            // Just checking if we have data beyond the header row
                            const hasCSVUsers = csvText.split('\n').length > 1;
                            if (hasCSVUsers) {
                                console.log('Found users in CSV file');
                                return true;
                            }
                        }
                    }

                    console.log('User check result:', hasUsers ? 'Users found' : 'No users found');
                    return hasUsers;
                } catch (error) {
                    console.error('Error checking existing users:', error);
                    return false;
                }
            }
        };
        console.log('User service initialized');
    }

    initializeLoadingSequence() {
        // Add loading class to body
        document.body.classList.add('loading-active');

        // Track critical resources
        const criticalResources = new Set([
            'styles',
            'userService',
            'head',
            'header',
            'navigation'
        ]);

        const loadedResources = new Set();

        const checkAllResourcesLoaded = () => {
            for (const resource of criticalResources) {
                if (!loadedResources.has(resource)) {
                    return false;
                }
            }
            return true;
        };

        const markResourceLoaded = (resource) => {
            console.log(`Resource loaded: ${resource}`);
            loadedResources.add(resource);

            if (checkAllResourcesLoaded()) {
                console.log('All critical resources loaded');
                document.dispatchEvent(new CustomEvent('allResourcesLoaded'));
            }
        };

        // Listen for style loading completion
        window.addEventListener('load', () => {
            markResourceLoaded('styles');
        });

        // Listen for component ready events
        document.addEventListener('headReady', () => markResourceLoaded('head'));
        document.addEventListener('headerReady', () => markResourceLoaded('header'));
        document.addEventListener('navigationReady', () => markResourceLoaded('navigation'));

        // Mark user service as loaded immediately since it's initialized in constructor
        markResourceLoaded('userService');
    }
}

// Create singleton instance
const initService = new InitializationService();

// Export for module usage
export default initService;
