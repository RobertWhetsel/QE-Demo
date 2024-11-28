import cacheService from '../cache/cache.service.js';

class BaseService {
    #debugMode = window.env.SITE_STATE === 'dev';
    #cacheService = cacheService;

    constructor() {
        if (this.#debugMode) {
            console.log(`${this.constructor.name} initializing`);
        }
    }

    get debugMode() {
        return this.#debugMode;
    }

    get cacheService() {
        return this.#cacheService;
    }
}

export default BaseService;
