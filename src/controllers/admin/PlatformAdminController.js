import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import navigation from '../../services/navigation/navigation.js';
import Logger from '../../utils/logging/logger.js';
import paths from '../../../config/paths.js';
import config from '../../../config/client.js';
import { ROLES } from '../../models/index.js';

export class PlatformAdminController {
    #logger;
    #view;
    #dataService;
    #contentFrame;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('PlatformAdminController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to platform admin');
                navigation.navigateToPage('login');
                return;
            }

            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load initial dashboard data
            await this.#loadDashboardData();

            this.#isInitialized = true;
            this.#logger.info('PlatformAdminController initialized successfully');
        } catch (error) {
            this.#logger.error('PlatformAdminController initialization error:', error);
            this.#handleError('Failed to initialize platform admin dashboard');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && 
               [ROLES.PLATFORM_ADMIN, ROLES.USER_ADMIN].includes(userRole);
    }

    #initializeView() {
        this.#view = {
            // Dashboard elements
            contentFrame: document.getElementById('content-frame'),
            statsContainer: {
                userCount: document.getElementById('userCount'),
                activeUsers: document.getElementById('activeUsers'),
                pendingTasks: document.getElementById('pendingTasks')
            },

            // Navigation elements
            navLinks: document.querySelectorAll('.nav-link'),
            sidebarLinks: document.querySelectorAll('.sidebar-link'),
            
            // Action buttons
            createTeamBtn: document.querySelector('.action-buttons button:nth-child(1)'),
            manageUsersBtn: document.querySelector('.action-buttons button:nth-child(2)'),
            viewReportsBtn: document.querySelector('.action-buttons button:nth-child(3)'),
            
            // Activity and status sections
            activityLog: document.getElementById('activityLog'),
            systemStatus: document.getElementById('systemStatus'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#contentFrame = this.#view.contentFrame;

        this.#logger.debug('View elements initialized:', {
            hasContentFrame: !!this.#contentFrame,
            hasNavLinks: this.#view.navLinks.length,
            hasSidebarLinks: this.#view.sidebarLinks.length,
            hasActionButtons: !!(this.#view.createTeamBtn && this.#view.manageUsersBtn)
        });
    }

    #setupEventListeners() {
        // Handle iframe events
        if (this.#contentFrame) {
            this.#contentFrame.addEventListener('load', () => this.#handleIframeLoad());
            this.#contentFrame.addEventListener('error', (error) => this.#handleIframeError(error));
        }

        // Handle navigation events
        this.#view.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.#handleNavigation(e));
        });

        // Handle sidebar navigation
        this.#view.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => this.#handleSidebarNavigation(e));
        });

        // Handle action buttons
        if (this.#view.createTeamBtn) {
            this.#view.createTeamBtn.addEventListener('click', () => this.#handleCreateTeam());
        }
        if (this.#view.manageUsersBtn) {
            this.#view.manageUsersBtn.addEventListener('click', () => this.#handleManageUsers());
        }
        if (this.#view.viewReportsBtn) {
            this.#view.viewReportsBtn.addEventListener('click', () => this.#handleViewReports());
        }

        // Handle messages from iframe content
        window.addEventListener('message', (event) => this.#handleIframeMessage(event));

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadDashboardData() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading dashboard data');

            const appData = await this.#dataService.getData();
            this.#updateDashboardUI(appData);

            await this.#loadActivityLog();
            await this.#loadSystemStatus();

            this.#logger.info('Dashboard data loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading dashboard data:', error);
            this.#handleError('Failed to load dashboard data');
        } finally {
            this.#showLoading(false);
        }
    }

    #updateDashboardUI(data) {
        const { statsContainer } = this.#view;

        // Update user count
        if (statsContainer.userCount) {
            statsContainer.userCount.textContent = data.users?.length || 0;
        }

        // Update active users
        if (statsContainer.activeUsers) {
            const activeCount = data.users?.filter(user => user.status === 'active').length || 0;
            statsContainer.activeUsers.textContent = activeCount;
        }

        // Update pending tasks
        if (statsContainer.pendingTasks) {
            const pendingCount = data.tasks?.filter(task => task.status === 'pending').length || 0;
            statsContainer.pendingTasks.textContent = pendingCount;
        }
    }

    async #loadActivityLog() {
        if (!this.#view.activityLog) return;

        try {
            const activities = await this.#dataService.getRecentActivity();
            this.#view.activityLog.innerHTML = this.#createActivityLogHTML(activities);
        } catch (error) {
            this.#logger.error('Error loading activity log:', error);
            this.#view.activityLog.innerHTML = '<p class="error">Failed to load activity log</p>';
        }
    }

    async #loadSystemStatus() {
        if (!this.#view.systemStatus) return;

        try {
            const status = await this.#getSystemStatus();
            this.#view.systemStatus.innerHTML = this.#createSystemStatusHTML(status);
        } catch (error) {
            this.#logger.error('Error loading system status:', error);
            this.#view.systemStatus.innerHTML = '<p class="error">Failed to load system status</p>';
        }
    }

    #createActivityLogHTML(activities = []) {
        return activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${this.#formatDate(activity.timestamp)}</span>
                <span class="activity-type">${activity.type}</span>
                <span class="activity-description">${activity.description}</span>
            </div>
        `).join('');
    }

    #createSystemStatusHTML(status) {
        return `
            <div class="system-status">
                <p>Environment: <strong>${paths.SITE_STATE}</strong></p>
                <p>API Version: <strong>${status.apiVersion}</strong></p>
                <p>System Health: <strong>${status.health}</strong></p>
                <p>Last Updated: <strong>${this.#formatDate(status.lastUpdate)}</strong></p>
            </div>
        `;
    }

    async #getSystemStatus() {
        // This would normally fetch from an API
        return {
            apiVersion: '1.0.0',
            health: 'Healthy',
            lastUpdate: new Date().toISOString()
        };
    }

    #handleNavigation(event) {
        event.preventDefault();
        const target = event.target.getAttribute('data-target');
        if (target) {
            this.#navigateToSection(target);
        }
    }

    #handleSidebarNavigation(event) {
        event.preventDefault();
        const target = event.target.getAttribute('data-content');
        if (target) {
            this.#navigateToSection(target);
        }
    }

    #navigateToSection(target) {
        if (!target) return;

        const url = target.startsWith('/') ? target : paths.getPagePath(target);
        
        if (this.#contentFrame) {
            this.#contentFrame.src = paths.resolve(url);
        } else {
            navigation.navigateTo(url);
        }
    }

    #handleIframeLoad() {
        this.#logger.info('Content frame loaded:', this.#contentFrame?.src);
    }

    #handleIframeError(error) {
        this.#logger.error('Error loading content frame:', error);
        if (this.#contentFrame) {
            const errorPath = paths.getPagePath('error');
            this.#contentFrame.src = paths.resolve(errorPath);
        }
    }

    #handleIframeMessage(event) {
        if (event.source !== this.#contentFrame?.contentWindow) return;
        
        this.#logger.debug('Received iframe message:', event.data);

        switch (event.data.type) {
            case 'navigation':
                this.#navigateToSection(event.data.target);
                break;
            case 'error':
                this.#handleError(event.data.message);
                break;
            default:
                this.#logger.warn('Unknown message from iframe:', event.data);
        }
    }

    #handleCreateTeam() {
        this.#navigateToSection('team-creation');
    }

    #handleManageUsers() {
        this.#navigateToSection('user-management');
    }

    #handleViewReports() {
        this.#navigateToSection('reports');
    }

    #formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    refreshDashboard() {
        this.#loadDashboardData();
    }

    getDashboardState() {
        return {
            currentSection: this.#contentFrame?.src,
            isLoading: this.#view.loadingSpinner?.style.display === 'flex'
        };
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PlatformAdminController();
});