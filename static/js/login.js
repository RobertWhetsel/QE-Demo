class Auth {
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
            // Check for Genesis Admin login (fallback)
            if (username === 'genesis' && password === 'admin123') {
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', 'genesis');
                sessionStorage.setItem('username', 'genesis');
                window.location.href = 'adminControlPanel.html';
                return;
            }

            // Get users from sessionStorage
            const appData = JSON.parse(sessionStorage.getItem('appData') || '{"users":[],"pendingUsers":[]}');
            
            // Check if user exists
            const admin = appData.users.find(
                (user) => user.username === username && user.password === password
            );

            if (admin) {
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', admin.role);
                sessionStorage.setItem('username', admin.username);

                // Redirect based on role
                switch (admin.role) {
                    case 'genesis':
                        window.location.href = 'adminControlPanel.html';
                        break;
                    case 'user':
                        window.location.href = 'userAdmin.html';
                        break;
                    case 'platform':
                        window.location.href = 'platformAdmin.html';
                        break;
                    default:
                        window.location.href = 'dashboard.html';
                }
            } else {
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

// Initialize authentication when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Auth();
});
