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
            errorMessage: document.getElementById('error-message'),
            loadingSpinner: document.getElementById('loading')
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

    async #testComponent(component) {
        try {
            const { PathResolver, CORE_PATHS } = window.env;
            const componentPath = CORE_PATHS.views.components[component];
            const response = await fetch(PathResolver.resolve(componentPath));
            
            if (!response.ok) {
                throw new Error(`Failed to load ${component} component`);
            }

            this.#showResult(`${component} Component Test`, {
                status: 'success',
                path: componentPath
            });
        } catch (error) {
            this.#logger.error(`Component test failed for ${component}:`, error);
            this.#handleError(`Failed to test ${component} component`);
        }
    }

    async #testService(service) {
        try {
            const { PathResolver, CORE_PATHS } = window.env;
            const servicePath = CORE_PATHS.services[service];
            const module = await import(PathResolver.resolve(servicePath));
            
            this.#showResult(`${service} Service Test`, {
                status: 'success',
                path: servicePath,
                exports: Object.keys(module)
            });
        } catch (error) {
            this.#logger.error(`Service test failed for ${service}:`, error);
            this.#handleError(`Failed to test ${service} service`);
        }
    }

    async #testStyleLoading() {
        try {
            const stylesheets = document.styleSheets;
            let loadedCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < stylesheets.length; i++) {
                const sheet = stylesheets[i];
                try {
                    if (sheet.href) {
                        // Test accessing rules to verify loading
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

        } catch (error) {
            this.#logger.error('Style test failed:', error);
            this.#handleError('Style test failed');
        }
    }

    async #verifyStylesheets() {
        const expectedStyles = window.env.STYLE_PATHS;
        const loadedStyles = Array.from(document.styleSheets)
            .map(sheet => sheet.href)
            .filter(Boolean);

        const missingStyles = [];
        const { PathResolver } = window.env;

        Object.values(expectedStyles).flat().forEach(stylePath => {
            const fullPath = PathResolver.resolve(stylePath);
            if (!loadedStyles.some(href => href.includes(stylePath))) {
                missingStyles.push(stylePath);
            }
        });

        this.#showResult('Style Verification', {
            expected: Object.values(expectedStyles).flat().length,
            loaded: loadedStyles.length,
            missing: missingStyles
        });
    }

    async #testState(state) {
        try {
            let result;
            switch (state) {
                case 'theme':
                    result = await ThemeManager.getTheme();
                    break;
                case 'font':
                    result = await FontManager.getFont();
                    break;
                case 'storage':
                    result = {
                        localStorage: Object.keys(localStorage),
                        sessionStorage: Object.keys(sessionStorage)
                    };
                    break;
            }

            this.#showResult(`${state} State Test`, result);
        } catch (error) {
            this.#logger.error(`State test failed for ${state}:`, error);
            this.#handleError(`Failed to test ${state} state`);
        }
    }

    async #viewLogs() {
        try {
            const logs = await Logger.getLogs();
            this.#showResult('Application Logs', logs);
        } catch (error) {
            this.#logger.error('Failed to view logs:', error);
            this.#handleError('Failed to view logs');
        }
    }

    async #clearStorage() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            this.#showResult('Storage Cleared', {
                status: 'success',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.#logger.error('Failed to clear storage:', error);
            this.#handleError('Failed to clear storage');
        }
    }

    async #resetState() {
        try {
            await ThemeManager.reset();
            await FontManager.reset();
            this.#clearStorage();
            this.#showResult('State Reset', {
                status: 'success',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.#logger.error('Failed to reset state:', error);
            this.#handleError('Failed to reset state');
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
