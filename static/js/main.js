// main.js - Main application entry point
import navigation from './modules/navigation.js';
import forms from './modules/forms.js';
import database from './modules/database.js';

// Constants
const CONSTANTS = {
    WELCOME_MESSAGE_KEY: 'welcomeMessage',
    INSTRUCTIONS_KEY: 'instructions',
    DEFAULT_WELCOME: 'Welcome to the Project Management System',
    DEFAULT_INSTRUCTIONS: 'Please follow the instructions below',
    SELECTORS: {
        WELCOME: '#welcome-message',
        INSTRUCTIONS: '#volunteer-instructions',
        HELP_BUTTON: '#help-button',
        HELP_FORM: '#help-request-form',
        SURVEYS_AVAILABLE: '#surveys-available',
        SURVEYS_COMPLETED: '#surveys-completed'
    }
};

class App {
    constructor() {
        // Check authentication and authorization first
        if (!database.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Check role-based access
        if (!database.hasAccess()) {
            this.handleUnauthorized();
            return;
        }

        // Initialize modules
        this.navigation = navigation;
        this.forms = forms;
        this.database = database;
        
        // Store DOM elements
        this.elements = {};
        
        // Bind methods
        this.handleHelpFormSubmit = this.forms.handleHelpFormSubmit.bind(this.forms);
    }

    handleUnauthorized() {
        this.navigation.clearSessionCache();
        window.location.href = 'login.html';
    }

    async init() {
        // Skip initialization if not authenticated or authorized
        if (!this.database.isAuthenticated() || !this.database.hasAccess()) return;

        try {
            // Cache DOM elements
            this.cacheElements();

            // Initialize navigation components
            await this.initNavigation();

            // Initialize content
            this.initContent();

            // Initialize event listeners
            this.initEventListeners();

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
            this.handleError(error);
        }
    }

    cacheElements() {
        // Cache all required DOM elements
        Object.entries(CONSTANTS.SELECTORS).forEach(([key, selector]) => {
            this.elements[key] = document.querySelector(selector);
        });
    }

    async initNavigation() {
        try {
            await Promise.all([
                this.navigation.initSubmenu(),
                this.navigation.initTabNavigation(),
                this.navigation.initNavigationListeners()
            ]);
        } catch (error) {
            console.error('Error initializing navigation:', error);
            throw new Error('Navigation initialization failed');
        }
    }

    initContent() {
        // Initialize welcome message with username and role
        if (this.elements.WELCOME) {
            const { username, role } = this.database.getUserInfo();
            this.elements.WELCOME.textContent = `Welcome, ${username} (${role})!`;
        }

        // Initialize volunteer instructions
        if (this.elements.INSTRUCTIONS) {
            this.elements.INSTRUCTIONS.innerHTML = `
                <h3>Instructions:</h3>
                <p>${this.database.loadFromStorage(
                    CONSTANTS.INSTRUCTIONS_KEY,
                    CONSTANTS.DEFAULT_INSTRUCTIONS
                )}</p>
            `;
        }
    }

    initEventListeners() {
        // Help button
        if (this.elements.HELP_BUTTON) {
            this.elements.HELP_BUTTON.addEventListener('click', () => 
                this.forms.toggleForm(this.elements.HELP_FORM)
            );
        }

        // Help form
        if (this.elements.HELP_FORM) {
            this.elements.HELP_FORM.addEventListener('submit', this.handleHelpFormSubmit);
        }

        // Survey buttons - only show for appropriate roles
        if (this.elements.SURVEYS_AVAILABLE && this.database.canAccessSurveys()) {
            this.elements.SURVEYS_AVAILABLE.addEventListener('click', () => {
                this.navigation.navigateTo('availableSurveys.html');
            });
        }

        if (this.elements.SURVEYS_COMPLETED && this.database.canAccessSurveys()) {
            this.elements.SURVEYS_COMPLETED.addEventListener('click', () => {
                this.navigation.navigateTo('completedSurveys.html');
            });
        }
    }

    handleError(error) {
        console.error('Application error:', error);
        this.forms.showMessage(
            'An error occurred. Please try refreshing the page.',
            'error'
        );
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init().catch(error => {
        console.error('Failed to initialize application:', error);
        // Show user-friendly error message
        const message = document.createElement('div');
        message.className = 'error-message';
        message.textContent = 'Failed to load the application. Please try refreshing the page.';
        document.body.appendChild(message);
    });
});
