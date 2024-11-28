import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/LoggerService.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';

export class NavigationController {
    #logger;
    #view;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('NavigationController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Update initial state
            this.#updateUsername();
            
            // Close sidebar initially
            navigation.closeSidebar();

            this.#isInitialized = true;
            this.#logger.info('NavigationController initialized successfully');
        } catch (error) {
            this.#logger.error('NavigationController initialization error:', error);
            this.#handleError('Failed to initialize navigation');
        }
    }

    #initializeView() {
        this.#view = {
            hamburger: document.getElementById('hamburger'),
            userName: document.getElementById('userName'),
            navMenu: document.getElementById('navMenu'),
            logoutBtn: document.getElementById('logoutBtn'),
            notificationContainer: document.getElementById('notification-container'),
            loadingSpinner: document.getElementById('loading')
        };

        this.#logger.debug('View elements initialized:', {
            hasHamburger: !!this.#view.hamburger,
            hasUserName: !!this.#view.userName,
            hasNavMenu: !!this.#view.navMenu,
            hasLogoutBtn: !!this.#view.logoutBtn
        });
    }

    #setupEventListeners() {
        // Setup hamburger menu
        if (this.#view.hamburger) {
            this.#view.hamburger.addEventListener('click', () => this.#handleHamburgerClick());
        }

        // Setup navigation dropdown
        if (this.#view.userName && this.#view.navMenu) {
            this.#view.userName.addEventListener('click', () => this.#handleUserNameClick());
        }

        // Setup logout button
        if (this.#view.logoutBtn) {
            this.#view.logoutBtn.addEventListener('click', () => this.#handleLogout());
        }

        // Setup user data listener
        document.addEventListener('userDataReady', (event) => this.#handleUserDataReady(event));

        // Setup notification listener
        document.addEventListener('showNotification', (event) => this.#handleNotification(event));

        this.#logger.debug('Event listeners setup complete');
    }

    #handleHamburgerClick() {
        this.#logger.info('Toggling sidebar');
        navigation.toggleSidebar();
    }

    #handleUserNameClick() {
        this.#logger.info('Toggling navigation dropdown');
        this.#view.navMenu.toggleAttribute('hidden');
    }

    async #handleLogout() {
        this.#logger.info('Logout initiated');
        try {
            this.#showLoading(true);
            await User.logout();
            navigation.navigateToPage('login');
        } catch (error) {
            this.#logger.error('Logout error:', error);
            this.#handleError('Failed to logout');
        } finally {
            this.#showLoading(false);
        }
    }

    #handleUserDataReady(event) {
        this.#logger.info('userDataReady event received:', event.detail);
        this.#updateUsername();
    }

    #handleNotification(event) {
        const { message, type, duration = config.ui.toastDuration } = event.detail;
        this.#showNotification(message, type, duration);
    }

    #updateUsername() {
        if (this.#view.userName) {
            const currentUser = User.getCurrentUser();
            this.#logger.info('Updating username display:', currentUser);
            
            if (currentUser?.username) {
                this.#view.userName.textContent = currentUser.username;
                this.#logger.info('Username updated to:', currentUser.username);
            }
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showNotification(message, type, duration) {
        if (!this.#view.notificationContainer) {
            this.#view.notificationContainer = document.createElement('div');
            this.#view.notificationContainer.id = 'notification-container';
            document.body.appendChild(this.#view.notificationContainer);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;

        this.#view.notificationContainer.appendChild(notification);

        // Apply entrance animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove notification after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    #handleError(message) {
        this.#logger.error('Navigation error:', message);
        this.#showNotification(message, 'error', config.ui.toastDuration);
    }

    // Public methods for external access
    getNavigationState() {
        return {
            isSidebarOpen: navigation.isSidebarOpen,
            currentUser: User.getCurrentUser(),
            currentPath: window.location.pathname
        };
    }

    refreshNavigation() {
        this.#updateUsername();
        navigation.closeSidebar();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavigationController();
});