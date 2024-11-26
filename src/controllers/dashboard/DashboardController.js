// Location: src/controllers/dashboard/DashboardController.js

import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class DashboardController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;
    #refreshInterval = 30000; // 30 seconds
    #refreshTimer = null;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('DashboardController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authentication
            if (!User.isAuthenticated()) {
                this.#logger.warn('Unauthorized access attempt to dashboard');
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

            // Start auto-refresh
            this.#startAutoRefresh();

            this.#isInitialized = true;
            this.#logger.info('DashboardController initialized successfully');
        } catch (error) {
            this.#logger.error('DashboardController initialization error:', error);
            this.#handleError('Failed to initialize dashboard');
        }
    }

    #initializeView() {
        this.#view = {
            // Stats containers
            statsContainer: {
                totalTasks: document.querySelector('.stat-card.tasks .value'),
                completedTasks: document.querySelector('.stat-card.completed .value'),
                pendingTasks: document.querySelector('.stat-card.pending .value'),
                activeProjects: document.querySelector('.stat-card.projects .value')
            },

            // Dashboard sections
            recentActivity: document.getElementById('recent-activity'),
            upcomingTasks: document.getElementById('upcoming-tasks'),
            notifications: document.getElementById('notifications'),
            quickActions: document.getElementById('quick-actions'),

            // Control elements
            refreshButton: document.getElementById('refresh-dashboard'),
            filterSelect: document.getElementById('dashboard-filter'),
            dateRange: document.getElementById('date-range'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasStats: !!this.#view.statsContainer,
            hasRecentActivity: !!this.#view.recentActivity,
            hasUpcomingTasks: !!this.#view.upcomingTasks
        });
    }

    #setupEventListeners() {
        // Manual refresh handler
        if (this.#view.refreshButton) {
            this.#view.refreshButton.addEventListener('click', () => this.refreshDashboard());
        }

        // Filter change handler
        if (this.#view.filterSelect) {
            this.#view.filterSelect.addEventListener('change', () => this.#handleFilterChange());
        }

        // Date range change handler
        if (this.#view.dateRange) {
            this.#view.dateRange.addEventListener('change', () => this.#handleDateRangeChange());
        }

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.#stopAutoRefresh();
            } else {
                this.#startAutoRefresh();
            }
        });
    }

    async #loadDashboardData() {
        try {
            this.#showLoading(true);
            const data = await this.#dataService.getData();
            
            this.#updateDashboardStats(data);
            await this.#updateRecentActivity(data);
            await this.#updateUpcomingTasks(data);
            await this.#updateNotifications(data);

            this.#logger.info('Dashboard data loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading dashboard data:', error);
            this.#handleError('Failed to load dashboard data');
        } finally {
            this.#showLoading(false);
        }
    }

    #updateDashboardStats(data) {
        const stats = this.#calculateStats(data);
        
        if (this.#view.statsContainer.totalTasks) {
            this.#view.statsContainer.totalTasks.textContent = stats.totalTasks;
        }
        if (this.#view.statsContainer.completedTasks) {
            this.#view.statsContainer.completedTasks.textContent = stats.completedTasks;
        }
        if (this.#view.statsContainer.pendingTasks) {
            this.#view.statsContainer.pendingTasks.textContent = stats.pendingTasks;
        }
        if (this.#view.statsContainer.activeProjects) {
            this.#view.statsContainer.activeProjects.textContent = stats.activeProjects;
        }
    }

    #calculateStats(data) {
        return {
            totalTasks: data.tasks?.length || 0,
            completedTasks: data.tasks?.filter(task => task.status === 'completed').length || 0,
            pendingTasks: data.tasks?.filter(task => task.status === 'pending').length || 0,
            activeProjects: data.projects?.filter(project => project.status === 'active').length || 0
        };
    }

    async #updateRecentActivity(data) {
        if (!this.#view.recentActivity) return;

        const activities = data.activities?.slice(0, 5) || [];
        
        this.#view.recentActivity.innerHTML = activities.length ? 
            activities.map(activity => this.#createActivityElement(activity)).join('') :
            '<div class="no-data">No recent activity</div>';
    }

    #createActivityElement(activity) {
        return `
            <div class="activity-item">
                <span class="activity-time">${this.#formatDate(activity.timestamp)}</span>
                <span class="activity-type">${activity.type}</span>
                <span class="activity-description">${activity.description}</span>
            </div>
        `;
    }

    #startAutoRefresh() {
        this.#stopAutoRefresh(); // Clear any existing timer
        this.#refreshTimer = setInterval(() => this.refreshDashboard(), this.#refreshInterval);
        this.#logger.debug('Auto-refresh started');
    }

    #stopAutoRefresh() {
        if (this.#refreshTimer) {
            clearInterval(this.#refreshTimer);
            this.#refreshTimer = null;
            this.#logger.debug('Auto-refresh stopped');
        }
    }

    #formatDate(date) {
        return new Date(date).toLocaleString();
    }

    #handleFilterChange() {
        this.#loadDashboardData();
    }

    #handleDateRangeChange() {
        this.#loadDashboardData();
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

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    refreshDashboard() {
        return this.#loadDashboardData();
    }

    // Cleanup method
    cleanup() {
        this.#stopAutoRefresh();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DashboardController();
}); 