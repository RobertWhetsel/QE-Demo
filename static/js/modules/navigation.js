// Navigation module
const navigation = {
    /**
     * Initializes the submenu functionality
     */
    initSubmenu: async function() {
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
    },

    /**
     * Initializes tab navigation
     */
    initTabNavigation: async function() {
        const navLinks = document.querySelectorAll('[data-nav]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = `${e.target.dataset.nav}.html`;
                this.navigateTo(page);
            });
        });
    },

    /**
     * Initializes navigation listeners
     */
    initNavigationListeners: async function() {
        // Close submenu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const submenu = document.querySelector('.submenu');
                if (submenu) {
                    submenu.setAttribute('hidden', '');
                }
            }
        });
    },

    /**
     * Navigates to a specified page
     */
    navigateTo: function(page) {
        try {
            window.location.href = page;
        } catch (error) {
            console.error('Navigation error:', error);
            const message = document.createElement('div');
            message.className = 'message message-error';
            message.textContent = 'Navigation failed. Please try again.';
            document.body.appendChild(message);
            setTimeout(() => message.remove(), 3000);
        }
    },

    /**
     * Clears the session cache
     */
    clearSessionCache: function() {
        // Store admins list and setup status before clearing
        const admins = localStorage.getItem('admins');
        const setupComplete = localStorage.getItem('setupComplete');
        
        // Clear storages
        sessionStorage.clear();
        localStorage.clear();
        
        // Restore persistent data
        if (admins) localStorage.setItem('admins', admins);
        if (setupComplete) localStorage.setItem('setupComplete', setupComplete);
    },

    /**
     * Sidebar specific functions
     */
    closeNav: function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = '0';
            sidebar.classList.remove('sidebar--open');
        }
    },

    openNav: function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = '250px';
            sidebar.classList.add('sidebar--open');
        }
    },

    toggleNav: function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (sidebar.classList.contains('sidebar--open')) {
                this.closeNav();
            } else {
                this.openNav();
            }
        }
    },

    logout: function() {
        this.clearSessionCache();
        this.navigateTo('login.html');
    },

    exitApplication: async function() {
        if (confirm('Are you sure you want to exit the application?')) {
            try {
                // Save session data to CSV
                const dataService = window.DataService.getInstance();
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
    },

    /**
     * Initialize sidebar based on user role
     */
    initializeSidebar: function() {
        const userRole = sessionStorage.getItem('userRole');
        if (!userRole) {
            console.error('No user role found');
            this.navigateTo('login.html');
            return;
        }

        // Map role to template ID
        let templateId;
        switch(userRole) {
            case 'genesis':
                templateId = 'genesisAdmin-menu';
                break;
            case 'platformAdmin':
                templateId = 'platformAdmin-menu';
                break;
            case 'userAdmin':
                templateId = 'userAdmin-menu';
                break;
            default:
                console.error('Invalid user role:', userRole);
                this.navigateTo('login.html');
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
};

// Expose to window
window.navigation = navigation;
