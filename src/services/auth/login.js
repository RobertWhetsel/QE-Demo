import navigation from '../navigation/navigation.js';
import { User } from '../../models/user.js';
import themeManager from '../state/thememanager.js';
import fontManager from '../state/fontmanager.js';

export class Auth {
    constructor() {
        console.log('Initializing Auth service');
        this.form = document.getElementById('login-form');
        this.errorMessage = document.getElementById('error-message');
        console.log('Login form found:', !!this.form);
        console.log('Error message element found:', !!this.errorMessage);
        this.init();
    }

    init() {
        // Add event listener to the login form
        if (this.form) {
            console.log('Setting up login form event listener');
            this.form.addEventListener('submit', (e) => this.handleLogin(e));
        } else {
            console.warn('Login form not found during initialization');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        console.log('Login attempt started');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log('Login attempt for username:', username);
        console.log('Current sessionStorage state:', {
            isAuthenticated: sessionStorage.getItem('isAuthenticated'),
            currentUser: sessionStorage.getItem('currentUser'),
            userRole: sessionStorage.getItem('userRole')
        });

        if (!username || !password) {
            console.warn('Login validation failed: missing credentials');
            this.showError('Please enter both username and password');
            return;
        }

        try {
            console.log('Attempting user login through User model');
            // Attempt login through User model
            const user = User.login(username, password);
            
            if (user) {
                console.log('Login successful:', {
                    username: user.username,
                    role: user.role,
                    status: user.status
                });

                // Initialize user preferences if they don't exist
                const preferences = User.getUserPreferences() || {
                    theme: 'light',
                    fontFamily: 'Arial',
                    notifications: false
                };
                console.log('User preferences loaded:', preferences);
                
                User.updateUserPreferences(preferences);
                console.log('User preferences updated');

                // Apply user preferences
                console.log('Applying theme:', preferences.theme);
                themeManager.applyTheme(preferences.theme || 'light');
                console.log('Applying font:', preferences.fontFamily);
                fontManager.applyFont(preferences.fontFamily || 'Arial');

                // Verify session storage after login
                console.log('Verifying session storage:', {
                    isAuthenticated: sessionStorage.getItem('isAuthenticated'),
                    username: sessionStorage.getItem('username'),
                    userRole: sessionStorage.getItem('userRole'),
                    hasCurrentUser: !!sessionStorage.getItem('currentUser')
                });

                // Redirect based on role with strict role-based access
                console.log('Determining redirect based on role:', user.role);
                switch (user.role) {
                    case 'Genesis Admin':
                        console.log('Redirecting Genesis Admin to admin control panel');
                        navigation.navigateTo('/src/views/pages/adminControlPanel.html');
                        break;
                    case 'Platform Admin':
                    case 'User Admin':
                        console.log('Redirecting Admin to platform admin dashboard');
                        navigation.navigateTo('/src/views/pages/platformAdmin.html');
                        break;
                    default:
                        console.error('Invalid user role detected:', user.role);
                        this.showError('Invalid user role');
                        User.logout();
                }
            } else {
                console.warn('Login failed: User.login returned null');
                this.showError('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                sessionStorage: {
                    isAuthenticated: sessionStorage.getItem('isAuthenticated'),
                    username: sessionStorage.getItem('username'),
                    userRole: sessionStorage.getItem('userRole')
                }
            });
            this.showError('An error occurred. Please try again later.');
        }
    }

    showError(message) {
        console.log('Showing error message:', message);
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');

            setTimeout(() => {
                this.errorMessage.classList.remove('show');
                console.log('Error message hidden');
            }, 3000);
        } else {
            console.error('Error message element not found');
        }
    }
}
