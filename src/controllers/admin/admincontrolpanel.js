import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import { ROLES } from '../../models/index.js';
import DataService from '../../services/data/dataservice.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

class AdminControlPanel {
    constructor() {
        this.initialize();
    }

    async initialize() {
        Logger.info('Initializing Admin Control Panel');
        
        try {
            // Verify Genesis Admin authentication
            if (!this.checkAuth()) {
                Logger.warn('Unauthorized access attempt to admin control panel');
                navigation.navigateToPage('login');
                return;
            }

            this.setupErrorHandler();
            this.setupNavigation();
            this.setupFormHandler();
            await this.displayData();
            Logger.info('Admin Control Panel initialized successfully');
        } catch (error) {
            Logger.error('Initialization error:', error);
            this.showMessage('Failed to initialize admin panel', 'error');
        }
    }

    checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();
        return isAuthenticated && userRole === ROLES.GENESIS_ADMIN;
    }

    setupNavigation() {
        // Set up hamburger menu toggle
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.dashboard__content');

        if (hamburger && sidebar) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.toggle('is-open');
                if (content) {
                    content.classList.toggle('dashboard__content--shifted');
                }
            });
        }

        // Set up close button
        const closeBtn = document.getElementById('close-sidebar');
        if (closeBtn && sidebar) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('is-open');
                if (content) {
                    content.classList.remove('dashboard__content--shifted');
                }
            });
        }

        // Set up user name and menu
        const currentUser = User.getCurrentUser();
        const userNameEl = document.getElementById('userName');
        if (userNameEl && currentUser) {
            userNameEl.textContent = currentUser.username || 'Genesis';
        }

        // Set up user menu toggle
        const navMenu = document.getElementById('navMenu');
        if (userNameEl && navMenu) {
            userNameEl.addEventListener('click', () => {
                navMenu.toggleAttribute('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav__menu')) {
                    navMenu.setAttribute('hidden', '');
                }
            });
        }

        // Set up logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutLink = document.querySelector('.logout-link');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Set up exit functionality
        const exitButton = document.querySelector('.exit-button');
        if (exitButton) {
            exitButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.close();
            });
        }

        // Set up navigation links
        const menuLinks = document.querySelectorAll('.sidebar__link[data-path]');
        menuLinks.forEach(link => {
            const pageName = link.getAttribute('data-path');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigation.navigateToPage(pageName);
            });
        });

        // Show/hide admin-only elements based on role
        const userRole = User.getCurrentUserRole();
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = userRole === ROLES.GENESIS_ADMIN ? 'block' : 'none';
        });
    }

    handleLogout() {
        User.logout();
        navigation.navigateToPage('login');
    }

    setupErrorHandler() {
        window.onerror = (msg, url, line, col, error) => {
            Logger.error('Global error:', { msg, url, line, col, error });
            return false;
        };
    }

    setupFormHandler() {
        const form = document.getElementById('admin-creation-form');
        Logger.debug('Setting up form handler:', { formFound: !!form });
        
        if (form) {
            form.onsubmit = (e) => this.handleFormSubmit(e);
        }
    }

    async displayData() {
        try {
            const dataService = DataService.getInstance();
            const data = await dataService.getData();
            Logger.info('Displaying admin data', { recordCount: data.length });
            
            const container = document.getElementById('admin-list-container');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p class="no-data-message">No data available.</p>';
                return;
            }
            
            const table = this.createDataTable(data);
            container.innerHTML = '';
            container.appendChild(table);

            // Update system status
            const statusSection = document.getElementById('system-status');
            if (statusSection) {
                statusSection.innerHTML = `
                    <p>Current Site Status: <strong>${paths.SITE_STATE}</strong></p>
                    <p>Base URL: <strong>${paths.BASE_URL}</strong></p>
                `;
            }
        } catch (error) {
            Logger.error('Error displaying data:', error);
            this.showMessage('Failed to load admin data', 'error');
        }
    }

    createDataTable(data) {
        const table = document.createElement('table');
        table.className = 'data-list';
        
        // Create table header
        const thead = document.createElement('thead');
        const headers = ['ID', 'Username', 'Email', 'Type', 'Created'];
        thead.innerHTML = `
            <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.name}</td>
                <td>${row.email}</td>
                <td>${row.type}</td>
                <td>${new Date(row.created).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        return table;
    }

    async handleFormSubmit(event) {
        try {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            Logger.info('Processing admin creation form submission');
            
            const formData = this.getFormData();
            this.validateFormData(formData);
            
            const dataService = DataService.getInstance();
            
            // Check for existing user
            const existingData = await dataService.getData();
            if (existingData.some(user => user.name === formData.name)) {
                throw new Error('Username already exists');
            }
            
            // Add new record
            Logger.info('Adding new admin record');
            if (await dataService.addRecord(formData)) {
                Logger.info('Admin user created successfully');
                this.showMessage('Admin user created successfully!', 'success');
                document.getElementById('admin-creation-form').reset();
                await this.displayData();
            } else {
                throw new Error('Failed to save record');
            }
            
        } catch (error) {
            Logger.error('Error creating admin record:', error);
            this.showMessage(error.message, 'error');
        }
        
        return false;
    }

    getFormData() {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        return {
            id: Date.now().toString(),
            name: username,
            email: email,
            password: password,
            type: role,
            created: new Date().toISOString()
        };
    }

    validateFormData(formData) {
        if (!formData.name || !formData.email || !formData.password || !formData.type) {
            throw new Error('All fields are required');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            throw new Error('Please enter a valid email address');
        }
    }

    showMessage(message, type = 'info') {
        Logger.info('Showing message:', { message, type });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 4px;
            animation: slideIn 0.3s ease-out;
            z-index: 1000;
            background-color: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
}

export { AdminControlPanel };
