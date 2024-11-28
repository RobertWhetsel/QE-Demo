import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import { ROLES } from '../../models/index.js';

export class ResearchController {
    #logger;
    #view;
    #dataService;
    #currentResearch = null;
    #isInitialized = false;
    #filterState = {
        category: 'all',
        status: 'active',
        search: ''
    };

    constructor() {
        this.#logger = Logger;
        this.#logger.info('ResearchController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to research');
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

            // Load initial research data
            await this.#loadResearchData();

            this.#isInitialized = true;
            this.#logger.info('ResearchController initialized successfully');
        } catch (error) {
            this.#logger.error('ResearchController initialization error:', error);
            this.#handleError('Failed to initialize research');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && 
               [ROLES.GENESIS_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole);
    }

    #initializeView() {
        this.#view = {
            // Research list container
            researchList: document.getElementById('research-list'),
            
            // Control elements
            filterSelect: document.getElementById('research-filter'),
            categorySelect: document.getElementById('research-category'),
            searchInput: document.getElementById('research-search'),
            newResearchBtn: document.getElementById('new-research-btn'),
            
            // Research form elements
            researchForm: document.getElementById('research-form'),
            researchTitle: document.getElementById('research-title'),
            researchDescription: document.getElementById('research-description'),
            researchCategory: document.getElementById('research-category'),
            
            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasResearchList: !!this.#view.researchList,
            hasFilters: !!this.#view.filterSelect,
            hasForm: !!this.#view.researchForm
        });
    }

    #setupEventListeners() {
        // Filter change handlers
        if (this.#view.filterSelect) {
            this.#view.filterSelect.addEventListener('change', () => this.#handleFilterChange());
        }
        if (this.#view.categorySelect) {
            this.#view.categorySelect.addEventListener('change', () => this.#handleCategoryChange());
        }
        if (this.#view.searchInput) {
            this.#view.searchInput.addEventListener('input', 
                this.#debounce(() => this.#handleSearch(), 300)
            );
        }

        // Research form submission
        if (this.#view.researchForm) {
            this.#view.researchForm.addEventListener('submit', (e) => this.#handleResearchSubmit(e));
        }

        // New research button
        if (this.#view.newResearchBtn) {
            this.#view.newResearchBtn.addEventListener('click', () => this.#showNewResearchForm());
        }
    }

    async #loadResearchData() {
        try {
            this.#showLoading(true);
            const data = await this.#dataService.getData();
            await this.#renderResearch(this.#filterResearchData(data));
        } catch (error) {
            this.#logger.error('Error loading research data:', error);
            this.#handleError('Failed to load research data');
        } finally {
            this.#showLoading(false);
        }
    }

    #filterResearchData(data) {
        return data.filter(item => {
            const matchesCategory = this.#filterState.category === 'all' || 
                                  item.category === this.#filterState.category;
            const matchesStatus = this.#filterState.status === 'all' || 
                                item.status === this.#filterState.status;
            const matchesSearch = !this.#filterState.search || 
                                item.title.toLowerCase().includes(this.#filterState.search.toLowerCase()) ||
                                item.description.toLowerCase().includes(this.#filterState.search.toLowerCase());
            
            return matchesCategory && matchesStatus && matchesSearch;
        });
    }

    async #renderResearch(researchData) {
        if (!this.#view.researchList) return;

        if (!researchData.length) {
            this.#view.researchList.innerHTML = '<div class="no-data">No research projects found</div>';
            return;
        }

        this.#view.researchList.innerHTML = researchData.map(research => `
            <div class="research-card" data-id="${research.id}">
                <h3 class="research-title">${research.title}</h3>
                <p class="research-description">${research.description}</p>
                <div class="research-meta">
                    <span class="research-category">${research.category}</span>
                    <span class="research-status">${research.status}</span>
                </div>
                <div class="research-actions">
                    <button class="button button--primary" onclick="this.viewResearch(${research.id})">
                        View Details
                    </button>
                    <button class="button button--secondary" onclick="this.editResearch(${research.id})">
                        Edit
                    </button>
                </div>
            </div>
        `).join('');
    }

    #handleFilterChange() {
        this.#filterState.status = this.#view.filterSelect.value;
        this.#loadResearchData();
    }

    #handleCategoryChange() {
        this.#filterState.category = this.#view.categorySelect.value;
        this.#loadResearchData();
    }

    #handleSearch() {
        this.#filterState.search = this.#view.searchInput.value;
        this.#loadResearchData();
    }

    async #handleResearchSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing research submission');

        try {
            this.#showLoading(true);

            const formData = {
                title: this.#view.researchTitle.value,
                description: this.#view.researchDescription.value,
                category: this.#view.researchCategory.value,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            if (!this.#validateResearchData(formData)) {
                return;
            }

            await this.#saveResearch(formData);
            
            this.#showSuccess('Research project created successfully');
            this.#view.researchForm.reset();
            await this.#loadResearchData();

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
        if (!data.description?.trim()) {
            this.#handleError('Research description is required');
            return false;
        }
        if (!data.category) {
            this.#handleError('Research category is required');
            return false;
        }
        return true;
    }

    async #saveResearch(data) {
        // Implementation would go here for saving to backend
        this.#logger.info('Saving research data:', data);
        return true;
    }

    #debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
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
    viewResearch(id) {
        navigation.navigateToPage('research-details', { id });
    }

    editResearch(id) {
        navigation.navigateToPage('research-edit', { id });
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResearchController();
});