import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import websocketService from '../../services/websocket/WebSocketService.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class MessageController {
    #logger;
    #view;
    #dataService;
    #currentConversation = null;
    #isInitialized = false;
    #messagePollingInterval = 10000; // 10 seconds
    #pollingTimer = null;
    #unreadCount = 0;
    #messageCache = new Map();

    constructor() {
        this.#logger = Logger;
        this.#logger.info('MessageController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authentication
            if (!User.isAuthenticated()) {
                this.#logger.warn('Unauthorized access attempt to messages');
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

            // Setup WebSocket connection
            this.#setupWebSocket();

            // Load initial messages
            await this.#loadMessages();

            // Start polling for new messages (fallback for WebSocket)
            this.#startMessagePolling();

            this.#isInitialized = true;
            this.#logger.info('MessageController initialized successfully');
        } catch (error) {
            this.#logger.error('MessageController initialization error:', error);
            this.#handleError('Failed to initialize messages');
        }
    }

    #initializeView() {
        this.#view = {
            // Message containers
            messageList: document.getElementById('message-list'),
            conversationList: document.getElementById('conversation-list'),
            messageContainer: document.getElementById('message-container'),
            
            // Message form
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            recipientSelect: document.getElementById('recipient-select'),
            
            // Controls
            searchInput: document.getElementById('message-search'),
            filterSelect: document.getElementById('message-filter'),
            refreshButton: document.getElementById('refresh-messages'),
            
            // Unread badge
            unreadBadge: document.getElementById('unread-badge'),
            
            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasMessageList: !!this.#view.messageList,
            hasMessageForm: !!this.#view.messageForm,
            hasControls: !!this.#view.searchInput
        });
    }

    #setupEventListeners() {
        // Message form submission
        if (this.#view.messageForm) {
            this.#view.messageForm.addEventListener('submit', (e) => this.#handleMessageSubmit(e));
        }

        // Search input
        if (this.#view.searchInput) {
            this.#view.searchInput.addEventListener('input', 
                this.#debounce(() => this.#handleSearch(), 300)
            );
        }

        // Filter change
        if (this.#view.filterSelect) {
            this.#view.filterSelect.addEventListener('change', () => this.#handleFilterChange());
        }

        // Refresh button
        if (this.#view.refreshButton) {
            this.#view.refreshButton.addEventListener('click', () => this.#loadMessages());
        }

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.#stopMessagePolling();
            } else {
                this.#startMessagePolling();
                this.#loadMessages();
            }
        });

        // Handle conversation selection
        if (this.#view.conversationList) {
            this.#view.conversationList.addEventListener('click', (e) => {
                const conversationEl = e.target.closest('.conversation');
                if (conversationEl) {
                    this.#loadConversation(conversationEl.dataset.id);
                }
            });
        }
    }

    #setupWebSocket() {
        websocketService.subscribe('message', (message) => {
            this.#handleNewMessage(message);
        });

        websocketService.subscribe('status', (status) => {
            this.#updateUserStatus(status);
        });
    }

    async #loadMessages() {
        try {
            this.#showLoading(true);
            const messages = await this.#dataService.getMessages();
            this.#renderMessages(messages);
            this.#updateUnreadCount();
        } catch (error) {
            this.#logger.error('Error loading messages:', error);
            this.#handleError('Failed to load messages');
        } finally {
            this.#showLoading(false);
        }
    }

    #renderMessages(messages) {
        if (!this.#view.messageList) return;

        this.#view.messageList.innerHTML = messages.length ? 
            messages.map(message => this.#createMessageElement(message)).join('') :
            '<div class="no-messages">No messages</div>';
    }

    #createMessageElement(message) {
        const currentUser = User.getCurrentUser();
        const isOwn = message.senderId === currentUser.id;
        
        return `
            <div class="message ${isOwn ? 'message--own' : ''}" data-id="${message.id}">
                <div class="message__header">
                    <span class="message__sender">${message.senderName}</span>
                    <span class="message__time">${this.#formatDate(message.timestamp)}</span>
                </div>
                <div class="message__content">${this.#formatMessageContent(message.content)}</div>
                ${!message.read && !isOwn ? '<span class="message__unread">New</span>' : ''}
            </div>
        `;
    }

    async #handleMessageSubmit(event) {
        event.preventDefault();

        try {
            const messageData = {
                content: this.#view.messageInput.value.trim(),
                recipientId: this.#view.recipientSelect.value,
                timestamp: new Date().toISOString()
            };

            if (!this.#validateMessage(messageData)) {
                return;
            }

            this.#showLoading(true);
            await this.#sendMessage(messageData);
            
            this.#view.messageForm.reset();
            this.#showSuccess('Message sent successfully');
            
        } catch (error) {
            this.#logger.error('Error sending message:', error);
            this.#handleError('Failed to send message');
        } finally {
            this.#showLoading(false);
        }
    }

    #validateMessage(message) {
        if (!message.content) {
            this.#handleError('Message cannot be empty');
            return false;
        }
        if (!message.recipientId) {
            this.#handleError('Please select a recipient');
            return false;
        }
        return true;
    }

    async #sendMessage(messageData) {
        try {
            // Try WebSocket first
            if (websocketService.isConnected()) {
                websocketService.send('message', messageData);
                return;
            }

            // Fallback to HTTP
            await this.#dataService.sendMessage(messageData);
            
        } catch (error) {
            throw new Error('Failed to send message');
        }
    }

    #handleNewMessage(message) {
        this.#messageCache.set(message.id, message);
        this.#updateUnreadCount();
        this.#renderMessages([...this.#messageCache.values()]);
        
        if (document.hidden) {
            this.#showNotification(message);
        }
    }

    #showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', {
                body: message.content,
                icon: '/assets/notification-icon.png'
            });
        }
    }

    #updateUnreadCount() {
        const unreadMessages = [...this.#messageCache.values()]
            .filter(m => !m.read && m.recipientId === User.getCurrentUser().id);
        
        this.#unreadCount = unreadMessages.length;
        
        if (this.#view.unreadBadge) {
            this.#view.unreadBadge.textContent = this.#unreadCount;
            this.#view.unreadBadge.style.display = this.#unreadCount > 0 ? 'block' : 'none';
        }
    }

    #startMessagePolling() {
        if (!this.#pollingTimer) {
            this.#pollingTimer = setInterval(() => {
                this.#loadMessages();
            }, this.#messagePollingInterval);
        }
    }

    #stopMessagePolling() {
        if (this.#pollingTimer) {
            clearInterval(this.#pollingTimer);
            this.#pollingTimer = null;
        }
    }

    #formatDate(date) {
        return new Date(date).toLocaleString();
    }

    #formatMessageContent(content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    #debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
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
    getUnreadCount() {
        return this.#unreadCount;
    }

    // Cleanup method
    cleanup() {
        this.#stopMessagePolling();
        websocketService.unsubscribe('message');
        websocketService.unsubscribe('status');
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MessageController();
});