import { DataService } from '../../models/dataservice.js';

export class NavigationService {
    /**
     * Initializes the submenu functionality
     */
    async initSubmenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const submenu = document.querySelector('.submenu');
        
        if (menuToggle && submenu) {
            menuToggle.addEventListener('click', () => {
                const isHidden = submenu.hasAttribute('hidden');
                if (isHidden) {
                    submenu.removeAttribute('hidden');
                } else {
                    submenu.setAttribute('hidden', '');
                }
            });

            // Close submenu when clicking outside
            document.addEventListener('click', (event) => {
                if (!event.target.closest('.menu-container')) {
                    submenu.setAttribute('hidden', '');
                }
            });
        }
    }

    /**
     * Initializes tab navigation
     */
    async initTabNavigation() {
        const navLinks = document.querySelectorAll('[data-nav]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = `/src/views/pages/${e.target.dataset.nav}.html`;
                this.navigateTo(page);
            });
        });
    }

    /**
     * Initializes navigation listeners
     */
    async initNavigationListeners() {
        // Close submenu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const submenu = document.querySelector('.submenu');
                if (submenu) {
                    submenu.setAttribute('hidden', '');
                }
            }
        });
    }

    /**
     * Navigates to a specified page
     */
    navigateTo(page) {
        try {
            // Ensure the path starts with /src/views/pages/ if it's not an absolute path
            if (!page.startsWith('/')) {
                page = `/src/views/pages/${page}`;
            }
            window.location.href = page;
        } catch (error) {
            console.error('Navigation error:', error);
            const message = document.createElement('div');
            message.className = 'message message-error';
            message.textContent = 'Navigation failed. Please try again.';
            document.body.appendChild(message);
            setTimeout(() => message.remove(), 3000);
        }
    }

    /**
     * Clears the session cache
     */
    clearSessionCache() {
        // Store admins list and setup status before clearing
        const admins = localStorage.getItem('admins');
        const setupComplete = localStorage.getItem('setupComplete');
        
        // Clear storages
        sessionStorage.clear();
        localStorage.clear();
        
        // Restore persistent data
        if (admins) localStorage.setItem('admins', admins);
        if (setupComplete) localStorage.setItem('setupComplete', setupComplete);
    }

    /**
     * Sidebar specific functions
     */
    closeNav() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = '0';
            sidebar.classList.remove('sidebar--open');
        }
    }

    openNav() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = '250px';
            sidebar.classList.add('sidebar--open');
        }
    }

    toggleNav() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (sidebar.classList.contains('sidebar--open')) {
                this.closeNav();
            } else {
                this.openNav();
            }
        }
    }

    logout() {
        this.clearSessionCache();
        this.navigateTo('/src/views/pages/login.html');
    }

    async exitApplication() {
        if (confirm('Are you sure you want to exit the application?')) {
            try {
                // Save session data to CSV
                const dataService = DataService.getInstance();
                await dataService.saveSessionData();

                // Clear cache
                this.clearSessionCache();

                // Close browser window
                window.close();
            } catch (error) {
                console.error('Error during exit:', error);
                alert('Error saving data. Please try again.');
            }
        }
    }

    /**
     * Initialize sidebar based on user role
     */
    initializeSidebar() {
        const userRole = sessionStorage.getItem('userRole');
        if (!userRole) {
            console.error('No user role found');
            this.navigateTo('/src/views/pages/login.html');
            return;
        }

        // Map role to template ID using the same role names as login.js
        let templateId;
        switch(userRole) {
            case 'genesis':
                templateId = 'genesisAdmin-menu';
                break;
            case 'platform':
                templateId = 'platformAdmin-menu';
                break;
            case 'user':
                templateId = 'userAdmin-menu';
                break;
            default:
                console.error('Invalid user role:', userRole);
                this.navigateTo('/src/views/pages/login.html');
                return;
        }

        const menuTemplate = document.getElementById(templateId);
        const menuItems = document.getElementById('menu-items');
        
        if (menuTemplate && menuItems) {
            // Clear existing content
            menuItems.innerHTML = '';
            
            // Clone and append template content
            const content = menuTemplate.content.cloneNode(true);
            menuItems.appendChild(content);
            
            // Setup navigation event listeners
            menuItems.addEventListener('click', (event) => {
                if (event.target.classList.contains('sidebar__link')) {
                    event.preventDefault();
                    const targetPage = event.target.getAttribute('data-content');
                    if (targetPage) {
                        this.navigateTo(targetPage);
                    }
                }
            });
        } else {
            console.error('Menu template or container not found for role:', userRole);
        }

        // Ensure sidebar starts closed
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = '0';
            sidebar.classList.remove('sidebar--open');
            
            // Force a reflow to ensure the initial state is applied
            sidebar.offsetHeight;
        }
    }
}
