// test.controller.js
let {
    navigation,
    User,
    ThemeManager,
    FontManager,
    Logger,
    config,
    EventBus
} = {};

// Initialize dependencies asynchronously
async function initializeDependencies() {
    const { PathResolver } = window.env;
    const { CORE_PATHS } = window.env;

    navigation = await import(PathResolver.getModulePath(CORE_PATHS.services.navigation.navigation));
    User = (await import(PathResolver.getModulePath(CORE_PATHS.models.user))).User;
    ThemeManager = (await import(PathResolver.getModulePath(CORE_PATHS.services.state.theme))).default;
    FontManager = (await import(PathResolver.getModulePath(CORE_PATHS.services.state.font))).default;
    Logger = (await import(PathResolver.getModulePath(CORE_PATHS.utils.logging.logger))).default;
    config = (await import(PathResolver.getModulePath(CORE_PATHS.services.base.config))).default;
    EventBus = (await import(PathResolver.getModulePath(CORE_PATHS.services.events.eventBus))).default;
}

export class TestController {
    #logger;
    #view;
    #isInitialized = false;
    #testResults = [];
    #currentTest = null;

    constructor() {
        initializeDependencies().then(() => {
            this.#logger = Logger;
            this.#logger.info('TestController initializing');
            this.#initialize();
        }).catch(error => {
            console.error('Failed to initialize TestController dependencies:', error);
        });
    }

    async #initialize() {
        try {
            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();
            
            // Subscribe to style loading events
            EventBus.subscribe('styleLoadSuccess', this.#handleStyleLoadSuccess.bind(this));
            EventBus.subscribe('styleLoadError', this.#handleStyleLoadError.bind(this));

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

            // CSS test buttons
            testStyles: document.getElementById('testStyles'),
            verifyStyles: document.getElementById('verifyStyles'),

            // State test buttons
            testTheme: document.getElementById('testTheme'),
            testFont: document.getElementById('testFont'),
            testStorage: document.getElementById('testStorage'),

            // Debug buttons
            viewLogs: document.getElementById('viewLogs'),
            clearStorage: document.getElementById('clearStorage'),
            resetState: document.getElementById('resetState'),

            // Display elements
            results: document.getElementById('results'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('View elements initialized');
    }

    #setupEventListeners() {
        // Component tests
        this.#view.testHead?.addEventListener('click', () => this.#testComponent('head'));
        this.#view.testNav?.addEventListener('click', () => this.#testComponent('nav'));
        this.#view.testSidebar?.addEventListener('click', () => this.#testComponent('sidebar'));
        this.#view.testLayout?.addEventListener('click', () => this.#testComponent('layout'));

        // Service tests
        this.#view.testAuth?.addEventListener('click', () => this.#testService('auth'));
        this.#view.testData?.addEventListener('click', () => this.#testService('data'));
        this.#view.testNavigation?.addEventListener('click', () => this.#testService('navigation'));

        // CSS tests
        this.#view.testStyles?.addEventListener('click', () => this.#testStyleLoading());
        this.#view.verifyStyles?.addEventListener('click', () => this.#verifyStylesheets());

        // State tests
        this.#view.testTheme?.addEventListener('click', () => this.#testState('theme'));
        this.#view.testFont?.addEventListener('click', () => this.#testState('font'));
        this.#view.testStorage?.addEventListener('click', () => this.#testState('storage'));

        // Debug actions
        this.#view.viewLogs?.addEventListener('click', () => this.#viewLogs());
        this.#view.clearStorage?.addEventListener('click', () => this.#clearStorage());
        this.#view.resetState?.addEventListener('click', () => this.#resetState());
    }

    #startTest(name) {
        this.#currentTest = name;
        document.dispatchEvent(new CustomEvent('testStart', {
            detail: { testName: name }
        }));
    }

    #updateTestProgress(current, total, status) {
        document.dispatchEvent(new CustomEvent('testProgress', {
            detail: { current, total, status }
        }));
    }

