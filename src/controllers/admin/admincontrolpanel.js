import paths from '/config/paths.js';
import { User } from '/src/models/user.js';
import { ROLES } from '/src/models/index.js';
import DataService from '/src/models/dataservice.js';
import Logger from '/src/utils/logging/logger.js';
import navigation from '/src/services/navigation/navigation.js';

export class AdminControlPanel {
    constructor() {
        Logger.info('AdminControlPanel constructor called');
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

            // Initialize form handler
            this.setupFormHandler();

            // Load initial data
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
        Logger.info('Checking auth:', { isAuthenticated, userRole });
        return isAuthenticated && userRole === ROLES.GENESIS_ADMIN;
    }

    setupFormHandler() {
        const form = document.getElementById('admin-creation-form');
        Logger.debug('Setting up form handler:', { formFound: !!form });
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async displayData() {
        try {
            const dataService = DataService.getInstance();
            const data = await dataService.getData();
            Logger.info('Displaying admin data', { recordCount: data?.length });
            
            const container = document.getElementById('admin-list-container');
            if (!container) return;
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p class="no-data-message">No data available.</p>';
                return;
            }
            
            container.innerHTML = this.createTableHTML(data);

            // Update system status
            const statusSection = document.getElementById('system-status');
            if (statusSection) {
                statusSection.innerHTML = `
                    <p>Current Site Status: <strong>${paths.SITE_STATE}</strong></p>
                    <p>Base URL: <strong>${paths.BASE_URL}</strong></p>
                `;
            }
        } catch (error) {
            Logger.error('Error loading data:', error);
            this.showError('Failed to load admin data');
        }
    }

    createTableHTML(data) {
        return `
            <table class="data-list">
                <thead>
                    <tr>
                        ${['ID', 'Username', 'Email', 'Type', 'Created']
                            .map(header => `<th>${header}</th>`)
                            .join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.id}</td>
                            <td>${row.name}</td>
                            <td>${row.email}</td>
                            <td>${row.type}</td>
                            <td>${new Date(row.created).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        Logger.info('Processing admin creation form submission');
        
        try {
            const formData = this.getFormData();
            this.validateFormData(formData);
            
            const dataService = DataService.getInstance();
            
            // Check for existing user
            const existingData = await dataService.getData();
            if (existingData.some(user => user.name === formData.name)) {
                throw new Error('Username already exists');
            }
            
            // Add new record
            if (await dataService.addRecord(formData)) {
                Logger.info('Admin user created successfully');
                this.showSuccess('Admin user created successfully!');
                event.target.reset();
                await this.displayData();
            } else {
                throw new Error('Failed to save record');
            }
        } catch (error) {
            Logger.error('Error creating admin record:', error);
            this.showError(error.message);
        }
    }

    getFormData() {
        return {
            id: Date.now().toString(),
            name: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            type: document.getElementById('role').value,
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

    showError(message) {
        Logger.warn('Showing error:', message);
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        Logger.info('Showing success:', message);
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
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
