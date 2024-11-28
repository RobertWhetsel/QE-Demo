import paths from '../../../config/paths.js';
import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/loggerService.utils.js';
import navigation from '../../services/navigation/NavigationService.js';

export class AdminController {
    #dataService;
    #logger;
    #view;
    #user;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('AdminController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Setup event listeners for user data
            document.addEventListener('userDataReady', (event) => {
                this.#logger.info('User data ready event received:', event.detail);
                this.#handleUserDataReady(event.detail);
            });

            // Load dependencies
            await this.#loadDependencies();

            this.#logger.info('AdminController initialized');
        } catch (error) {
            this.#logger.error('AdminController initialization error:', error);
            this.#handleError('Failed to initialize admin panel');
        }
    }

    async #loadDependencies() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Setup form handler
            this.#setupFormHandler();

            // Load initial data
            await this.#displayData();
        } catch (error) {
            this.#logger.error('Error loading dependencies:', error);
            throw error;
        }
    }

    #initializeView() {
        this.#view = {
            adminListContainer: document.getElementById('admin-list-container'),
            systemStatus: document.getElementById('system-status'),
            adminCreationForm: document.getElementById('admin-creation-form'),
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message'),
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            role: document.getElementById('role')
        };

        this.#logger.debug('View elements initialized:', {
            hasAdminList: !!this.#view.adminListContainer,
            hasSystemStatus: !!this.#view.systemStatus,
            hasAdminForm: !!this.#view.adminCreationForm
        });
    }

    #setupEventListeners() {
        if (this.#view.adminCreationForm) {
            this.#view.adminCreationForm.addEventListener('submit', (e) => this.#handleFormSubmit(e));
        }

        // Listen for error events
        document.addEventListener('showError', (event) => {
            this.#showError(event.detail.message, event.detail.duration);
        });
    }

    async #handleUserDataReady(userData) {
        this.#user = userData;
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Auth check:', { isAuthenticated, userRole });

        if (!isAuthenticated || userRole !== 'Genesis Admin') {
            this.#logger.warn('Auth failed:', { isAuthenticated, userRole });
            navigation.navigateToPage('login');
            return;
        }

        this.#logger.info('Auth successful, initializing admin panel');
        await this.#displayData();
    }

    async #displayData() {
        try {
            const data = this.#dataService.getData();
            this.#logger.info('Displaying admin data', { recordCount: data?.users?.length });
            
            if (!this.#view.adminListContainer) return;
            
            if (!data?.users || data.users.length === 0) {
                this.#view.adminListContainer.innerHTML = '<p class="no-data-message">No data available.</p>';
                return;
            }
            
            this.#view.adminListContainer.innerHTML = this.#createTableHTML(data.users);

            // Update system status
            if (this.#view.systemStatus) {
                this.#view.systemStatus.innerHTML = this.#createSystemStatusHTML(data);
            }
        } catch (error) {
            this.#logger.error('Error loading data:', error);
            this.#handleError('Failed to load admin data');
        }
    }

    #createTableHTML(users) {
        return `
            <table class="data-list">
                <thead>
                    <tr>
                        ${['Username', 'Email', 'Role', 'Status', 'Created']
                            .map(header => `<th>${header}</th>`)
                            .join('')}
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>${user.status || 'Active'}</td>
                            <td>${user.created ? new Date(user.created).toLocaleString() : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    #createSystemStatusHTML(data) {
        return `
            <p>Current Site Status: <strong>${paths.SITE_STATE}</strong></p>
            <p>Base URL: <strong>${paths.BASE_URL}</strong></p>
            <p>Total Users: <strong>${data.users.length}</strong></p>
            <p>Pending Users: <strong>${data.pendingUsers?.length || 0}</strong></p>
        `;
    }

    async #handleFormSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing admin creation form submission');
        
        try {
            const formData = this.#getFormData();
            this.#validateFormData(formData);
            
            // Check for existing user
            const data = this.#dataService.getData();
            if (data.users.some(user => user.username === formData.username)) {
                throw new Error('Username already exists');
            }
            
            // Add new user
            await this.#dataService.addUser({
                ...formData,
                status: 'active',
                created: new Date().toISOString()
            });

            this.#logger.info('Admin user created successfully');
            this.#showSuccess('Admin user created successfully!');
            event.target.reset();
            await this.#displayData();
        } catch (error) {
            this.#logger.error('Error creating admin record:', error);
            this.#handleError(error.message);
        }
    }

    #getFormData() {
        return {
            username: this.#view.username.value.trim(),
            email: this.#view.email.value.trim(),
            password: this.#view.password.value,
            role: this.#view.role.value
        };
    }

    #validateFormData(formData) {
        if (!formData.username || !formData.email || !formData.password || !formData.role) {
            throw new Error('All fields are required');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            throw new Error('Please enter a valid email address');
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type, duration = 3000) {
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
        }, duration);
    }

    #showSuccess(message) {
        this.#logger.info('Showing success:', message);
        this.#showMessage(message, 'success');
    }

    #showError(message) {
        this.#logger.warn('Showing error:', message);
        this.#showMessage(message, 'error');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showError(message);
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminController();
});