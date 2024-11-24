import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import navigation from '../../services/navigation/navigation.js';

export class NavigationController {
    constructor() {
        Logger.info('NavigationController initializing');
        this.init();
    }

    async init() {
        try {
            await this.setupEventListeners();
            this.updateUsername();
            navigation.closeSidebar();
            Logger.info('NavigationController initialized successfully');
        } catch (error) {
            Logger.error('Navigation initialization error:', error);
        }
    }

    setupEventListeners() {
        this.setupHamburgerMenu();
        this.setupNavigationDropdown();
        this.setupLogoutButton();
        this.setupUserDataListener();
    }

    setupHamburgerMenu() {
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                Logger.info('Toggling sidebar');
                navigation.toggleSidebar();
            });
        }
    }

    setupNavigationDropdown() {
        const userName = document.getElementById('userName');
        const navMenu = document.getElementById('navMenu');
        if (userName && navMenu) {
            userName.addEventListener('click', () => {
                Logger.info('Toggling navigation dropdown');
                navMenu.toggleAttribute('hidden');
            });
        }
    }

    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                Logger.info('Logout initiated');
                try {
                    await User.logout();
                    navigation.navigateToPage('login');
                } catch (error) {
                    Logger.error('Logout error:', error);
                }
            });
        }
    }

    setupUserDataListener() {
        document.addEventListener('userDataReady', (event) => {
            Logger.info('userDataReady event received:', event.detail);
            this.updateUsername();
        });
    }

    updateUsername() {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            const currentUser = User.getCurrentUser();
            Logger.info('Updating username display:', currentUser);
            if (currentUser && currentUser.username) {
                userNameEl.textContent = currentUser.username;
                Logger.info('Username updated to:', currentUser.username);
            }
        }
    }
}