import paths from '/config/paths.js';
import { DataService } from '/src/models/dataservice.js';
import navigation from '/src/services/navigation/navigation.js';
import Logger from '/src/utils/logging/logger.js';
import config from '/config/client.js';

export class IndexController {
    constructor() {
        this.initialize();
    }

    initialize() {
        Logger.info('Initializing Index Controller');
        
        // Setup logs button
        const logsButton = document.getElementById('logsButton');
        if (logsButton) {
            logsButton.addEventListener('click', () => {
                navigation.navigateToUtil('logger');
            });
        }

        // Add click handler to begin button
        const beginButton = document.getElementById('begin-button');
        if (beginButton) {
            beginButton.addEventListener('click', () => this.handleBegin());
        }

        Logger.info('Index Controller initialized');
    }

    async handleBegin() {
        try {
            Logger.info('Begin button clicked');
            
            // Initialize DataService
            const dataService = new DataService();
            await dataService.init();
            
            const appData = dataService.getData();
            Logger.info('App data loaded:', appData);
            
            // Check for existing users
            if (appData.users && appData.users.length > 0) {
                Logger.info('Users exist, redirecting to login');
                navigation.navigateToPage('login');
            } else {
                // If no users exist, redirect to genesis admin creation
                Logger.info('No users found, redirecting to genesis admin creation');
                navigation.navigateToPage('genesisAdmin');
            }
        } catch (error) {
            Logger.error('Error during initialization:', error);
            this.showError('Error initializing application. Please try again.');
        }
    }

    showError(message) {
        Logger.info('Showing error message:', message);
        
        // Show error message on the page
        const messageElement = document.createElement('div');
        messageElement.className = 'message message-error';
        messageElement.textContent = message;
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 4px;
            animation: slideIn 0.3s ease-out;
            z-index: 1000;
            background-color: #f44336;
            color: white;
        `;
        
        document.body.appendChild(messageElement);
        
        // Remove message after timeout
        setTimeout(() => {
            messageElement.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => messageElement.remove(), 300);
        }, config.ui.toastDuration);
    }
}
