import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

class QueueService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #queues = new Map();
    #workers = new Map();
    #processing = new Map();
    #maxRetries = 3;
    #retryDelay = 1000; // 1 second
    #maxQueueSize = 1000;
    #debugMode = SITE_STATE === 'dev';

    constructor() {
        if (QueueService.instance) {
            return QueueService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('QueueService initializing');
        this.#initialize();
        QueueService.instance = this;
    }

    async #initialize() {
        try {
            // Initialize default queues
            this.createQueue('default');
            this.createQueue('high-priority');
            this.createQueue('background');

            // Setup visibility change handling
            this.#setupVisibilityHandler();

            this.#isInitialized = true;
            this.#logger.info('QueueService initialized successfully');
        } catch (error) {
            this.#logger.error('QueueService initialization error:', error);
            throw error;
        }
    }

    #setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAll();
            } else {
                this.resumeAll();
            }
        });
    }

    createQueue(queueName, options = {}) {
        if (this.#queues.has(queueName)) {
            throw new Error(`Queue ${queueName} already exists`);
        }

        const queue = {
            name: queueName,
            items: [],
            options: {
                maxSize: options.maxSize || this.#maxQueueSize,
                maxRetries: options.maxRetries || this.#maxRetries,
                retryDelay: options.retryDelay || this.#retryDelay,
                priority: options.priority || 0
            },
            paused: false
        };

        this.#queues.set(queueName, queue);
        this.#processing.set(queueName, false);

        this.#logger.info('Queue created:', { queueName, options });
        return true;
    }

    async enqueue(queueName, task, options = {}) {
        try {
            const queue = this.#queues.get(queueName);
            if (!queue) {
                throw new Error(`Queue ${queueName} not found`);
            }

            if (queue.items.length >= queue.options.maxSize) {
                throw new Error(`Queue ${queueName} is full`);
            }

            const queueItem = {
                id: crypto.randomUUID(),
                task,
                options: {
                    priority: options.priority || 0,
                    retries: 0,
                    maxRetries: options.maxRetries || queue.options.maxRetries,
                    timeout: options.timeout,
                    ...options
                },
                status: 'pending',
                addedAt: new Date().toISOString()
            };

            queue.items.push(queueItem);
            
            // Sort by priority
            queue.items.sort((a, b) => b.options.priority - a.options.priority);

            this.#logger.debug('Task enqueued:', {
                queueName,
                taskId: queueItem.id,
                priority: queueItem.options.priority
            });

            // Start processing if not already running
            if (!queue.paused && !this.#processing.get(queueName)) {
                this.#processQueue(queueName);
            }

            return queueItem.id;

        } catch (error) {
            this.#logger.error('Enqueue error:', error);
            throw error;
        }
    }

    async #processQueue(queueName) {
        const queue = this.#queues.get(queueName);
        if (!queue || queue.paused || this.#processing.get(queueName)) {
            return;
        }

        this.#processing.set(queueName, true);

        try {
            while (queue.items.length > 0 && !queue.paused) {
                const item = queue.items[0];
                
                try {
                    item.status = 'processing';
                    item.startedAt = new Date().toISOString();

                    // Execute task with timeout if specified
                    if (item.options.timeout) {
                        await this.#executeWithTimeout(item);
                    } else {
                        await item.task();
                    }

                    // Task completed successfully
                    item.status = 'completed';
                    item.completedAt = new Date().toISOString();
                    this.#logger.debug('Task completed:', { queueName, taskId: item.id });

                } catch (error) {
                    await this.#handleTaskError(queue, item, error);
                }

                // Remove completed or failed tasks
                if (item.status === 'completed' || item.status === 'failed') {
                    queue.items.shift();
                }
            }
        } finally {
            this.#processing.set(queueName, false);
        }
    }

    async #executeWithTimeout(item) {
        return Promise.race([
            item.task(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Task timeout'));
                }, item.options.timeout);
            })
        ]);
    }

    async #handleTaskError(queue, item, error) {
        this.#logger.error('Task error:', {
            queueName: queue.name,
            taskId: item.id,
            error: error.message
        });

        if (item.options.retries < item.options.maxRetries) {
            item.options.retries++;
            item.status = 'pending';
            
            // Move to end of queue for retry after delay
            queue.items.shift();
            await new Promise(resolve => setTimeout(resolve, queue.options.retryDelay));
            queue.items.push(item);

        } else {
            item.status = 'failed';
            item.error = error.message;
            item.failedAt = new Date().toISOString();
        }
    }

    pause(queueName) {
        const queue = this.#queues.get(queueName);
        if (queue) {
            queue.paused = true;
            this.#logger.info('Queue paused:', queueName);
        }
    }

    resume(queueName) {
        const queue = this.#queues.get(queueName);
        if (queue) {
            queue.paused = false;
            this.#processQueue(queueName);
            this.#logger.info('Queue resumed:', queueName);
        }
    }

    pauseAll() {
        for (const [queueName] of this.#queues) {
            this.pause(queueName);
        }
    }

    resumeAll() {
        for (const [queueName] of this.#queues) {
            this.resume(queueName);
        }
    }

    clear(queueName) {
        const queue = this.#queues.get(queueName);
        if (queue) {
            queue.items = [];
            this.#logger.info('Queue cleared:', queueName);
        }
    }

    clearAll() {
        for (const [queueName] of this.#queues) {
            this.clear(queueName);
        }
    }

    getQueueStatus(queueName) {
        const queue = this.#queues.get(queueName);
        if (!queue) return null;

        return {
            name: queue.name,
            size: queue.items.length,
            paused: queue.paused,
            processing: this.#processing.get(queueName),
            items: queue.items.map(item => ({
                id: item.id,
                status: item.status,
                retries: item.options.retries,
                priority: item.options.priority,
                addedAt: item.addedAt,
                startedAt: item.startedAt,
                completedAt: item.completedAt,
                failedAt: item.failedAt,
                error: item.error
            }))
        };
    }

    getStats() {
        const stats = {
            queues: {},
            totalQueues: this.#queues.size,
            totalTasks: 0,
            processingQueues: 0
        };

        for (const [name, queue] of this.#queues) {
            const queueStats = {
                size: queue.items.length,
                paused: queue.paused,
                processing: this.#processing.get(name),
                pending: queue.items.filter(i => i.status === 'pending').length,
                processing: queue.items.filter(i => i.status === 'processing').length,
                completed: queue.items.filter(i => i.status === 'completed').length,
                failed: queue.items.filter(i => i.status === 'failed').length
            };

            stats.queues[name] = queueStats;
            stats.totalTasks += queue.items.length;
            if (this.#processing.get(name)) {
                stats.processingQueues++;
            }
        }

        return stats;
    }

    static getInstance() {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }
}

// Create and export singleton instance
const queueService = QueueService.getInstance();
export default queueService;