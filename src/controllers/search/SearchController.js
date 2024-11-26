import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class SearchController {
    #logger;
    #view;
    #dataService;
    #isInitialized = false;
    #searchTimeout = null;
    #searchDelay = 300; // milliseconds
    #searchHistory = [];
    #maxHistoryItems = 10;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SearchController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load search history
            this.#loadSearchHistory();

            this.#isInitialized = true;
            this.#logger.info('SearchController initialized successfully');
        } catch (error) {
            this.#logger.error('SearchController initialization error:', error);
            this.#handleError('Failed to initialize search');
        }
    }

    #initializeView() {
        this.#view = {
            // Search input elements
            searchInput: document.getElementById('search-input'),
            searchType: document.getElementById('search-type'),
            searchFilters: document.getElementById('search-filters'),
            
            // Results display
            resultsContainer: document.getElementById('search-results'),
            resultCount: document.getElementById('result-count'),
            resultSummary: document.getElementById('result-summary'),
            
            // Filter elements
            filterContainer: document.getElementById('filter-container'),
            categoryFilter: document.getElementById('category-filter'),
            dateFilter: document.getElementById('date-filter'),
            
            // History and suggestions
            searchHistory: document.getElementById('search-history'),
            searchSuggestions: document.getElementById('search-suggestions'),
            
            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasSearchInput: !!this.#view.searchInput,
            hasResultsContainer: !!this.#view.resultsContainer,
            hasFilters: !!this.#view.filterContainer
        });
    }

    #setupEventListeners() {
        if (this.#view.searchInput) {
            this.#view.searchInput.addEventListener('input', () => this.#handleSearchInput());
            this.#view.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.#performSearch();
                }
            });
        }

        if (this.#view.searchType) {
            this.#view.searchType.addEventListener('change', () => this.#handleSearchTypeChange());
        }

        if (this.#view.searchFilters) {
            this.#view.searchFilters.addEventListener('change', () => this.#performSearch());
        }

        // Handle filter changes
        const filterElements = [
            this.#view.categoryFilter,
            this.#view.dateFilter
        ];

        filterElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.#performSearch());
            }
        });
    }

    #handleSearchInput() {
        clearTimeout(this.#searchTimeout);
        const query = this.#view.searchInput.value.trim();

        if (query.length > 2) {
            this.#searchTimeout = setTimeout(() => {
                this.#performSearch();
            }, this.#searchDelay);
        }
    }

    async #performSearch() {
        try {
            const query = this.#view.searchInput.value.trim();
            if (!query) return;

            this.#showLoading(true);
            this.#logger.info('Performing search:', { query });

            const searchConfig = this.#getSearchConfig();
            const results = await this.#executeSearch(searchConfig);

            this.#updateSearchHistory(query);
            this.#displayResults(results);

        } catch (error) {
            this.#logger.error('Search error:', error);
            this.#handleError('Failed to perform search');
        } finally {
            this.#showLoading(false);
        }
    }

    #getSearchConfig() {
        return {
            query: this.#view.searchInput.value.trim(),
            type: this.#view.searchType?.value || 'all',
            category: this.#view.categoryFilter?.value,
            dateRange: this.#view.dateFilter?.value,
            filters: this.#getActiveFilters()
        };
    }

    #getActiveFilters() {
        const filters = {};
        if (this.#view.searchFilters) {
            const filterInputs = this.#view.searchFilters.querySelectorAll('input:checked');
            filterInputs.forEach(input => {
                filters[input.name] = input.value;
            });
        }
        return filters;
    }

    async #executeSearch(config) {
        // Implementation for search execution
        const results = await this.#dataService.search(config);
        return this.#processSearchResults(results);
    }

    #processSearchResults(results) {
        // Process and format search results
        return results.map(result => ({
            id: result.id,
            title: this.#highlightSearchTerm(result.title),
            description: this.#highlightSearchTerm(result.description),
            type: result.type,
            url: result.url
        }));
    }

    #highlightSearchTerm(text) {
        const searchTerm = this.#view.searchInput.value.trim();
        if (!searchTerm) return text;

        const regex = new RegExp(searchTerm, 'gi');
        return text.replace(regex, match => `<mark>${match}</mark>`);
    }

    #displayResults(results) {
        if (!this.#view.resultsContainer) return;

        if (!results.length) {
            this.#view.resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        this.#view.resultsContainer.innerHTML = results.map(result => `
            <div class="search-result" data-id="${result.id}">
                <h3 class="result-title">${result.title}</h3>
                <p class="result-description">${result.description}</p>
                <div class="result-meta">
                    <span class="result-type">${result.type}</span>
                    <a href="${result.url}" class="result-link">View</a>
                </div>
            </div>
        `).join('');

        if (this.#view.resultCount) {
            this.#view.resultCount.textContent = `${results.length} results found`;
        }
    }

    #loadSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            if (history) {
                this.#searchHistory = JSON.parse(history);
                this.#displaySearchHistory();
            }
        } catch (error) {
            this.#logger.error('Error loading search history:', error);
        }
    }

    #updateSearchHistory(query) {
        if (!query) return;

        this.#searchHistory = [
            query,
            ...this.#searchHistory.filter(item => item !== query)
        ].slice(0, this.#maxHistoryItems);

        localStorage.setItem('searchHistory', JSON.stringify(this.#searchHistory));
        this.#displaySearchHistory();
    }

    #displaySearchHistory() {
        if (!this.#view.searchHistory) return;

        this.#view.searchHistory.innerHTML = this.#searchHistory.map(query => `
            <div class="history-item" data-query="${query}">
                <span class="history-query">${query}</span>
                <button class="history-remove">×</button>
            </div>
        `).join('');

        // Add click handlers for history items
        this.#view.searchHistory.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                this.#view.searchInput.value = query;
                this.#performSearch();
            });
        });
    }

    #handleSearchTypeChange() {
        this.#performSearch();
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
    clearHistory() {
        this.#searchHistory = [];
        localStorage.removeItem('searchHistory');
        this.#displaySearchHistory();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SearchController();
});