/**
 * Controls welcome page functionality and user redirection
 */
export class WelcomeController {
    constructor() {
        if (WelcomeController.instance) {
            return WelcomeController.instance;
        }
        WelcomeController.instance = this;
        
        // Initialize state
        this.currentPath = window.location.pathname;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Get paths configuration
            const { default: paths } = await import(window.env.PATHS_MODULE);
            this.paths = paths;

            // Initialize UI elements
            this.beginButton = document.querySelector('.welcome__action');
            this.testButton = document.querySelector('.welcome__tests');
            
            if (!this.beginButton || !this.testButton) {
                throw new Error('Required welcome page elements not found');
            }

            // Bind event listeners
            this.bindEvents();
            
            // Mark as initialized
            this.isInitialized = true;
            
            return true;
        } catch (error) {
            console.error('Welcome controller initialization failed:', error);
            return false;
        }
    }

    bindEvents() {
        this.beginButton.addEventListener('click', () => this.handleBeginClick());
        this.testButton.addEventListener('click', () => this.handleTestClick());
    }

    async handleBeginClick() {
        if (!this.isInitialized) {
            throw new Error('Welcome controller not initialized');
        }

        try {
            const hasUsers = await window.QE.User.checkExistingUsers();
            const targetPath = hasUsers 
                ? window.env.CORE_PATHS.views.pages.login
                : window.env.CORE_PATHS.views.pages.genesisAdmin;
                
            window.location.href = targetPath;
        } catch (error) {
            console.error('Error during begin process:', error);
            throw error;
        }
    }

    handleTestClick() {
        if (!this.isInitialized) {
            throw new Error('Welcome controller not initialized');
        }

        try {
            window.location.href = window.env.CORE_PATHS.utils.tests.testPage;
        } catch (error) {
            console.error('Error navigating to tests:', error);
        }
    }
}