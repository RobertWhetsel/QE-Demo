// Platform Admin Dashboard Controller
class PlatformAdmin {
    constructor() {
        this.init();
    }

    init() {
        // Check authentication and role
        if (!this.checkAuth()) {
            window.location.href = '/src/views/pages/login.html';
            return;
        }

        this.initializeElements();
        this.attachEventListeners();
        this.loadDashboardData();
    }

    checkAuth() {
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const userRole = sessionStorage.getItem('userRole');
        return isAuthenticated && (userRole === 'Platform Admin' || userRole === 'User Admin');
    }

    initializeElements() {
        // Initialize iframe content
        this.contentFrame = document.getElementById('content-frame');
        
        // Initialize navigation elements
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');
        
        // Initialize user info elements
        this.userNameDisplay = document.getElementById('userName');
        if (this.userNameDisplay) {
            this.userNameDisplay.textContent = sessionStorage.getItem('username') || 'User';
        }
    }

    attachEventListeners() {
        // Handle iframe events
        if (this.contentFrame) {
            this.contentFrame.addEventListener('load', () => {
                console.log('Content frame loaded:', this.contentFrame.src);
            });

            this.contentFrame.addEventListener('error', (error) => {
                console.error('Error loading content frame:', error);
                this.contentFrame.src = '/src/views/pages/error.html';
            });
        }

        // Handle navigation events
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('data-target');
                if (target) {
                    this.navigateToSection(target);
                }
            });
        });

        // Handle sidebar navigation
        this.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('data-content');
                if (target) {
                    this.navigateToSection(target);
                }
            });
        });

        // Handle messages from iframe content
        window.addEventListener('message', (event) => {
            if (event.source !== this.contentFrame?.contentWindow) return;
            
            switch (event.data.type) {
                case 'navigation':
                    this.navigateToSection(event.data.target);
                    break;
                case 'error':
                    console.error('Error in iframe:', event.data.message);
                    break;
                default:
                    console.log('Unknown message from iframe:', event.data);
            }
        });
    }

    async loadDashboardData() {
        try {
            // Load initial dashboard data
            const appData = JSON.parse(sessionStorage.getItem('appData') || '{"users":[]}');
            
            // Update UI with dashboard data
            this.updateDashboardUI(appData);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardUI(data) {
        // Update user count if element exists
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) {
            userCountEl.textContent = data.users.length;
        }

        // Update other dashboard metrics as needed
    }

    navigateToSection(target) {
        if (!target) return;

        // Update URL if needed
        const url = target.startsWith('/') ? target : `/src/views/pages/${target}`;
        
        if (this.contentFrame) {
            this.contentFrame.src = url;
        } else {
            window.location.href = url;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Initialize Platform Admin Dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PlatformAdmin();
});
