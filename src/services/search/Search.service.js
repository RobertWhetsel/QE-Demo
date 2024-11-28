import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import databaseService from '../database/DatabaseService.js';
import cacheService from '../cache/CacheService.js';

class SearchService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #searchCache = new Map();
    #cacheExpiry = 5 * 60 * 1000; // 5 minutes
    #searchableFields = ['title', 'description', 'content', 'tags'];
    #stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'in', 'a', 'an']);

    constructor() {
        if (SearchService.instance) {
            return SearchService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('SearchService initializing');
        this.#initialize();
        SearchService.instance = this;
    }

    async #initialize() {
        try {
            await this.#loadSearchableData();
            this.#isInitialized = true;
            this.#logger.info('SearchService initialized successfully');
        } catch (error) {
            this.#logger.error('SearchService initialization error:', error);
            throw error;
        }
    }

    async #loadSearchableData() {
        try {
            // Initialize searchable data from database
            await databaseService.init();
            this.#logger.info('Searchable data loaded');
        } catch (error) {
            this.#logger.error('Error loading searchable data:', error);
            throw error;
        }
    }

    async search(query, options = {}) {
        try {
            this.#logger.info('Performing search:', { query, options });

            const {
                type = 'all',
                limit = 50,
                offset = 0,
                sortBy = 'relevance',
                filters = {}
            } = options;

            // Check cache first
            const cacheKey = this.#generateCacheKey(query, options);
            const cachedResults = await this.#checkCache(cacheKey);
            if (cachedResults) {
                return cachedResults;
            }

            // Process search
            const tokens = this.#tokenizeQuery(query);
            const results = await this.#executeSearch(tokens, type, filters);
            const sortedResults = this.#sortResults(results, sortBy);
            const paginatedResults = this.#paginateResults(sortedResults, offset, limit);

            // Cache results
            await this.#cacheResults(cacheKey, paginatedResults);

            return paginatedResults;
        } catch (error) {
            this.#logger.error('Search error:', error);
            throw new Error('Search failed');
        }
    }

    #tokenizeQuery(query) {
        return query
            .toLowerCase()
            .split(/\s+/)
            .filter(token => token.length > 1 && !this.#stopWords.has(token));
    }

    async #executeSearch(tokens, type, filters) {
        const results = new Map();

        // Search in database based on type
        const searchableData = await this.#getSearchableData(type);

        searchableData.forEach(item => {
            const score = this.#calculateRelevance(item, tokens, filters);
            if (score > 0) {
                results.set(item.id, { ...item, score });
            }
        });

        return Array.from(results.values());
    }

    async #getSearchableData(type) {
        let data = [];
        switch (type) {
            case 'users':
                data = await databaseService.query('users');
                break;
            case 'tasks':
                data = await databaseService.query('tasks');
                break;
            case 'surveys':
                data = await databaseService.query('surveys');
                break;
            case 'all':
                const [users, tasks, surveys] = await Promise.all([
                    databaseService.query('users'),
                    databaseService.query('tasks'),
                    databaseService.query('surveys')
                ]);
                data = [...users, ...tasks, ...surveys];
                break;
        }
        return data;
    }

    #calculateRelevance(item, tokens, filters) {
        let score = 0;

        // Check if item matches filters
        if (!this.#matchesFilters(item, filters)) {
            return 0;
        }

        // Calculate score based on field weights
        tokens.forEach(token => {
            this.#searchableFields.forEach(field => {
                const fieldValue = String(item[field] || '').toLowerCase();
                if (fieldValue.includes(token)) {
                    score += this.#getFieldWeight(field);
                }
            });
        });

        return score;
    }

    #matchesFilters(item, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            return item[key] === value;
        });
    }

    #getFieldWeight(field) {
        const weights = {
            title: 3,
            description: 2,
            content: 1,
            tags: 2
        };
        return weights[field] || 1;
    }

    #sortResults(results, sortBy) {
        switch (sortBy) {
            case 'relevance':
                return results.sort((a, b) => b.score - a.score);
            case 'date':
                return results.sort((a, b) => new Date(b.created) - new Date(a.created));
            case 'title':
                return results.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return results;
        }
    }

    #paginateResults(results, offset, limit) {
        return results.slice(offset, offset + limit);
    }

    #generateCacheKey(query, options) {
        return `search:${query}:${JSON.stringify(options)}`;
    }

    async #checkCache(key) {
        if (!config.cache.enabled) return null;
        return await cacheService.get(key);
    }

    async #cacheResults(key, results) {
        if (!config.cache.enabled) return;
        await cacheService.set(key, results, { ttl: this.#cacheExpiry });
    }

    // Public utility methods
    clearCache() {
        this.#searchCache.clear();
        return cacheService.clear();
    }

    getSearchStats() {
        return {
            cacheSize: this.#searchCache.size,
            stopWordsCount: this.#stopWords.size,
            searchableFields: [...this.#searchableFields]
        };
    }

    static getInstance() {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService();
        }
        return SearchService.instance;
    }
}

// Create and export singleton instance
const searchService = SearchService.getInstance();
export default searchService;