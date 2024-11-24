import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

class VolunteerDashboard {
    constructor() {
        Logger.info('Initializing Volunteer Dashboard');
        this.initializeElements();
        this.attachEventListeners();
        this.setupIframeProtection();
    }

    initializeElements() {
        this.iframe = document.getElementById('content-frame');
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');
        this.sidebar = document.getElementById('sidebar');

        Logger.debug('Elements initialized:', {
            hasIframe: !!this.iframe,
            sidebarLinksCount: this.sidebarLinks.length,
            hasSidebar: !!this.sidebar
        });
    }

    attachEventListeners() {
        // Handle sidebar navigation
        this.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('data-content');
                if (url) {
                    Logger.debug('Sidebar navigation:', { url });
                    this.navigateTo(url);
                    this.closeNav();
                }
            });
        });

        // Listen for messages from the iframe
        window.addEventListener('message', (event) => {
            if (event.source !== this.iframe?.contentWindow) return;

            Logger.debug('Received iframe message:', event.data);

            switch (event.data.type) {
                case 'navigation':
                    this.navigateTo(event.data.url);
                    break;
                case 'loadSurvey':
                    const surveyPath = paths.join(paths.pages, `survey.html?id=${event.data.surveyId}`);
                    this.navigateTo(surveyPath);
                    break;
                case 'surveyCompleted':
                    Logger.info('Survey completed:', event.data.surveyId);
                    alert(`Survey ${event.data.surveyId} completed!`);
                    const surveysPath = paths.join(paths.pages, 'availableSurveys.html');
                    this.navigateTo(surveysPath);
                    break;
                default:
                    Logger.warn('Unknown iframe message type:', event.data.type);
            }
        });
    }

    setupIframeProtection() {
        if (!this.iframe) {
            Logger.warn('Cannot setup iframe protection: iframe not found');
            return;
        }

        Logger.info('Setting up iframe protection');
        this.iframe.onload = () => {
            try {
                const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
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
                Logger.info('Iframe protection setup complete');
            } catch (e) {
                Logger.error('Cannot access iframe content:', e);
            }
        };
    }

    navigateTo(url) {
        Logger.info('Navigating to:', url);
        if (this.iframe) {
            this.iframe.src = paths.resolve(url);
        } else {
            Logger.warn('Iframe not found, using direct navigation');
            navigation.navigateTo(url);
        }
    }

    openNav() {
        Logger.debug('Opening navigation sidebar');
        if (this.sidebar) {
            this.sidebar.style.width = "250px";
        }
    }

    closeNav() {
        Logger.debug('Closing navigation sidebar');
        if (this.sidebar) {
            this.sidebar.style.width = "0";
        }
    }

    async logout() {
        try {
            Logger.info('Logging out user');
            await User.logout();
            const loginPath = paths.join(paths.pages, 'login.html');
            navigation.navigateTo(loginPath);
        } catch (error) {
            Logger.error('Error during logout:', error);
            // Force navigation to login page even if logout fails
            const loginPath = paths.join(paths.pages, 'login.html');
            navigation.navigateTo(loginPath);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new VolunteerDashboard();
    
    // Expose necessary methods to global scope
    window.openNav = () => dashboard.openNav();
    window.closeNav = () => dashboard.closeNav();
    window.logout = () => dashboard.logout();
});
