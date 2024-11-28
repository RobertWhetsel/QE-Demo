import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import navigation from '../../services/navigation/navigation.js';
import Logger from '../../utils/logging/logger.js';
import paths from '../../../config/paths.js';
import config from '../../../config/client.js';
import { ROLES } from '../../models/index.js';

export class ResearchDashboardController {
    #logger;
    #view;
    #dataService;
    #currentUser;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('ResearchDashboardController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to research dashboard');
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

            // Load initial data
            await this.#loadDashboardData();

            this.#isInitialized = true;
            this.#logger.info('ResearchDashboardController initialized successfully');
        } catch (error) {
            this.#logger.error('ResearchDashboardController initialization error:', error);
            this.#handleError('Failed to initialize research dashboard');
        }
    }

    #checkAuth() {
        this.#currentUser = User.getCurrentUser();
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && 
               [ROLES.GENESIS_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole);
    }

    #initializeView() {
        this.#view = {
            // Dashboard stats
            statsContainer: {
                totalSurveys: document.querySelector('.stats-card.surveys .value'),
                activeResearch: document.querySelector('.stats-card.active .value'),
                completedResearch: document.querySelector('.stats-card.completed .value'),
                participantCount: document.querySelector('.stats-card.participants .value')
            },

            // Research lists
            activeResearchList: document.getElementById('active-research-list'),
            completedResearchList: document.getElementById('completed-research-list'),

            // Control elements
            filterSelect: document.getElementById('research-filter'),
            sortSelect: document.getElementById('research-sort'),
            searchInput: document.getElementById('research-search'),
            newResearchBtn: document.getElementById('new-research-btn'),

            // Modals and forms
            newResearchModal: document.getElementById('new-research-modal'),
            researchForm: document.getElementById('research-form'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasStatsContainer: !!this.#view.statsContainer,
            hasActiveList: !!this.#view.activeResearchList,
            hasCompletedList: !!this.#view.completedResearchList,
            hasControls: !!(this.#view.filterSelect && this.#view.sortSelect)
        });
    }

    #setupEventListeners() {
        // Setup filter change handler
        if (this.#view.filterSelect) {
            this.#view.filterSelect.addEventListener('change', () => this.#filterResearch());
        }

        // Setup sort change handler
        if (this.#view.sortSelect) {
            this.#view.sortSelect.addEventListener('change', () => this.#sortResearch());
        }

        // Setup search input handler
        if (this.#view.searchInput) {
            this.#view.searchInput.addEventListener('input', this.#debounce(() => this.#searchResearch(), 300));
        }

        // Setup new research button
        if (this.#view.newResearchBtn) {
            this.#view.newResearchBtn.addEventListener('click', () => this.#showNewResearchModal());
        }

        // Setup research form submission
        if (this.#view.researchForm) {
            this.#view.researchForm.addEventListener('submit', (e) => this.#handleResearchSubmit(e));
        }

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadDashboardData() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading dashboard data');

            const data = await this.#dataService.getData();
            const researchData = this.#processResearchData(data);

            this.#updateDashboardStats(researchData);
            this.#renderResearchLists(researchData);

            this.#logger.info('Dashboard data loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading dashboard data:', error);
            this.#handleError('Failed to load research data');
        } finally {
            this.#showLoading(false);
        }
    }

    #processResearchData(data) {
        // This would process real data in production
        return {
            totalSurveys: 0,
            activeResearch: [],
            completedResearch: [],
            participantCount: 0
        };
    }

    #updateDashboardStats(data) {
        const { statsContainer } = this.#view;
        if (statsContainer.totalSurveys) {
            statsContainer.totalSurveys.textContent = data.totalSurveys;
        }
        if (statsContainer.activeResearch) {
            statsContainer.activeResearch.textContent = data.activeResearch.length;
        }
        if (statsContainer.completedResearch) {
            statsContainer.completedResearch.textContent = data.completedResearch.length;
        }
        if (statsContainer.participantCount) {
            statsContainer.participantCount.textContent = data.participantCount;
        }
    }

    #renderResearchLists(data) {
        this.#renderActiveResearch(data.activeResearch);
        this.#renderCompletedResearch(data.completedResearch);
    }

    #renderActiveResearch(activeResearch) {
        if (!this.#view.activeResearchList) return;

        this.#view.activeResearchList.innerHTML = activeResearch
            .map(research => this.#createResearchCard(research, true))
            .join('');
    }

    #renderCompletedResearch(completedResearch) {
        if (!this.#view.completedResearchList) return;

        this.#view.completedResearchList.innerHTML = completedResearch
            .map(research => this.#createResearchCard(research, false))
            .join('');
    }

    #createResearchCard(research, isActive) {
        return `
            <div class="research-card ${isActive ? 'active' : 'completed'}">
                <h3 class="research-title">${research.title}</h3>
                <p class="research-description">${research.description}</p>
                <div class="research-meta">
                    <span class="date">${this.#formatDate(research.date)}</span>
                    <span class="participants">${research.participants} participants</span>
                </div>
                <div class="research-actions">
                    ${this.#getResearchActionButtons(research, isActive)}
                </div>
            </div>
        `;
    }

    #getResearchActionButtons(research, isActive) {
        if (isActive) {
            return `
                <button onclick="this.viewResearch(${research.id})" class="button--primary">View</button>
                <button onclick="this.editResearch(${research.id})" class="button--secondary">Edit</button>
            `;
        }
        return `
            <button onclick="this.viewResults(${research.id})" class="button--primary">View Results</button>
            <button onclick="this.downloadReport(${research.id})" class="button--secondary">Download Report</button>
        `;
    }

    #formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    #filterResearch() {
        this.#logger.info('Filtering research');
        this.#loadDashboardData();
    }

    #sortResearch() {
        this.#logger.info('Sorting research');
        this.#loadDashboardData();
    }

    #searchResearch() {
        this.#logger.info('Searching research');
        this.#loadDashboardData();
    }

    #debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    #showNewResearchModal() {
        if (this.#view.newResearchModal) {
            this.#view.newResearchModal.classList.remove('hidden');
        }
    }

    async #handleResearchSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing research submission');

        try {
            this.#showLoading(true);
            const formData = new FormData(event.target);
            const researchData = Object.fromEntries(formData.entries());

            // Validate research data
            if (!this.#validateResearchData(researchData)) {
                return;
            }

            // Save research data
            await this.#saveResearch(researchData);

            this.#showSuccess('Research project created successfully');
            this.#view.newResearchModal.classList.add('hidden');
            event.target.reset();
            await this.#loadDashboardData();
        } catch (error) {
            this.#logger.error('Error submitting research:', error);
            this.#handleError('Failed to create research project');
        } finally {
            this.#showLoading(false);
        }
    }

    #validateResearchData(data) {
        if (!data.title?.trim()) {
            this.#handleError('Research title is required');
            return false;
        }
        return true;
    }

    async #saveResearch(data) {
        // This would save to a real backend in production
        this.#logger.info('Saving research data:', data);
        return true;
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

    viewResearch(researchId) {
        navigation.navigateToPage('research-details', { id: researchId });
    }

    editResearch(researchId) {
        navigation.navigateToPage('research-edit', { id: researchId });
    }

    viewResults(researchId) {
        navigation.navigateToPage('research-results', { id: researchId });
    }

    async downloadReport(researchId) {
        try {
            this.#showLoading(true);
            // Implementation would go here
            this.#showSuccess('Report downloaded successfully');
        } catch (error) {
            this.#handleError('Failed to download report');
        } finally {
            this.#showLoading(false);
        }
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResearchDashboardController();
});