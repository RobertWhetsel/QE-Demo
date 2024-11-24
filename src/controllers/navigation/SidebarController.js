import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';
import { UserCreationController } from '../admin/UserCreationController.js';

export class SidebarController {
    constructor() {
        Logger.info('SidebarController initializing');
        this.init();
    }

    async init() {
        try {
            await this.setupLogo();
            this.setupEventListeners();
            this.setupUserDataListener();
            await this.loadAdminForm();
            Logger.info('SidebarController initialized successfully');
        } catch (error) {
            Logger.error('Sidebar initialization error:', error);
        }
    }

    async setupLogo() {
        const logo = document.getElementById('logo');
        if (logo) {
            logo.src = paths.getAssetPath('logo');
            Logger.info('Logo path set successfully');
        }
    }

    setupEventListeners() {
        this.setupNavigationLinks();
        this.setupCloseButton();
        this.setupLogoutLink();
        this.setupExitButton();
    }

    setupNavigationLinks() {
        const menuLinks = document.querySelectorAll('.sidebar__link[data-path]');
        menuLinks.forEach(link => {
            const pageName = link.getAttribute('data-path');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                Logger.info('Navigating to:', pageName);
                navigation.navigateToPage(pageName);
            });
        });
    }

    setupCloseButton() {
        const closeBtn = document.getElementById('close-sidebar');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                Logger.info('Closing sidebar');
                navigation.closeSidebar();
            });
        }
    }

    setupLogoutLink() {
        const logoutLink = document.querySelector('.logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                Logger.info('Logout initiated from sidebar');
                try {
                    await User.logout();
                    navigation.navigateToPage('login');
                } catch (error) {
                    Logger.error('Logout error:', error);
                }
            });
        }
    }

    setupExitButton() {
        const exitButton = document.querySelector('.exit-button');
        if (exitButton) {
            exitButton.addEventListener('click', (e) => {
                e.preventDefault();
                Logger.info('Exit button clicked');
                window.close();
            });
        }
    }

    setupUserDataListener() {
        document.addEventListener('userDataReady', async (event) => {
            Logger.info('userDataReady event received in sidebar:', event.detail);
            await this.loadAdminForm();
            this.updateAdminElements(event.detail.role);
            this.updateActiveLink();
        });
    }

    async loadAdminForm() {
        try {
            const userRole = User.getCurrentUserRole();
            const formContainer = document.getElementById('admin-form-container');

            if (userRole === 'Genesis Admin' && formContainer) {
                Logger.info('Loading admin form component');
                const formPath = paths.getComponentPath('admin/user-creation-form');
                const response = await fetch(formPath);
                
                if (!response.ok) {
                    throw new Error(`Failed to load admin form: ${response.status}`);
                }

                const formContent = await response.text();
                formContainer.innerHTML = formContent;
                new UserCreationController();
                Logger.info('Admin form loaded and initialized');
            } else {
                Logger.info('Admin form not loaded - user is not Genesis Admin or container not found');
            }
        } catch (error) {
            Logger.error('Error loading admin form:', error);
        }
    }

    updateAdminElements(userRole) {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            const display = userRole === 'Genesis Admin' ? 'block' : 'none';
            el.style.display = display;
            Logger.info('Updated admin element visibility:', { element: el, display });
        });
    }

    updateActiveLink() {
        const currentPath = window.location.pathname;
        const menuLinks = document.querySelectorAll('.sidebar__link[data-path]');
        
        menuLinks.forEach(link => {
            const pagePath = link.getAttribute('data-path');
            if (currentPath.includes(pagePath)) {
                link.classList.add('active');
                Logger.info('Set active link:', pagePath);
            } else {
                link.classList.remove('active');
            }
        });
    }
}