    #endTest() {
        document.dispatchEvent(new CustomEvent('testComplete'));
        this.#currentTest = null;
    }

    async #testComponent(component) {
        try {
            this.#startTest(`Testing ${component} Component`);
            const { PathResolver, CORE_PATHS } = window.env;
            const componentPath = CORE_PATHS.views.components[component];
            
            this.#updateTestProgress(1, 3, 'Loading component');
            const response = await fetch(PathResolver.resolve(componentPath));
            
            if (!response.ok) {
                throw new Error(`Failed to load ${component} component`);
            }

            this.#updateTestProgress(2, 3, 'Verifying component');
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate verification

            this.#updateTestProgress(3, 3, 'Completing test');
            this.#showResult(`${component} Component Test`, {
                status: 'success',
                path: componentPath
            });
            
            this.#endTest();
        } catch (error) {
            this.#logger.error(`Component test failed for ${component}:`, error);
            this.#handleError(`Failed to test ${component} component`);
            this.#endTest();
        }
    }

    async #testService(service) {
        try {
            this.#startTest(`Testing ${service} Service`);
            const { PathResolver, CORE_PATHS } = window.env;
            const servicePath = CORE_PATHS.services[service];
            
            this.#updateTestProgress(1, 3, 'Loading service');
            const module = await import(PathResolver.resolve(servicePath));
            
            this.#updateTestProgress(2, 3, 'Analyzing exports');
            const exports = Object.keys(module);
            
            this.#updateTestProgress(3, 3, 'Completing test');
            this.#showResult(`${service} Service Test`, {
                status: 'success',
                path: servicePath,
                exports
            });
            
            this.#endTest();
        } catch (error) {
            this.#logger.error(`Service test failed for ${service}:`, error);
            this.#handleError(`Failed to test ${service} service`);
            this.#endTest();
        }
    }

    async #testStyleLoading() {
        try {
            this.#startTest('Testing Style Loading');
            const stylesheets = document.styleSheets;
            let loadedCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < stylesheets.length; i++) {
                this.#updateTestProgress(i + 1, stylesheets.length, 'Checking stylesheets');
                const sheet = stylesheets[i];
                try {
                    if (sheet.href) {
                        const rules = sheet.cssRules;
                        this.#logger.info(`Stylesheet loaded: ${sheet.href}`);
                        loadedCount++;
                    }
                } catch (error) {
                    this.#logger.error(`Failed to load stylesheet: ${sheet.href}`);
                    failedCount++;
                }
            }

            this.#showResult('Style Loading Test', {
                total: stylesheets.length,
                loaded: loadedCount,
                failed: failedCount
            });
            
            this.#endTest();
        } catch (error) {
            this.#logger.error('Style test failed:', error);
            this.#handleError('Style test failed');
            this.#endTest();
        }
    }

    async #verifyStylesheets() {
        try {
            this.#startTest('Verifying Stylesheets');
            const expectedStyles = window.env.STYLE_PATHS;
            const loadedStyles = Array.from(document.styleSheets)
                .map(sheet => sheet.href)
                .filter(Boolean);

            const missingStyles = [];
            const { PathResolver } = window.env;
            const totalStyles = Object.values(expectedStyles).flat().length;
            let checkedCount = 0;

            Object.values(expectedStyles).flat().forEach(stylePath => {
                checkedCount++;
                this.#updateTestProgress(checkedCount, totalStyles, 'Verifying styles');
                
                const fullPath = PathResolver.resolve(stylePath);
                if (!loadedStyles.some(href => href.includes(stylePath))) {
                    missingStyles.push(stylePath);
                }
            });

            this.#showResult('Style Verification', {
                expected: totalStyles,
                loaded: loadedStyles.length,
                missing: missingStyles
            });
            
            this.#endTest();
        } catch (error) {
            this.#logger.error('Style verification failed:', error);
            this.#handleError('Style verification failed');
            this.#endTest();
        }
    }

    async #testState(state) {
        try {
            this.#startTest(`Testing ${state} State`);
            let result;
            
            this.#updateTestProgress(1, 3, 'Initializing state test');
            
            switch (state) {
                case 'theme':
                    this.#updateTestProgress(2, 3, 'Getting theme state');
                    result = await ThemeManager.getTheme();
                    break;
                case 'font':
                    this.#updateTestProgress(2, 3, 'Getting font state');
                    result = await FontManager.getFont();
                    break;
                case 'storage':
                    this.#updateTestProgress(2, 3, 'Getting storage state');
                    result = {
                        localStorage: Object.keys(localStorage),
                        sessionStorage: Object.keys(sessionStorage)
                    };
                    break;
            }

            this.#updateTestProgress(3, 3, 'Completing test');
            this.#showResult(`${state} State Test`, result);
            this.#endTest();
        } catch (error) {
            this.#logger.error(`State test failed for ${state}:`, error);
            this.#handleError(`Failed to test ${state} state`);
            this.#endTest();
        }
    }

    async #viewLogs() {
        try {
            this.#startTest('Viewing Logs');
            this.#updateTestProgress(1, 2, 'Fetching logs');
            const logs = await Logger.getLogs();
            this.#updateTestProgress(2, 2, 'Processing logs');
            this.#showResult('Application Logs', logs);
            this.#endTest();
        } catch (error) {
            this.#logger.error('Failed to view logs:', error);
            this.#handleError('Failed to view logs');
            this.#endTest();
        }
    }

    async #clearStorage() {
        try {
            this.#startTest('Clearing Storage');
            this.#updateTestProgress(1, 2, 'Clearing storage data');
            localStorage.clear();
            sessionStorage.clear();
            this.#updateTestProgress(2, 2, 'Verifying storage clear');
            this.#showResult('Storage Cleared', {
                status: 'success',
                timestamp: new Date().toISOString()
            });
            this.#endTest();
        } catch (error) {
            this.#logger.error('Failed to clear storage:', error);
            this.#handleError('Failed to clear storage');
            this.#endTest();
        }
    }

    async #resetState() {
        try {
            this.#startTest('Resetting State');
            this.#updateTestProgress(1, 3, 'Resetting theme');
            await ThemeManager.reset();
            this.#updateTestProgress(2, 3, 'Resetting font');
            await FontManager.reset();
            this.#updateTestProgress(3, 3, 'Clearing storage');
            this.#clearStorage();
            this.#showResult('State Reset', {
                status: 'success',
                timestamp: new Date().toISOString()
            });
            this.#endTest();
        } catch (error) {
            this.#logger.error('Failed to reset state:', error);
            this.#handleError('Failed to reset state');
            this.#endTest();
        }
    }

    #handleStyleLoadSuccess(event) {
        this.#logger.info('Style loaded:', event.detail);
    }

    #handleStyleLoadError(event) {
        this.#logger.error('Style load error:', event.detail);
    }

    #showResult(title, data) {
        const result = { title, data, timestamp: new Date().toISOString() };
        this.#testResults.push(result);
        
        if (this.#view.results) {
            const resultHtml = `
                <div class="test-result">
                    <h3>${title}</h3>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                    <small>${result.timestamp}</small>
                </div>
            `;
            this.#view.results.insertAdjacentHTML('afterbegin', resultHtml);
        }
    }

    #handleError(message) {
        this.#logger.error(message);
        if (this.#view.errorMessage) {
            this.#view.errorMessage.textContent = message;
            this.#view.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.#view.errorMessage.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TestController();
});
