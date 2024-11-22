import { NavigationService } from '../navigation/navigation.js';

export class Registration {
    constructor() {
        this.form = document.getElementById('registration-form');
        this.navigation = new NavigationService();
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleRegistration(e));
        }
    }

    async handleRegistration(event) {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;

        if (!username || !password) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            // Get existing users
            const appData = JSON.parse(sessionStorage.getItem('appData') || '{"users":[],"pendingUsers":[]}');
            
            // Check if username already exists
            if (appData.users.some(user => user.username === username)) {
                this.showError('Username already exists');
                return;
            }

            // Create new user
            const newUser = {
                username,
                password,
                role,
                created: new Date().toISOString()
            };

            // Add to users array
            appData.users.push(newUser);
            
            // Save updated data
            sessionStorage.setItem('appData', JSON.stringify(appData));

            // Set session data
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('userRole', role);
            sessionStorage.setItem('username', username);

            // Initialize preferences
            const userPreferences = {
                theme: 'light',
                fontFamily: 'Arial',
                notifications: false
            };
            localStorage.setItem(`user_preferences_${username}`, JSON.stringify(userPreferences));

            // Navigate based on role
            if (role === 'Genesis Admin') {
                alert('Welcome! Thank you for Registering! You are the Genesis Admin.');
                window.location.href = 'platformAdmin.html';
            } else {
                window.location.href = 'platformAdmin.html';
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('An error occurred during registration');
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
