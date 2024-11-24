import paths from '/config/paths.js';
import { DataService } from '/src/models/dataservice.js';
import navigation from '/src/services/navigation/navigation.js';
import Logger from '/src/utils/logging/logger.js';
import config from '/config/client.js';

export class IndexController {
    constructor() {
        Logger.info('Index Controller constructor called');
        this.initialize();
    }

    initialize() {
        Logger.info('Initializing Index Controller');
        
        // Setup logs button
        const logsButton = document.getElementById('logsButton');
        Logger.info('Found logs button:', !!logsButton);
        if (logsButton) {
            logsButton.addEventListener('click', () => {
                Logger.info('Logs button clicked');
                navigation.navigateToUtil('logger');
            });
        }

        // Add click handler to begin button
        const beginButton = document.getElementById('begin-button');
        Logger.info('Found begin button:', !!beginButton);
        if (beginButton) {
            beginButton.addEventListener('click', () => {
                Logger.info('Begin button clicked, calling handleBegin');
                this.handleBegin();
            });
        }

        Logger.info('Index Controller initialized');
    }

    async handleBegin() {
        try {
            Logger.info('Begin button handler executing');
            
            // Get DataService instance that was initialized by init.js
            const dataService = window.QE.DataService;
            Logger.info('Got DataService instance:', !!dataService);
            
            const appData = await dataService.getData();
            Logger.info('App data loaded:', appData);
            
            // Check for existing users
            if (appData?.users && appData.users.length > 0) {
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
        Logger.warn('Showing error:', message);
        
        // Show error message on the page
        const messageElement = document.createElement('div');
        messageElement.className = 'message-error';
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        // Remove message after timeout
        setTimeout(() => {
            messageElement.remove();
        }, config.ui.toastDuration);
    }
}
