import config from '../../../config/client.js';

class QueueService {
    #queue = [];
    #processing = false;
    #maxRetries = 3;
    #debugMode = window.env.SITE_STATE === 'dev';
    #maxQueueSize = 1000;

    constructor() {
        if (this.#debugMode) {
            console.log('QueueService initializing');
        }
        this.#initialize();
    }

    #initialize() {
        // Setup unload handler to save queue
        window.addEventListener('beforeunload', () => {
            this.#saveQueue();
        });

        // Load saved queue
        this.#loadQueue();

        // Start processing
        this.#processQueue();
    }

    #saveQueue() {
        try {
            localStorage.setItem('taskQueue', JSON.stringify(this.#queue));
        } catch (error) {
            console.error('Error saving queue:', error);
        }
    }

    #loadQueue() {
        try {
            const savedQueue = localStorage.getItem('taskQueue');
            if (savedQueue) {
                this.#queue = JSON.parse(savedQueue);
                if (this.#debugMode) {
                    console.log('Loaded saved queue:', this.#queue);
                }
            }
        } catch (error) {
            console.error('Error loading queue:', error);
        }
    }

    async #processQueue() {
        if (this.#processing || this.#queue.length === 0) return;

        this.#processing = true;

        try {
            while (this.#queue.length > 0) {
                const task = this.#queue[0];
                
                if (this.#debugMode) {
                    console.log('Processing task:', task);
                }

                try {
                    await this.#processTask(task);
                    this.#queue.shift(); // Remove completed task
                    this.#saveQueue();
                } catch (error) {
                    if (task.retries < this.#maxRetries) {
                        task.retries++;
                        if (this.#debugMode) {
                            console.log(`Retrying task (${task.retries}/${this.#maxRetries}):`, task);
                        }
                    } else {
                        this.#queue.shift(); // Remove failed task
                        this.#saveQueue();
                        console.error('Task failed after max retries:', task, error);
                    }
                }
            }
        } finally {
            this.#processing = false;
        }
    }

    async #processTask(task) {
        // Simulate task processing
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    resolve();
                } else {
                    reject(new Error('Random task failure'));
                }
            }, 1000);
        });
    }

    addTask(task) {
        if (this.#queue.length >= this.#maxQueueSize) {
            throw new Error('Queue is full');
        }

        const newTask = {
            ...task,
            id: Date.now(),
            retries: 0,
            addedAt: new Date().toISOString()
        };

        this.#queue.push(newTask);
        this.#saveQueue();

        if (this.#debugMode) {
            console.log('Added task to queue:', newTask);
        }

        // Start processing if not already processing
        if (!this.#processing) {
            this.#processQueue();
        }

        return newTask.id;
    }

    removeTask(taskId) {
        const index = this.#queue.findIndex(task => task.id === taskId);
        if (index !== -1) {
            const removedTask = this.#queue.splice(index, 1)[0];
            this.#saveQueue();

            if (this.#debugMode) {
                console.log('Removed task from queue:', removedTask);
            }

            return true;
        }
        return false;
    }

    getQueueStatus() {
        return {
            length: this.#queue.length,
            processing: this.#processing,
            tasks: [...this.#queue]
        };
    }

    clearQueue() {
        this.#queue = [];
        this.#saveQueue();

        if (this.#debugMode) {
            console.log('Queue cleared');
        }
    }
}

// Create and export singleton instance
const queue = new QueueService();
export default queue;
