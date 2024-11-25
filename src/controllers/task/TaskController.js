import { DataService } from '../../models/dataservice.js';
import { User } from '../../models/user.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import { ROLES } from '../../models/index.js';

export class TaskController {
    #logger;
    #view;
    #dataService;
    #currentTask = null;
    #isInitialized = false;
    #taskFilters = {
        status: 'all',
        priority: 'all',
        assignee: 'all'
    };

    constructor() {
        this.#logger = Logger;
        this.#logger.info('TaskController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to tasks');
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
            await this.#loadTasks();

            this.#isInitialized = true;
            this.#logger.info('TaskController initialized successfully');
        } catch (error) {
            this.#logger.error('TaskController initialization error:', error);
            this.#handleError('Failed to initialize task management');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated; // All authenticated users can access tasks
    }

    #initializeView() {
        this.#view = {
            // Task list elements
            taskList: document.getElementById('tasks-list'),
            taskTemplate: document.getElementById('task-template'),

            // Filter elements
            statusFilter: document.getElementById('status-filter'),
            priorityFilter: document.getElementById('priority-filter'),
            assigneeFilter: document.getElementById('assignee-filter'),
            searchInput: document.getElementById('task-search'),

            // Task form elements
            taskForm: document.getElementById('task-form'),
            taskTitle: document.getElementById('task-title'),
            taskDescription: document.getElementById('task-description'),
            taskPriority: document.getElementById('task-priority'),
            taskDueDate: document.getElementById('task-due-date'),
            taskAssignee: document.getElementById('task-assignee'),

            // Modal elements
            createTaskModal: document.getElementById('create-task-modal'),
            editTaskModal: document.getElementById('edit-task-modal'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('View elements initialized:', {
            hasTaskList: !!this.#view.taskList,
            hasFilters: !!(this.#view.statusFilter && this.#view.priorityFilter),
            hasTaskForm: !!this.#view.taskForm
        });
    }

    #setupEventListeners() {
        // Filter change handlers
        if (this.#view.statusFilter) {
            this.#view.statusFilter.addEventListener('change', () => this.#handleFilterChange());
        }
        if (this.#view.priorityFilter) {
            this.#view.priorityFilter.addEventListener('change', () => this.#handleFilterChange());
        }
        if (this.#view.assigneeFilter) {
            this.#view.assigneeFilter.addEventListener('change', () => this.#handleFilterChange());
        }

        // Search handler
        if (this.#view.searchInput) {
            this.#view.searchInput.addEventListener('input', 
                this.#debounce(() => this.#handleSearch(), 300)
            );
        }

        // Task form handlers
        if (this.#view.taskForm) {
            this.#view.taskForm.addEventListener('submit', (e) => this.#handleTaskSubmit(e));
        }

        // Task list event delegation
        if (this.#view.taskList) {
            this.#view.taskList.addEventListener('click', (e) => this.#handleTaskAction(e));
        }

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadTasks() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading tasks with filters:', this.#taskFilters);

            const tasks = await this.#dataService.getData();
            const filteredTasks = this.#filterTasks(tasks);
            
            await this.#renderTasks(filteredTasks);
            this.#logger.info('Tasks loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading tasks:', error);
            this.#handleError('Failed to load tasks');
        } finally {
            this.#showLoading(false);
        }
    }

    #filterTasks(tasks) {
        return tasks.filter(task => {
            const matchesStatus = this.#taskFilters.status === 'all' || 
                                task.status === this.#taskFilters.status;
            const matchesPriority = this.#taskFilters.priority === 'all' || 
                                  task.priority === this.#taskFilters.priority;
            const matchesAssignee = this.#taskFilters.assignee === 'all' || 
                                  task.assignee === this.#taskFilters.assignee;
            
            return matchesStatus && matchesPriority && matchesAssignee;
        });
    }

    async #renderTasks(tasks) {
        if (!this.#view.taskList || !this.#view.taskTemplate) return;

        this.#view.taskList.innerHTML = '';

        if (tasks.length === 0) {
            this.#showNoTasks();
            return;
        }

        tasks.forEach(task => {
            const taskElement = this.#createTaskElement(task);
            this.#view.taskList.appendChild(taskElement);
        });
    }

    #createTaskElement(task) {
        const template = this.#view.taskTemplate.content.cloneNode(true);
        const taskElement = template.querySelector('.task-item');

        taskElement.dataset.taskId = task.id;
        taskElement.querySelector('.task-title').textContent = task.title;
        taskElement.querySelector('.task-description').textContent = task.description;
        taskElement.querySelector('.task-priority').textContent = task.priority;
        taskElement.querySelector('.task-due-date').textContent = this.#formatDate(task.dueDate);
        taskElement.querySelector('.task-assignee').textContent = task.assignee;
        taskElement.querySelector('.task-status').textContent = task.status;

        return taskElement;
    }

    #showNoTasks() {
        this.#view.taskList.innerHTML = `
            <div class="no-tasks-message">
                <p>No tasks found</p>
            </div>
        `;
    }

    async #handleTaskSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing task submission');

        try {
            this.#showLoading(true);

            const taskData = this.#getTaskFormData();
            
            if (!this.#validateTaskData(taskData)) {
                return;
            }

            if (this.#currentTask) {
                await this.#updateTask(taskData);
            } else {
                await this.#createTask(taskData);
            }

            this.#closeModals();
            await this.#loadTasks();
            event.target.reset();

        } catch (error) {
            this.#logger.error('Error submitting task:', error);
            this.#handleError('Failed to save task');
        } finally {
            this.#showLoading(false);
        }
    }

    #getTaskFormData() {
        return {
            title: this.#view.taskTitle.value.trim(),
            description: this.#view.taskDescription.value.trim(),
            priority: this.#view.taskPriority.value,
            dueDate: this.#view.taskDueDate.value,
            assignee: this.#view.taskAssignee.value,
            status: 'pending'
        };
    }

    #validateTaskData(task) {
        if (!task.title) {
            this.#handleError('Task title is required');
            return false;
        }

        if (!task.dueDate) {
            this.#handleError('Due date is required');
            return false;
        }

        if (!task.assignee) {
            this.#handleError('Assignee is required');
            return false;
        }

        return true;
    }

    async #createTask(taskData) {
        try {
            await this.#dataService.addTask(taskData);
            this.#showSuccess('Task created successfully');
        } catch (error) {
            throw new Error('Failed to create task');
        }
    }

    async #updateTask(taskData) {
        try {
            await this.#dataService.updateTask(this.#currentTask.id, taskData);
            this.#showSuccess('Task updated successfully');
        } catch (error) {
            throw new Error('Failed to update task');
        }
    }

    #handleTaskAction(event) {
        const taskElement = event.target.closest('.task-item');
        if (!taskElement) return;

        const taskId = taskElement.dataset.taskId;
        const action = event.target.dataset.action;

        switch (action) {
            case 'edit':
                this.#editTask(taskId);
                break;
            case 'delete':
                this.#deleteTask(taskId);
                break;
            case 'complete':
                this.#completeTask(taskId);
                break;
            default:
                break;
        }
    }

    #handleFilterChange() {
        this.#taskFilters = {
            status: this.#view.statusFilter?.value || 'all',
            priority: this.#view.priorityFilter?.value || 'all',
            assignee: this.#view.assigneeFilter?.value || 'all'
        };

        this.#loadTasks();
    }

    #handleSearch() {
        this.#loadTasks();
    }

    #debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    #formatDate(date) {
        return new Date(date).toLocaleDateString();
    }

    #closeModals() {
        if (this.#view.createTaskModal) {
            this.#view.createTaskModal.style.display = 'none';
        }
        if (this.#view.editTaskModal) {
            this.#view.editTaskModal.style.display = 'none';
        }
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
    getCurrentTask() {
        return this.#currentTask;
    }

    resetFilters() {
        this.#taskFilters = {
            status: 'all',
            priority: 'all',
            assignee: 'all'
        };
        this.#loadTasks();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TaskController();
});