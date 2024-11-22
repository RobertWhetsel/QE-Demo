import navigation from '../../services/navigation/navigation.js';
import { User } from '../../models/user.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';

export class Auth {
    constructor() {
        this.form = document.getElementById('login-form');
        this.init();
    }

    init() {
        // Add event listener to the login form
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }

        try {
            // Get users from sessionStorage (loaded by init.js)
            const appData = JSON.parse(sessionStorage.getItem('appData') || '{"users":[],"pendingUsers":[]}');
            console.log('Login attempt with:', { username }); // Debug log
            
            // Check if user exists
            const userData = appData.users.find(
                (user) => user.username === username && user.password === password
            );

            if (userData) {
                console.log('User found:', userData); // Debug log
                
                // Set session data through User model
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', userData.role);
                sessionStorage.setItem('username', userData.username);

                // Create user instance
                const user = new User(userData);

                // Initialize user preferences if they don't exist
                const userPreferences = User.getUserPreferences() || {
                    theme: 'light',
                    fontFamily: 'Arial',
                    notifications: false
                };
                User.updateUserPreferences(userPreferences);

                // Apply user preferences
                ThemeManager.applyTheme(userPreferences.theme || 'light');
                FontManager.applyFont(userPreferences.fontFamily || 'Arial');

                // Redirect based on role with strict role-based access
                switch (userData.role) {
                    case 'Genesis Admin':
                        // Genesis Admin manages other admins through the admin control panel
                        navigation.navigateTo('/src/views/pages/adminControlPanel.html');
                        break;
                    case 'Platform Admin':
                    case 'User Admin':
                        // Both Platform Admin and User Admin go to platform admin dashboard
                        navigation.navigateTo('/src/views/pages/platformAdmin.html');
                        break;
                    default:
                        this.showError('Invalid user role');
                        sessionStorage.clear();
                }
            } else {
                console.log('User not found'); // Debug log
                this.showError('Invalid username or password');
            }
        } catch (error) {
            console.error('Error during login:', error);
            this.showError('An error occurred. Please try again later.');
        }
    }

    showError(message) {
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
