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
            // Check for Genesis Admin login
            if (username === 'genesis' && password === 'admin123') {
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', 'genesis');
                sessionStorage.setItem('username', 'genesis');
                window.location.href = 'adminControlPanel.html';
                return;
            }

            // Fetch users from the admins.json file
            const response = await fetch('/load_admins');
            const admins = await response.json();

            // Check if user exists in admins.json
            const admin = admins.find(
                (user) => user.username === username && user.password === password
            );

            if (admin) {
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', admin.role);
                sessionStorage.setItem('username', admin.username);
                window.location.href = 'adminControlPanel.html';
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
