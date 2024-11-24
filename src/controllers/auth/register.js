import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import { ROLES } from '../../models/index.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

export class Registration {
    constructor() {
        this.form = document.getElementById('registration-form');
        this.init();
    }

    init() {
        if (this.form) {
            Logger.info('Initializing registration form');
            this.form.addEventListener('submit', (e) => this.handleRegistration(e));
        } else {
            Logger.warn('Registration form not found');
        }
    }

    async handleRegistration(event) {
        event.preventDefault();
        Logger.info('Processing registration submission');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;

        if (!username || !password) {
            Logger.warn('Registration validation failed: missing fields');
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            // Get existing users from User model
            const users = User.getDefaultUsers();
            
            // Check if username already exists
            if (users.some(user => user.username === username)) {
                Logger.warn('Registration failed: username exists', { username });
                this.showError('Username already exists');
                return;
            }

            // Create new user
            const newUser = {
                username,
                password,
                role,
                status: 'active',
                email: `${username}@system.local`,
                created: new Date().toISOString()
            };

            // Add user using User model
            users.push(newUser);
            User.saveUsers(users);
            Logger.info('New user created:', { username, role });

            // Initialize preferences
            const userPreferences = {
                theme: 'light',
                fontFamily: 'Arial',
                notifications: false
            };
            User.updateUserPreferences(userPreferences);
            Logger.info('User preferences initialized');

            // Log in the new user
            const loggedInUser = await User.login(username, password);
            if (!loggedInUser) {
                throw new Error('Failed to log in after registration');
            }

            // Navigate based on role
            if (role === ROLES.GENESIS_ADMIN) {
                Logger.info('Genesis Admin registered successfully');
                alert('Welcome! Thank you for Registering! You are the Genesis Admin.');
                const adminPath = paths.join(paths.pages, 'platformAdmin.html');
                navigation.navigateTo(adminPath);
            } else {
                Logger.info('User registered successfully');
                const platformPath = paths.join(paths.pages, 'platformAdmin.html');
                navigation.navigateTo(platformPath);
            }
        } catch (error) {
            Logger.error('Registration error:', {
                error: error.message,
                stack: error.stack,
                username
            });
            this.showError('An error occurred during registration');
        }
    }

    showError(message) {
        Logger.warn('Showing registration error:', message);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        this.form.insertBefore(errorDiv, this.form.firstChild);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }
}
