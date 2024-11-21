export class NavigationService {
    /**
     * Initialize navigation component
     */
    initializeNavigation() {
        const userNameEl = document.getElementById('userName');
        const navMenu = document.getElementById('navMenu');
        const logoutBtn = document.getElementById('logoutBtn');

        // Display username
        const userName = sessionStorage.getItem('username') || "User";
        if (userNameEl) {
            userNameEl.textContent = userName;
        }

        // Setup logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Setup dropdown toggle
        if (userNameEl && navMenu) {
            userNameEl.addEventListener('click', () => {
                navMenu.toggleAttribute('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav__menu')) {
                    navMenu.setAttribute('hidden', '');
                }
            });
        }
    }

    /**
     * Initialize sidebar with role-specific menu
     */
    initializeSidebar(menuType = 'genesisAdmin-menu') {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger');
        const closeBtn = document.getElementById('close-sidebar');
        
        // Setup menu template
        const menuTemplate = document.getElementById(menuType);
        if (menuTemplate && sidebar) {
            const menuContent = menuTemplate.content.cloneNode(true);
            const menuContainer = sidebar.querySelector('#menu-items') || sidebar;
            menuContainer.appendChild(menuContent);
        }

        // Setup sidebar toggle
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar--open');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('sidebar--open');
            });
        }

        // Setup navigation links
        const links = sidebar.querySelectorAll('.sidebar__link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const page = link.getAttribute('data-content');
                if (page) {
                    e.preventDefault();
                    this.navigateTo(page);
                }
            });
        });

        // Setup logout and exit links
        const logoutLink = sidebar.querySelector('.logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        const exitLink = sidebar.querySelector('.exit-button');
        if (exitLink) {
            exitLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.exitApplication();
            });
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return sessionStorage.getItem('isAuthenticated') === 'true' || 
               sessionStorage.getItem('username') !== null;
    }

    /**
     * Navigates to a specified page
     */
    navigateTo(page) {
        try {
            // Check authentication
            if (!this.isAuthenticated() && !page.includes('login.html') && !page.includes('genesisAdmin.html')) {
                window.location.href = "/src/views/pages/login.html";
                return;
            }

            // Ensure path starts with /src/views/pages/
            if (!page.startsWith('/')) {
                page = '/' + page;
            }
            if (!page.startsWith('/src/views/pages/')) {
                // Add .html extension if not present
                if (!page.endsWith('.html')) {
                    page += '.html';
                }
                page = `/src/views/pages${page}`;
            }

            console.log('Navigating to:', page);
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
        sessionStorage.clear();
    }

    /**
     * Logout user
     */
    logout() {
        this.clearSessionCache();
        this.navigateTo('/login');
    }

    /**
     * Exit application
     */
    exitApplication() {
        this.clearSessionCache();
        window.close();
        // Fallback if window.close() is blocked
        this.navigateTo('/login');
    }
}

// Export a singleton instance
const navigation = new NavigationService();
export default navigation;
