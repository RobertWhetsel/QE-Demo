import navigation from '/src/services/navigation/navigation.js';
import { User } from '/src/models/user.js';
import ThemeManager from '/src/services/state/thememanager.js';
import FontManager from '/src/services/state/fontmanager.js';
import Logger from '/src/utils/logging/logger.js';
import config from '/config/client.js';
import paths from '/config/paths.js';

export class TestController {
    constructor() {
        Logger.info('Initializing Test controller');
        this.initializeElements();
        this.init();
    }

    initializeElements() {
        this.results = document.getElementById('results');
        this.errorMessage = document.getElementById('error-message');
        this.loading = document.getElementById('loading');
    }

    init() {
        Logger.debug('Setting up test button event listeners');
        
        // Components
        document.getElementById('testHead').addEventListener('click', () => this.testComponent('head'));
        document.getElementById('testNav').addEventListener('click', () => this.testComponent('nav'));
        document.getElementById('testSidebar').addEventListener('click', () => this.testComponent('sidebar'));
        document.getElementById('testLayout').addEventListener('click', () => this.testComponent('shared/layout'));

        // Services
        document.getElementById('testAuth').addEventListener('click', () => this.testAuth());
        document.getElementById('testData').addEventListener('click', () => this.testData());
        document.getElementById('testNavigation').addEventListener('click', () => this.testNavigation());

        // State
        document.getElementById('testTheme').addEventListener('click', () => this.testTheme());
        document.getElementById('testFont').addEventListener('click', () => this.testFont());
        document.getElementById('testStorage').addEventListener('click', () => this.testStorage());

        // Debug
        document.getElementById('viewLogs').addEventListener('click', () => this.viewLogs());
        document.getElementById('clearStorage').addEventListener('click', () => this.clearStorage());
        document.getElementById('resetState').addEventListener('click', () => this.resetState());
    }

    async testComponent(name) {
        try {
            Logger.info(`Testing ${name} component`);
            const response = await fetch(paths.getComponentPath(name));
            const html = await response.text();
            this.showResult(`${name} Component`, {
                'Status': 'Loaded',
                'Length': html.length,
                'Path': paths.getComponentPath(name)
            });
        } catch (error) {
            Logger.error(`Component test failed: ${name}`, error);
            this.showError(`Failed to load ${name}`);
        }
    }

    async testAuth() {
        try {
            Logger.info('Testing Auth service');
            const User = window.QE?.User;
            this.showResult('Auth Test', {
                'User Service': !!User,
                'Authenticated': User?.isAuthenticated(),
                'Current User': User?.getCurrentUser(),
                'Role': User?.getCurrentUserRole()
            });
        } catch (error) {
            Logger.error('Auth test failed:', error);
            this.showError('Auth test failed');
        }
    }

    async testData() {
        try {
            Logger.info('Testing Data service');
            const dataService = window.QE?.DataService;
            const data = await dataService?.getData();
            this.showResult('Data Test', {
                'Service': !!dataService,
                'Data': !!data,
                'Users': data?.users?.length || 0
            });
        } catch (error) {
            Logger.error('Data test failed:', error);
            this.showError('Data test failed');
        }
    }

    testNavigation() {
        try {
            Logger.info('Testing Navigation service');
            this.showResult('Navigation Test', {
                'Service': !!navigation,
                'Path': window.location.pathname,
                'Base URL': paths.BASE_URL
            });
        } catch (error) {
            Logger.error('Navigation test failed:', error);
            this.showError('Navigation test failed');
        }
    }

    testTheme() {
        try {
            Logger.info('Testing Theme manager');
            this.showResult('Theme Test', {
                'Current': document.documentElement.getAttribute('data-theme'),
                'Manager': !!ThemeManager
            });
        } catch (error) {
            Logger.error('Theme test failed:', error);
            this.showError('Theme test failed');
        }
    }

    testFont() {
        try {
            Logger.info('Testing Font manager');
            this.showResult('Font Test', {
                'Current': document.documentElement.getAttribute('data-font'),
                'Manager': !!FontManager
            });
        } catch (error) {
            Logger.error('Font test failed:', error);
            this.showError('Font test failed');
        }
    }

    testStorage() {
        try {
            Logger.info('Testing Storage');
            this.showResult('Storage Test', {
                'Local Storage': Object.keys(localStorage),
                'Session Storage': Object.keys(sessionStorage)
            });
        } catch (error) {
            Logger.error('Storage test failed:', error);
            this.showError('Storage test failed');
        }
    }

    viewLogs() {
        Logger.info('Opening logs viewer');
        window.open(paths.getUtilPath('logger'), '_blank');
    }

    clearStorage() {
        try {
            Logger.info('Clearing storage');
            localStorage.clear();
            sessionStorage.clear();
            this.showResult('Storage Cleared', {
                'Status': 'Success'
            });
        } catch (error) {
            Logger.error('Clear storage failed:', error);
            this.showError('Failed to clear storage');
        }
    }

    resetState() {
        Logger.info('Resetting application state');
        this.clearStorage();
        location.reload();
    }

    showResult(title, data) {
        Logger.info(`Showing test result: ${title}`);
        const resultDiv = document.createElement('div');
        resultDiv.className = 'test-result';
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
        this.results.insertBefore(resultDiv, this.results.firstChild);
    }

    showError(message) {
        Logger.warn('Showing error message:', message);
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');
            setTimeout(() => {
                this.errorMessage.classList.remove('show');
                Logger.debug('Error message removed');
            }, config.ui.toastDuration);
        } else {
            Logger.error('Error message element not found');
        }
    }
}
