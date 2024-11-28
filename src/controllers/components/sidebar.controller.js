import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';
import { UserCreationController } from '../admin/userCreation.controller.js';

export class SidebarController {
    #logger;
    #view;
    #userCreationController;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SidebarController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize view elements
            this.#initializeView();

            // Setup components
            await this.#setupLogo();
            await this.#setupComponents();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('SidebarController initialized successfully');
        } catch (error) {
            this.#logger.error('SidebarController initialization error:', error);
            this.#handleError('Failed to initialize sidebar');
        }
    }

    #initializeView() {
        this.#view = {
            logo: document.getElementById('logo'),
            closeButton: document.getElementById('close-sidebar'),
            menuLinks: document.querySelectorAll('.sidebar__link[data-path]'),
            logoutLink: document.querySelector('.logout-link'),
            exitButton: document.querySelector('.exit-button'),
            adminFormContainer: document.getElementById('admin-form-container'),
            adminElements: document.querySelectorAll('.admin-only')
        };

        this.#logger.debug('View elements initialized:', {
            hasLogo: !!this.#view.logo,
            hasCloseButton: !!this.#view.closeButton,
            menuLinksCount: this.#view.menuLinks.length,
            hasLogoutLink: !!this.#view.logoutLink,
            hasExitButton: !!this.#view.exitButton,
            hasAdminForm: !!this.#view.adminFormContainer
        });
    }

    async #setupLogo() {
        if (this.#view.logo) {
            this.#view.logo.src = paths.getAssetPath('logo');
            this.#logger.info('Logo path set successfully');
        }
    }

    async #setupComponents() {
        await this.#loadAdminForm();
        this.#setupUserDataListener();
    }

    #setupEventListeners() {
        this.#setupNavigationLinks();
        this.#setupCloseButton();
        this.#setupLogoutLink();
        this.#setupExitButton();
    }

    #setupNavigationLinks() {
        this.#view.menuLinks.forEach(link => {
            const pageName = link.getAttribute('data-path');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.#logger.info('Navigating to:', pageName);
                navigation.navigateToPage(pageName);
            });
        });
    }

    #setupCloseButton() {
        if (this.#view.closeButton) {
            this.#view.closeButton.addEventListener('click', () => {
                this.#logger.info('Closing sidebar');
                navigation.closeSidebar();
            });
        }
    }

    #setupLogoutLink() {
        if (this.#view.logoutLink) {
            this.#view.logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                this.#logger.info('Logout initiated from sidebar');
                try {
                    await User.logout();
                    navigation.navigateToPage('login');
                } catch (error) {
                    this.#logger.error('Logout error:', error);
                    this.#handleError('Failed to logout');
                }
            });
        }
    }

    #setupExitButton() {
        if (this.#view.exitButton) {
            this.#view.exitButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.#logger.info('Exit button clicked');
                window.close();
            });
        }
    }

    #setupUserDataListener() {
        document.addEventListener('userDataReady', async (event) => {
            this.#logger.info('userDataReady event received in sidebar:', event.detail);
            await this.#loadAdminForm();
            this.#updateAdminElements(event.detail.role);
            this.#updateActiveLink();
        });
    }

    async #loadAdminForm() {
        try {
            const userRole = User.getCurrentUserRole();
            
            if (userRole === 'Genesis Admin' && this.#view.adminFormContainer) {
                this.#logger.info('Loading admin form component');
                const formPath = paths.getComponentPath('admin/user-creation-form');
                const response = await fetch(formPath);
                
                if (!response.ok) {
                    throw new Error(`Failed to load admin form: ${response.status}`);
                }

                const formContent = await response.text();
                this.#view.adminFormContainer.innerHTML = formContent;
                
                // Initialize user creation controller
                this.#userCreationController = new UserCreationController();
                this.#logger.info('Admin form loaded and initialized');
            } else {
                this.#logger.info('Admin form not loaded - user is not Genesis Admin or container not found');
            }
        } catch (error) {
            this.#logger.error('Error loading admin form:', error);
            this.#handleError('Failed to load admin form');
        }
    }

    #updateAdminElements(userRole) {
        this.#view.adminElements.forEach(el => {
            const display = userRole === 'Genesis Admin' ? 'block' : 'none';
            el.style.display = display;
            this.#logger.info('Updated admin element visibility:', { element: el, display });
        });
    }

    #updateActiveLink() {
        const currentPath = window.location.pathname;
        this.#view.menuLinks.forEach(link => {
            const pagePath = link.getAttribute('data-path');
            if (currentPath.includes(pagePath)) {
                link.classList.add('active');
                this.#logger.info('Set active link:', pagePath);
            } else {
                link.classList.remove('active');
            }
        });
    }

    #handleError(message) {
        this.#logger.error('Sidebar error:', message);
        const errorEvent = new CustomEvent('showNotification', {
            detail: {
                type: 'error',
                message: message
            }
        });
        document.dispatchEvent(errorEvent);
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SidebarController();
});