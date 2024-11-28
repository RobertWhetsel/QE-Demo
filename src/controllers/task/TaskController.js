import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';

class TaskController {
    #logger;
    #tasks = [];
    #debugMode = window.env.SITE_STATE === 'dev';

    constructor() {
        this.#logger = Logger;
        if (this.#debugMode) {
            this.#logger.info('TaskController initializing');
        }
        this.#initialize();
    }

    #initialize() {
        try {
            // Load tasks from storage
            this.#loadTasks();

            // Setup event listeners
            this.#setupEventListeners();

            if (this.#debugMode) {
                this.#logger.info('TaskController initialized successfully');
            }
        } catch (error) {
            this.#logger.error('TaskController initialization error:', error);
        }
    }

    #loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            this.#tasks = JSON.parse(storedTasks);
        }
    }

    #saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.#tasks));
    }

    #setupEventListeners() {
        // Add task event
        document.addEventListener('addTask', (event) => {
            this.addTask(event.detail);
        });

        // Complete task event
        document.addEventListener('completeTask', (event) => {
            this.completeTask(event.detail.id);
        });

        // Delete task event
        document.addEventListener('deleteTask', (event) => {
            this.deleteTask(event.detail.id);
        });
    }

    addTask(taskData) {
        const task = {
            id: Date.now(),
            ...taskData,
            createdAt: new Date().toISOString(),
            completed: false
        };

        this.#tasks.push(task);
        this.#saveTasks();

        if (this.#debugMode) {
            this.#logger.info('Task added:', task);
        }

        document.dispatchEvent(new CustomEvent('taskAdded', { detail: task }));
    }

    completeTask(taskId) {
        const task = this.#tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            this.#saveTasks();

            if (this.#debugMode) {
                this.#logger.info('Task completed:', task);
            }

            document.dispatchEvent(new CustomEvent('taskCompleted', { detail: task }));
        }
    }

    deleteTask(taskId) {
        const index = this.#tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const task = this.#tasks[index];
            this.#tasks.splice(index, 1);
            this.#saveTasks();

            if (this.#debugMode) {
                this.#logger.info('Task deleted:', task);
            }

            document.dispatchEvent(new CustomEvent('taskDeleted', { detail: task }));
        }
    }

    getTasks(filter = {}) {
        let filteredTasks = [...this.#tasks];

        if (filter.completed !== undefined) {
            filteredTasks = filteredTasks.filter(t => t.completed === filter.completed);
        }

        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            filteredTasks = filteredTasks.filter(t => 
                t.title.toLowerCase().includes(searchLower) ||
                t.description.toLowerCase().includes(searchLower)
            );
        }

        return filteredTasks;
    }

    getTaskById(taskId) {
        return this.#tasks.find(t => t.id === taskId);
    }

    updateTask(taskId, updates) {
        const task = this.#tasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, updates);
            this.#saveTasks();

            if (this.#debugMode) {
                this.#logger.info('Task updated:', task);
            }

            document.dispatchEvent(new CustomEvent('taskUpdated', { detail: task }));
        }
    }
}

// Create and export singleton instance
const taskController = new TaskController();
export default taskController;
