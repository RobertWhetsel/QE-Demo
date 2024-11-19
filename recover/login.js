// login.js - Handles authentication flow
class Auth {
    constructor() {
        this.form = document.getElementById('login-form');
        this.dataService = DataService.getInstance();
        
        // Only initialize if we're on the login page
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.isFirstTimeSetup = !sessionStorage.getItem('setupComplete');
        
        // Update UI based on setup state
        const titleElement = document.querySelector('h2');
        if (titleElement) {
            titleElement.textContent = this.isFirstTimeSetup ? 'Genesis Admin Setup' : 'Login';
        }

        // Add form submit listener
        this.form.addEventListener('submit', (e) => this.handleLogin(e));
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
            // Check for Genesis Admin first
            if (username === 'genesis' && password === 'admin123') {
                console.log('Genesis Admin login successful');
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', 'genesis');
                sessionStorage.setItem('username', 'genesis');
                
                if (this.isFirstTimeSetup) {
                    sessionStorage.setItem('setupComplete', 'true');
                }
                
                window.location.href = 'adminControlPanel.html';
                return;
            }

            // Check for other admin users in CSV data
            const data = await this.dataService.getData();
            console.log('Checking admin:', username, 'in data:', data);
            
            const admin = data.find(user => 
                user.name === username && 
                (user.type === 'user' || user.type === 'platform')
            );

            if (admin && admin.password === password) {
                console.log('Admin login successful');
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('userRole', admin.type);
                sessionStorage.setItem('username', admin.name);
                window.location.href = 'adminControlPanel.html';
                return;
            }

            throw new Error('Invalid username or password');

        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message);
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
        
        this.form.parentNode.insertBefore(errorDiv, this.form);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    static logout() {
        // Clear session
        sessionStorage.clear();
        window.location.href = 'login.html';
    }

    static exit() {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Auth();
});

// Export auth functions
window.Auth = {
    logout: Auth.logout,
    exit: Auth.exit
};
