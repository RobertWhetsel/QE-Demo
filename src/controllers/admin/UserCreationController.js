import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';

export class UserCreationController {
    constructor() {
        Logger.info('UserCreationController initializing');
        this.init();
    }

    async init() {
        try {
            this.dataService = DataService.getInstance();
            await this.dataService.init();
            this.setupFormHandler();
            Logger.info('UserCreationController initialized');
        } catch (error) {
            Logger.error('UserCreationController initialization error:', error);
        }
    }

    setupFormHandler() {
        const form = document.getElementById('admin-creation-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            Logger.info('Form handler setup complete');
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        Logger.info('Processing admin creation form submission');
        
        try {
            const formData = this.getFormData();
            this.validateFormData(formData);
            
            // Check for existing user
            const data = this.dataService.getData();
            if (data.users.some(user => user.username === formData.username)) {
                throw new Error('Username already exists');
            }
            
            // Add new user
            await this.dataService.addUser({
                ...formData,
                status: 'active',
                created: new Date().toISOString()
            });

            Logger.info('Admin user created successfully');
            this.showSuccess('Admin user created successfully!');
            event.target.reset();
        } catch (error) {
            Logger.error('Error creating user:', error);
            this.showError(error.message);
        }
    }

    getFormData() {
        return {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            role: document.getElementById('role').value
        };
    }

    validateFormData(formData) {
        if (!formData.username || !formData.email || !formData.password || !formData.role) {
            throw new Error('All fields are required');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!['Platform Admin', 'User Admin'].includes(formData.role)) {
            throw new Error('Invalid role selected');
        }

        Logger.info('Form data validated successfully');
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
        const messageDiv = document.getElementById('error-message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `sidebar__message sidebar__message--${type}`;
            messageDiv.style.display = 'block';

            // Hide message after 3 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }
}