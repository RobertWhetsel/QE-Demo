import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';
import Logger from '../../utils/logging/loggerService.utils.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class TestController {
    #logger;
    #view;
    #isInitialized = false;
    #testResults = [];

    constructor() {
        this.#logger = Logger;
        this.#logger.info('TestController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('TestController initialized successfully');
        } catch (error) {
            this.#logger.error('TestController initialization error:', error);
            this.#handleError('Failed to initialize test panel');
        }
    }

    #initializeView() {
        this.#view = {
            // Component test buttons
            testHead: document.getElementById('testHead'),
            testNav: document.getElementById('testNav'),
            testSidebar: document.getElementById('testSidebar'),
            testLayout: document.getElementById('testLayout'),

            // Service test buttons
            testAuth: document.getElementById('testAuth'),
            testData: document.getElementById('testData'),
            testNavigation: document.getElementById('testNavigation'),

            // State test buttons
            testTheme: document.getElementById('testTheme'),
            testFont: document.getElementById('testFont'),
            testStorage: document.getElementById('testStorage'),

            // Debug buttons
            viewLogs: document.getElementById('viewLogs'),
            clearStorage: document.getElementById('clearStorage'),
            resetState: document.getElementById('resetState'),

            // Results and messages
            results: document.getElementById('results'),
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasComponentButtons: !!(this.#view.testHead && this.#view.testNav),
            hasServiceButtons: !!(this.#view.testAuth && this.#view.testData),
            hasStateButtons: !!(this.#view.testTheme && this.#view.testFont),
            hasDebugButtons: !!(this.#view.viewLogs && this.#view.clearStorage)
        });
    }

    #setupEventListeners() {
        // Component tests
        this.#view.testHead?.addEventListener('click', () => this.#testComponent('head'));
        this.#view.testNav?.addEventListener('click', () => this.#testComponent('nav'));
        this.#view.testSidebar?.addEventListener('click', () => this.#testComponent('sidebar'));
        this.#view.testLayout?.addEventListener('click', () => this.#testComponent('shared/layout'));

        // Service tests
        this.#view.testAuth?.addEventListener('click', () => this.#testAuth());
        this.#view.testData?.addEventListener('click', () => this.#testData());
        this.#view.testNavigation?.addEventListener('click', () => this.#testNavigation());

        // State tests
        this.#view.testTheme?.addEventListener('click', () => this.#testTheme());
        this.#view.testFont?.addEventListener('click', () => this.#testFont());
        this.#view.testStorage?.addEventListener('click', () => this.#testStorage());

        // Debug actions
        this.#view.viewLogs?.addEventListener('click', () => this.#viewLogs());
        this.#view.clearStorage?.addEventListener('click', () => this.#clearStorage());
        this.#view.resetState?.addEventListener('click', () => this.#resetState());

        this.#logger.debug('Event listeners setup complete');
    }

    async #testComponent(name) {
        try {
            this.#showLoading(true);
            this.#logger.info(`Testing ${name} component`);

            const response = await fetch(paths.getComponentPath(name));
            const html = await response.text();

            this.#showResult(`${name} Component`, {
                'Status': 'Loaded',
                'Length': html.length,
                'Path': paths.getComponentPath(name)
            });
        } catch (error) {
            this.#logger.error(`Component test failed: ${name}`, error);
            this.#handleError(`Failed to load ${name}`);
        } finally {
            this.#showLoading(false);
        }
    }

    async #testAuth() {
        try {
            this.#logger.info('Testing Auth service');
            const user = User.getCurrentUser();

            this.#showResult('Auth Test', {
                'User Service': !!User,
                'Authenticated': User.isAuthenticated(),
                'Current User': user?.username,
                'Role': user?.role
            });
        } catch (error) {
            this.#logger.error('Auth test failed:', error);
            this.#handleError('Auth test failed');
        }
    }

    async #testData() {
        try {
            const dataService = window.QE?.DataService;
            const data = await dataService?.getData();

            this.#showResult('Data Test', {
                'Service': !!dataService,
                'Data': !!data,
                'Users': data?.users?.length || 0
            });
        } catch (error) {
            this.#logger.error('Data test failed:', error);
            this.#handleError('Data test failed');
        }
    }

    #testNavigation() {
        try {
            this.#showResult('Navigation Test', {
                'Service': !!navigation,
                'Path': window.location.pathname,
                'Base URL': paths.BASE_URL
            });
        } catch (error) {
            this.#logger.error('Navigation test failed:', error);
            this.#handleError('Navigation test failed');
        }
    }

    #testTheme() {
        try {
            this.#showResult('Theme Test', {
                'Current': document.documentElement.getAttribute('data-theme'),
                'Manager': !!ThemeManager
            });
        } catch (error) {
            this.#logger.error('Theme test failed:', error);
            this.#handleError('Theme test failed');
        }
    }

    #testFont() {
        try {
            this.#showResult('Font Test', {
                'Current': document.documentElement.getAttribute('data-font'),
                'Manager': !!FontManager
            });
        } catch (error) {
            this.#logger.error('Font test failed:', error);
            this.#handleError('Font test failed');
        }
    }

    #testStorage() {
        try {
            this.#showResult('Storage Test', {
                'Local Storage': Object.keys(localStorage),
                'Session Storage': Object.keys(sessionStorage)
            });
        } catch (error) {
            this.#logger.error('Storage test failed:', error);
            this.#handleError('Storage test failed');
        }
    }

    #viewLogs() {
        this.#logger.info('Opening logs viewer');
        window.open(paths.getUtilPath('logger'), '_blank');
    }

    #clearStorage() {
        try {
            this.#logger.info('Clearing storage');
            localStorage.clear();
            sessionStorage.clear();
            this.#showResult('Storage Cleared', {
                'Status': 'Success'
            });
        } catch (error) {
            this.#logger.error('Clear storage failed:', error);
            this.#handleError('Failed to clear storage');
        }
    }

    #resetState() {
        this.#logger.info('Resetting application state');
        this.#clearStorage();
        location.reload();
    }

    #showResult(title, data) {
        this.#logger.info(`Showing test result: ${title}`);
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'test-result';
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;

        if (this.#view.results) {
            this.#view.results.insertBefore(resultDiv, this.#view.results.firstChild);
        }

        // Store result
        this.#testResults.push({ title, data, timestamp: new Date().toISOString() });
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #handleError(message) {
        this.#logger.error('Test error:', message);
        if (this.#view.errorMessage) {
            this.#view.errorMessage.textContent = message;
            this.#view.errorMessage.classList.add('show');
            
            setTimeout(() => {
                this.#view.errorMessage.classList.remove('show');
            }, config.ui.toastDuration);
        }
    }

    // Public methods for external access
    getTestResults() {
        return [...this.#testResults];
    }

    clearResults() {
        if (this.#view.results) {
            this.#view.results.innerHTML = '';
        }
        this.#testResults = [];
    }

    async runAllTests() {
        const components = ['head', 'nav', 'sidebar', 'layout'];
        for (const component of components) {
            await this.#testComponent(component);
        }

        this.#testAuth();
        this.#testData();
        this.#testNavigation();
        this.#testTheme();
        this.#testFont();
        this.#testStorage();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TestController();
});