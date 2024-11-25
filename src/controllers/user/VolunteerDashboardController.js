import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';

export class VolunteerDashboardController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;
    #iframeProtectionSetup = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('VolunteerDashboardController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Setup iframe protection
            this.#setupIframeProtection();

            // Load initial data
            await this.#loadDashboardData();

            this.#isInitialized = true;
            this.#logger.info('VolunteerDashboardController initialized successfully');
        } catch (error) {
            this.#logger.error('VolunteerDashboardController initialization error:', error);
            this.#handleError('Failed to initialize volunteer dashboard');
        }
    }

    #initializeView() {
        this.#view = {
            iframe: document.getElementById('content-frame'),
            sidebar: document.getElementById('sidebar'),
            sidebarLinks: document.querySelectorAll('.sidebar-link'),
            statsContainer: {
                totalHours: document.querySelector('.stat-card:nth-child(1) .stat-value'),
                completedTasks: document.querySelector('.stat-card:nth-child(2) .stat-value'),
                currentProjects: document.querySelector('.stat-card:nth-child(3) .stat-value')
            },
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasIframe: !!this.#view.iframe,
            hasSidebar: !!this.#view.sidebar,
            sidebarLinksCount: this.#view.sidebarLinks.length
        });
    }

    #setupEventListeners() {
        // Handle sidebar navigation
        this.#view.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('data-content');
                if (url) {
                    this.#logger.debug('Sidebar navigation:', { url });
                    this.#navigateTo(url);
                    this.#closeSidebar();
                }
            });
        });

        // Listen for messages from iframe
        window.addEventListener('message', (event) => this.#handleIframeMessage(event));

        // Listen for error events
        document.addEventListener('showError', (event) => {
            this.#handleError(event.detail.message);
        });
    }

    #setupIframeProtection() {
        if (!this.#view.iframe || this.#iframeProtectionSetup) {
            return;
        }

        this.#logger.info('Setting up iframe protection');
        this.#view.iframe.onload = () => {
            try {
                const iframeDoc = this.#view.iframe.contentDocument || this.#view.iframe.contentWindow.document;
                const script = iframeDoc.createElement('script');
                script.textContent = `
                    document.body.addEventListener('click', function(e) {
                        if (e.target.tagName === 'A') {
                            e.preventDefault();
                            const href = e.target.getAttribute('href');
                            if (href && !href.startsWith('javascript:')) {
                                window.parent.postMessage({type: 'navigation', url: href}, '*');
                            }
                            return false;
                        }
                    });
                `;
                iframeDoc.body.appendChild(script);
                this.#iframeProtectionSetup = true;
                this.#logger.info('Iframe protection setup complete');
            } catch (error) {
                this.#logger.error('Cannot access iframe content:', error);
            }
        };
    }

    async #loadDashboardData() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading dashboard data');

            const userData = await this.#dataService.getData();
            const volunteerStats = this.#calculateVolunteerStats(userData);

            this.#updateDashboardStats(volunteerStats);
            this.#logger.info('Dashboard data loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading dashboard data:', error);
            this.#handleError('Failed to load dashboard data');
        } finally {
            this.#showLoading(false);
        }
    }

    #calculateVolunteerStats(userData) {
        // This would normally calculate real statistics from the user's data
        return {
            totalHours: 0,
            completedTasks: 0,
            currentProjects: 0
        };
    }

    #updateDashboardStats(stats) {
        if (this.#view.statsContainer.totalHours) {
            this.#view.statsContainer.totalHours.textContent = stats.totalHours;
        }
        if (this.#view.statsContainer.completedTasks) {
            this.#view.statsContainer.completedTasks.textContent = stats.completedTasks;
        }
        if (this.#view.statsContainer.currentProjects) {
            this.#view.statsContainer.currentProjects.textContent = stats.currentProjects;
        }
    }

    #handleIframeMessage(event) {
        if (event.source !== this.#view.iframe?.contentWindow) return;

        this.#logger.debug('Received iframe message:', event.data);

        switch (event.data.type) {
            case 'navigation':
                this.#navigateTo(event.data.url);
                break;
            case 'loadSurvey':
                const surveyPath = paths.getPagePath('survey') + `?id=${event.data.surveyId}`;
                this.#navigateTo(surveyPath);
                break;
            case 'surveyCompleted':
                this.#logger.info('Survey completed:', event.data.surveyId);
                this.#showSuccess(`Survey ${event.data.surveyId} completed!`);
                const surveysPath = paths.getPagePath('availableSurveys');
                this.#navigateTo(surveysPath);
                break;
            default:
                this.#logger.warn('Unknown iframe message type:', event.data.type);
        }
    }

    #navigateTo(url) {
        this.#logger.info('Navigating to:', url);
        if (this.#view.iframe) {
            this.#view.iframe.src = paths.resolve(url);
        } else {
            this.#logger.warn('Iframe not found, using direct navigation');
            navigation.navigateTo(url);
        }
    }

    #openSidebar() {
        if (this.#view.sidebar) {
            this.#logger.debug('Opening navigation sidebar');
            this.#view.sidebar.style.width = "250px";
        }
    }

    #closeSidebar() {
        if (this.#view.sidebar) {
            this.#logger.debug('Closing navigation sidebar');
            this.#view.sidebar.style.width = "0";
        }
    }

    async #handleLogout() {
        try {
            this.#logger.info('Logging out user');
            this.#showLoading(true);
            await User.logout();
            navigation.navigateToPage('login');
        } catch (error) {
            this.#logger.error('Error during logout:', error);
            navigation.navigateToPage('login');
        } finally {
            this.#showLoading(false);
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    getIframeState() {
        return {
            currentUrl: this.#view.iframe?.src,
            isLoaded: this.#iframeProtectionSetup
        };
    }

    refreshDashboard() {
        this.#loadDashboardData();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new VolunteerDashboardController();
});