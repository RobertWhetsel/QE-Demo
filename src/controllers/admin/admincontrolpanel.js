import paths from '../../../config/paths.js';

// Import modules using paths.getModulePath
const { modules } = paths.core;

let User, DataService, Logger, navigation;

// Load dependencies
async function loadDependencies() {
    const [userModule, dataServiceModule, loggerModule, navigationModule] = await Promise.all([
        import(paths.resolve(modules.user, true)),
        import(paths.resolve(modules.dataService, true)),
        import(paths.resolve(modules.logger, true)),
        import(paths.resolve(modules.navigation, true))
    ]);

    User = userModule.User;
    DataService = dataServiceModule.DataService;
    Logger = loggerModule.default;
    navigation = navigationModule.default;
}

export class AdminControlPanel {
    constructor() {
        loadDependencies().then(() => {
            Logger.info('AdminControlPanel constructor called');
            // Wait for user data to be ready before checking auth
            document.addEventListener('userDataReady', (event) => {
                Logger.info('User data ready event received:', event.detail);
                
                // Get current user data
                const user = User.getCurrentUser();
                Logger.info('Current user:', user);

                // Verify Genesis Admin role
                const isAuthenticated = User.isAuthenticated();
                const userRole = User.getCurrentUserRole();

                Logger.info('Auth check:', { isAuthenticated, userRole });

                if (!isAuthenticated || userRole !== 'Genesis Admin') {
                    Logger.warn('Auth failed:', { isAuthenticated, userRole });
                    navigation.navigateToPage('login');
                    return;
                }

                Logger.info('Auth successful, initializing admin panel');
                this.initialize();
            });
        }).catch(error => {
            Logger.error('Error loading AdminControlPanel dependencies:', error);
        });
    }

    async initialize() {
        Logger.info('Initializing Admin Control Panel');
        
        try {
            // Initialize DataService
            this.dataService = DataService.getInstance();
            await this.dataService.init();

            // Initialize form handler
            this.setupFormHandler();

            // Load initial data
            await this.displayData();
            
            Logger.info('Admin Control Panel initialized successfully');
        } catch (error) {
            Logger.error('Initialization error:', error);
            this.showError('Failed to initialize admin panel');
        }
    }

    setupFormHandler() {
        const form = document.getElementById('admin-creation-form');
        Logger.debug('Setting up form handler:', { formFound: !!form });
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async displayData() {
        try {
            const data = this.dataService.getData();
            Logger.info('Displaying admin data', { recordCount: data?.users?.length });
            
            const container = document.getElementById('admin-list-container');
            if (!container) return;
            
            if (!data?.users || data.users.length === 0) {
                container.innerHTML = '<p class="no-data-message">No data available.</p>';
                return;
            }
            
            container.innerHTML = this.createTableHTML(data.users);

            // Update system status
            const statusSection = document.getElementById('system-status');
            if (statusSection) {
                statusSection.innerHTML = `
                    <p>Current Site Status: <strong>${paths.SITE_STATE}</strong></p>
                    <p>Base URL: <strong>${paths.BASE_URL}</strong></p>
                    <p>Total Users: <strong>${data.users.length}</strong></p>
                    <p>Pending Users: <strong>${data.pendingUsers?.length || 0}</strong></p>
                `;
            }
        } catch (error) {
            Logger.error('Error loading data:', error);
            this.showError('Failed to load admin data');
        }
    }

    createTableHTML(users) {
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
            await this.displayData();
        } catch (error) {
            Logger.error('Error creating admin record:', error);
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
        }, 3000);
    }
}