import logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';

class NotificationService {
    #logger;
    #container;
    #queue = [];
    #isProcessing = false;
    #maxNotifications = 3;
    #defaultDuration = config.ui.toastDuration;
    #isInitialized = false;
    #notificationHistory = [];
    #maxHistorySize = 50;
    #positions = {
        'top-right': 'notification-container--top-right',
        'top-left': 'notification-container--top-left',
        'bottom-right': 'notification-container--bottom-right',
        'bottom-left': 'notification-container--bottom-left',
        'top-center': 'notification-container--top-center',
        'bottom-center': 'notification-container--bottom-center'
    };
    #currentPosition = 'top-right';

    constructor() {
        this.#logger = logger;
        this.#logger.info('NotificationService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Create notification container
            this.#createContainer();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Initialize browser notifications if available
            this.#initializeBrowserNotifications();

            this.#isInitialized = true;
            this.#logger.info('NotificationService initialized successfully');
        } catch (error) {
            this.#logger.error('NotificationService initialization error:', error);
            throw error;
        }
    }

    #createContainer() {
        if (!document.getElementById('notification-container')) {
            this.#container = document.createElement('div');
            this.#container.id = 'notification-container';
            this.#container.className = `notification-container ${this.#positions[this.#currentPosition]}`;
            document.body.appendChild(this.#container);
        } else {
            this.#container = document.getElementById('notification-container');
        }
    }

    #setupEventListeners() {
        // Listen for custom notification events
        document.addEventListener('showNotification', (event) => {
            const { message, type, duration, position } = event.detail;
            this.show(message, { type, duration, position });
        });

        // Handle visibility change for queued notifications
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.#queue.length > 0) {
                this.#processQueue();
            }
        });
    }

    async #initializeBrowserNotifications() {
        try {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.#logger.info('Browser notification permission:', permission);
            }
        } catch (error) {
            this.#logger.error('Error initializing browser notifications:', error);
        }
    }

    show(message, options = {}) {
        const {
            type = 'info',
            duration = this.#defaultDuration,
            position = this.#currentPosition,
            title = null,
            icon = null,
            actions = [],
            isPersistent = false,
            isHTML = false,
            useBrowserNotification = false
        } = options;

        this.#logger.info('Showing notification:', { message, type });

        const notification = {
            message,
            type,
            duration,
            position,
            title,
            icon,
            actions,
            isPersistent,
            isHTML,
            id: Date.now()
        };

        // Show browser notification if requested and available
        if (useBrowserNotification && this.#canShowBrowserNotification()) {
            this.#showBrowserNotification(notification);
        }

        // Add to queue and process
        this.#addToQueue(notification);
        this.#processQueue();

        // Add to history
        this.#addToHistory(notification);

        return notification.id;
    }

    #addToQueue(notification) {
        this.#queue.push(notification);
        
        // If queue exceeds maximum notifications, remove oldest non-persistent notification
        while (this.#queue.length > this.#maxNotifications) {
            const index = this.#queue.findIndex(n => !n.isPersistent);
            if (index !== -1) {
                this.#queue.splice(index, 1);
            } else {
                break;
            }
        }
    }

    async #processQueue() {
        if (this.#isProcessing || this.#queue.length === 0) return;

        this.#isProcessing = true;

        try {
            while (this.#queue.length > 0) {
                const notification = this.#queue.shift();
                await this.#displayNotification(notification);
            }
        } finally {
            this.#isProcessing = false;
        }
    }

    async #displayNotification(notification) {
        const {
            message,
            type,
            duration,
            actions,
            isPersistent,
            isHTML,
            id
        } = notification;

        return new Promise((resolve) => {
            const element = document.createElement('div');
            element.className = `notification notification--${type}`;
            element.setAttribute('data-notification-id', id);

            // Create content
            const content = document.createElement('div');
            content.className = 'notification__content';
            if (isHTML) {
                content.innerHTML = message;
            } else {
                content.textContent = message;
            }
            element.appendChild(content);

            // Add actions if any
            if (actions.length > 0) {
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'notification__actions';
                actions.forEach(action => {
                    const button = document.createElement('button');
                    button.className = `notification__action notification__action--${action.type || 'default'}`;
                    button.textContent = action.text;
                    button.onclick = () => {
                        action.callback();
                        if (action.closeOnClick !== false) {
                            this.close(id);
                        }
                    };
                    actionsContainer.appendChild(button);
                });
                element.appendChild(actionsContainer);
            }

            // Add close button if persistent
            if (isPersistent) {
                const closeButton = document.createElement('button');
                closeButton.className = 'notification__close';
                closeButton.innerHTML = '×';
                closeButton.onclick = () => this.close(id);
                element.appendChild(closeButton);
            }

            // Add to container
            this.#container.appendChild(element);

            // Apply entrance animation
            requestAnimationFrame(() => {
                element.classList.add('notification--show');
            });

            // Set timeout for removal if not persistent
            if (!isPersistent) {
                setTimeout(() => {
                    this.close(id);
                    resolve();
                }, duration);
            } else {
                resolve();
            }
        });
    }

    close(id) {
        const element = this.#container.querySelector(`[data-notification-id="${id}"]`);
        if (element) {
            element.classList.remove('notification--show');
            element.addEventListener('transitionend', () => {
                element.remove();
            });
        }
    }

    closeAll() {
        const notifications = this.#container.querySelectorAll('.notification');
        notifications.forEach(element => {
            const id = element.getAttribute('data-notification-id');
            this.close(id);
        });
        this.#queue = [];
    }

    #canShowBrowserNotification() {
        return (
            'Notification' in window &&
            Notification.permission === 'granted'
        );
    }

    #showBrowserNotification(notification) {
        const { title, message, icon } = notification;
        new Notification(title || 'Notification', {
            body: message,
            icon: icon || '/assets/notification-icon.png'
        });
    }

    #addToHistory(notification) {
        this.#notificationHistory.unshift({
            ...notification,
            timestamp: new Date().toISOString()
        });

        if (this.#notificationHistory.length > this.#maxHistorySize) {
            this.#notificationHistory.pop();
        }
    }

    // Public configuration methods
    setPosition(position) {
        if (this.#positions[position]) {
            this.#currentPosition = position;
            this.#container.className = `notification-container ${this.#positions[position]}`;
            return true;
        }
        return false;
    }

    setMaxNotifications(max) {
        this.#maxNotifications = max;
    }

    // Public utility methods
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }

    // History management
    getHistory() {
        return [...this.#notificationHistory];
    }

    clearHistory() {
        this.#notificationHistory = [];
    }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;