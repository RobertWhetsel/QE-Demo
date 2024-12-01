/**
 * Controls welcome page functionality and user redirection
 */
export class WelcomeController {
    #isInitialized = false;
    
    constructor() {
        console.log('Initializing WelcomeController...');
        
        if (WelcomeController.instance) {
            console.log('Returning existing WelcomeController instance');
            return WelcomeController.instance;
        }
        
        // Verify required globals
        if (!window.QE) {
            console.error('window.QE not found. init.service.js must be loaded first.');
            throw new Error('QE namespace not initialized');
        }
        
        if (!window.env || !window.env.PathResolver || !window.env.VIEW_PATHS) {
            console.error('Path configurations not found. paths.config.js must be loaded first.');
            throw new Error('Path configurations not initialized');
        }
        
        WelcomeController.instance = this;
        
        // Initialize state
        this.currentPath = window.location.pathname;
        console.log('Current path:', this.currentPath);
    }
 
    async initialize() {
        if (this.#isInitialized) {
            console.log('WelcomeController already initialized');
            return true;
        }
 
        try {
            console.log('Initializing UI elements...');
            
            // Initialize UI elements
            this.beginButton = document.querySelector('.welcome__action');
            this.testButton = document.querySelector('.welcome__tests');
            
            if (!this.beginButton || !this.testButton) {
                console.error('Required UI elements not found:',
                    !this.beginButton ? 'Missing begin button' : 'Missing test button');
                throw new Error('Required welcome page elements not found');
            }
            
            console.log('UI elements found, binding events...');
 
            // Bind event listeners
            this.bindEvents();
            
            // Mark as initialized
            this.#isInitialized = true;
            console.log('WelcomeController initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Welcome controller initialization failed:', error);
            return false;
        }
    }
 
    bindEvents() {
        console.log('Binding event listeners...');
        
        this.beginButton.addEventListener('click', () => {
            console.log('Begin button clicked');
            this.handleBeginClick();
        });
        
        this.testButton.addEventListener('click', () => {
            console.log('Test button clicked');
            this.handleTestClick();
        });
        
        console.log('Event listeners bound successfully');
    }
 
    async handleBeginClick() {
        try {
            console.log('Checking for existing users...');
            const hasUsers = await window.QE.User.checkExistingUsers();
            console.log('User check result:', hasUsers ? 'Users exist' : 'No users found');
            
            // Use the pre-resolved path directly from VIEW_PATHS
            const targetPath = hasUsers 
                ? window.env.VIEW_PATHS.login
                : window.env.VIEW_PATHS.genesisAdmin;
            
            console.log('Navigating to:', targetPath);
            window.location.href = targetPath;
        } catch (error) {
            console.error('Error during begin process:', error);
            throw error;
        }
    }
 
    handleTestClick() {
        try {
            // Use the pre-resolved path directly from VIEW_PATHS
            const testPath = window.env.VIEW_PATHS.testPage;
            console.log('Navigating to test page:', testPath);
            
            window.location.href = testPath;
        } catch (error) {
            console.error('Error navigating to tests:', error);
            throw error;
        }
    }
}
