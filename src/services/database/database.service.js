import logger from '../logger/LoggerService.js';
import cacheService from '../cache/CacheService.js';
import errorHandler from '../error/errorHandler.service.js';
import { checkPageAccess, PUBLIC_PAGES } from '../../models/database.js';
import { ROLES } from '../../models/index.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

class DatabaseService {
    #logger;
    #isInitialized = false;
    #tables = new Map();
    #indexes = new Map();
    #transactions = new Map();
    #storagePrefix = 'db_';
    #storage = localStorage;
    #subscribers = new Map();
    #cacheEnabled = config.cache.enabled;
    #cacheDuration = config.cache.maxAge * 1000;

    constructor() {
        this.#logger = logger;
        this.#logger.info('DatabaseService initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize database structure
            await this.#initializeTables();
            
            // Create indexes
            await this.#createIndexes();

            // Setup storage listeners
            this.#setupStorageListeners();

            this.#isInitialized = true;
            this.#logger.info('DatabaseService initialized successfully');
        } catch (error) {
            this.#logger.error('DatabaseService initialization error:', error);
            throw error;
        }
    }

    async #initializeTables() {
        // Define table structures
        const tables = {
            users: {
                columns: ['id', 'username', 'email', 'password', 'role', 'status', 'created'],
                primaryKey: 'id',
                indexes: ['username', 'email', 'role']
            },
            tasks: {
                columns: ['id', 'title', 'description', 'status', 'assignee', 'dueDate', 'created'],
                primaryKey: 'id',
                indexes: ['assignee', 'status']
            },
            surveys: {
                columns: ['id', 'title', 'description', 'status', 'creator', 'dueDate', 'created'],
                primaryKey: 'id',
                indexes: ['creator', 'status']
            },
            workspaces: {
                columns: ['id', 'name', 'description', 'owner', 'created'],
                primaryKey: 'id',
                indexes: ['owner']
            },
            teams: {
                columns: ['id', 'name', 'description', 'leader', 'workspaceId', 'created'],
                primaryKey: 'id',
                indexes: ['leader', 'workspaceId']
            }
        };

        // Initialize each table
        for (const [tableName, structure] of Object.entries(tables)) {
            await this.#createTable(tableName, structure);
        }
    }

    async #createTable(tableName, structure) {
        try {
            const storageKey = this.#getStorageKey(tableName);
            let tableData = this.#storage.getItem(storageKey);

            if (!tableData) {
                // Initialize empty table with structure
                const table = {
                    structure,
                    data: [],
                    lastId: 0
                };
                this.#storage.setItem(storageKey, JSON.stringify(table));
                this.#tables.set(tableName, table);
            } else {
                this.#tables.set(tableName, JSON.parse(tableData));
            }

            this.#logger.info('Table created/loaded:', tableName);
            return true;
        } catch (error) {
            this.#logger.error('Error creating table:', error);
            return false;
        }
    }

    async #createIndexes() {
        for (const [tableName, table] of this.#tables) {
            const indexes = table.structure.indexes;
            if (!indexes) continue;

            for (const column of indexes) {
                const indexKey = `${tableName}_${column}`;
                const index = new Map();

                // Build index
                table.data.forEach((record) => {
                    const value = record[column];
                    if (!index.has(value)) {
                        index.set(value, new Set());
                    }
                    index.get(value).add(record[table.structure.primaryKey]);
                });

                this.#indexes.set(indexKey, index);
            }
        }
    }

    #setupStorageListeners() {
        window.addEventListener('storage', (event) => {
            if (event.key?.startsWith(this.#storagePrefix)) {
                this.#handleStorageChange(event);
            }
        });
    }

    #handleStorageChange(event) {
        const tableName = event.key.slice(this.#storagePrefix.length);
        if (!event.newValue) {
            // Table was deleted
            this.#tables.delete(tableName);
        } else {
            // Table was updated
            this.#tables.set(tableName, JSON.parse(event.newValue));
            this.#notifySubscribers(tableName);
        }
    }

    #notifySubscribers(tableName) {
        if (this.#subscribers.has(tableName)) {
            const table = this.#tables.get(tableName);
            this.#subscribers.get(tableName).forEach(callback => {
                try {
                    callback(table.data);
                } catch (error) {
                    this.#logger.error('Subscriber callback error:', error);
                }
            });
        }
    }

    #getStorageKey(tableName) {
        return this.#storagePrefix + tableName;
    }

    async #getCachedData(key) {
        if (!this.#cacheEnabled) return null;
        return await cacheService.get(key);
    }

    async #setCachedData(key, data) {
        if (!this.#cacheEnabled) return;
        await cacheService.set(key, data, {
            ttl: this.#cacheDuration
        });
    }

    // Transaction management
    async #startTransaction() {
        const transactionId = Date.now().toString();
        this.#transactions.set(transactionId, new Map());
        return transactionId;
    }

    async #commitTransaction(transactionId) {
        const transaction = this.#transactions.get(transactionId);
        if (!transaction) return false;

        try {
            // Apply all changes
            for (const [tableName, changes] of transaction) {
                const table = this.#tables.get(tableName);
                if (!table) continue;

                changes.forEach((change) => {
                    if (change.type === 'insert') {
                        table.data.push(change.data);
                    } else if (change.type === 'update') {
                        const index = table.data.findIndex(
                            record => record[table.structure.primaryKey] === change.data[table.structure.primaryKey]
                        );
                        if (index !== -1) {
                            table.data[index] = change.data;
                        }
                    } else if (change.type === 'delete') {
                        table.data = table.data.filter(
                            record => record[table.structure.primaryKey] !== change.id
                        );
                    }
                });

                // Save to storage
                this.#storage.setItem(
                    this.#getStorageKey(tableName),
                    JSON.stringify(table)
                );

                // Update cache
                this.#setCachedData(tableName, table.data);

                // Notify subscribers
                this.#notifySubscribers(tableName);
            }

            this.#transactions.delete(transactionId);
            return true;
        } catch (error) {
            this.#logger.error('Transaction commit error:', error);
            return false;
        }
    }

    async #rollbackTransaction(transactionId) {
        this.#transactions.delete(transactionId);
    }

    // Public CRUD methods
    async insert(tableName, data) {
        try {
            const table = this.#tables.get(tableName);
            if (!table) throw new Error(`Table ${tableName} not found`);

            // Validate data structure
            this.#validateData(table.structure, data);

            // Generate ID
            const id = ++table.lastId;
            const record = { id, ...data };

            // Start transaction
            const transactionId = await this.#startTransaction();
            const transaction = this.#transactions.get(transactionId);

            if (!transaction.has(tableName)) {
                transaction.set(tableName, []);
            }
            transaction.get(tableName).push({
                type: 'insert',
                data: record
            });

            // Commit transaction
            const success = await this.#commitTransaction(transactionId);
            if (!success) {
                throw new Error('Transaction failed');
            }

            return id;
        } catch (error) {
            this.#logger.error('Insert error:', error);
            throw error;
        }
    }

    async update(tableName, id, data) {
        try {
            const table = this.#tables.get(tableName);
            if (!table) throw new Error(`Table ${tableName} not found`);

            // Validate data structure
            this.#validateData(table.structure, data);

            // Start transaction
            const transactionId = await this.#startTransaction();
            const transaction = this.#transactions.get(transactionId);

            if (!transaction.has(tableName)) {
                transaction.set(tableName, []);
            }
            transaction.get(tableName).push({
                type: 'update',
                data: { id, ...data }
            });

            // Commit transaction
            const success = await this.#commitTransaction(transactionId);
            if (!success) {
                throw new Error('Transaction failed');
            }

            return true;
        } catch (error) {
            this.#logger.error('Update error:', error);
            throw error;
        }
    }

    async delete(tableName, id) {
        try {
            const table = this.#tables.get(tableName);
            if (!table) throw new Error(`Table ${tableName} not found`);

            // Start transaction
            const transactionId = await this.#startTransaction();
            const transaction = this.#transactions.get(transactionId);

            if (!transaction.has(tableName)) {
                transaction.set(tableName, []);
            }
            transaction.get(tableName).push({
                type: 'delete',
                id
            });

            // Commit transaction
            const success = await this.#commitTransaction(transactionId);
            if (!success) {
                throw new Error('Transaction failed');
            }

            return true;
        } catch (error) {
            this.#logger.error('Delete error:', error);
            throw error;
        }
    }

    async query(tableName, options = {}) {
        const {
            where = {},
            orderBy,
            limit,
            offset = 0,
            useCache = true
        } = options;

        try {
            // Check cache first
            const cacheKey = `query_${tableName}_${JSON.stringify(options)}`;
            if (useCache) {
                const cachedResult = await this.#getCachedData(cacheKey);
                if (cachedResult) {
                    return cachedResult;
                }
            }

            const table = this.#tables.get(tableName);
            if (!table) throw new Error(`Table ${tableName} not found`);

            // Filter records
            let results = table.data.filter(record => {
                return Object.entries(where).every(([key, value]) => {
                    if (value instanceof RegExp) {
                        return value.test(record[key]);
                    }
                    if (typeof value === 'function') {
                        return value(record[key]);
                    }
                    return record[key] === value;
                });
            });

            // Sort records
            if (orderBy) {
                const [field, direction] = orderBy.split(' ');
                results.sort((a, b) => {
                    if (direction === 'DESC') {
                        return b[field] > a[field] ? 1 : -1;
                    }
                    return a[field] > b[field] ? 1 : -1;
                });
            }

            // Apply pagination
            if (limit) {
                results = results.slice(offset, offset + limit);
            }

            // Cache results
            if (useCache) {
                await this.#setCachedData(cacheKey, results);
            }

            return results;
        } catch (error) {
            this.#logger.error('Query error:', error);
            throw error;
        }
    }

    // Data validation
    #validateData(structure, data) {
        const invalidFields = [];

        structure.columns.forEach(column => {
            if (!data.hasOwnProperty(column) && column !== structure.primaryKey) {
                invalidFields.push(column);
            }
        });

        if (invalidFields.length > 0) {
            throw new Error(`Missing required fields: ${invalidFields.join(', ')}`);
        }
    }

    // Public utility methods
    subscribe(tableName, callback) {
        if (!this.#subscribers.has(tableName)) {
            this.#subscribers.set(tableName, new Set());
        }
        this.#subscribers.get(tableName).add(callback);
        return () => this.#subscribers.get(tableName).delete(callback);
    }

    async exportTable(tableName) {
        const table = this.#tables.get(tableName);
        if (!table) return null;
        return JSON.stringify(table);
    }

    async importTable(tableName, data) {
        try {
            const tableData = JSON.parse(data);
            await this.#createTable(tableName, tableData.structure);
            return true;
        } catch (error) {
            this.#logger.error('Import error:', error);
            return false;
        }
    }

    getTables() {
        return Array.from(this.#tables.keys());
    }

    getTableStructure(tableName) {
        const table = this.#tables.get(tableName);
        return table ? table.structure : null;
    }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
export default databaseService;