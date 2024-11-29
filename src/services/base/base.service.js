// Get paths from window.env
const { PATHS_MODULE } = window.env;
const paths = await import(PATHS_MODULE);

class BaseService {
    #debugMode;
    #cacheService;

    constructor() {
        this.#initialize();
    }

    async #initialize() {
        // Import dependencies using paths
        const { default: config } = await import(paths.getModulePath('config'));
        const { default: cacheService } = await import(paths.getModulePath('cacheService'));
        
        this.#debugMode = window.env.SITE_STATE === 'dev';
        this.#cacheService = cacheService;

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