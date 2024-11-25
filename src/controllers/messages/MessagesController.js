import { DataService } from '../../models/dataservice.js';
import { User } from '../../models/user.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class MessagesController {
    #logger;
    #view;
    #dataService;
    #currentUser;
    #isInitialized = false;
    #messagePollingInterval = 30000; // 30 seconds
    #pollingTimer = null;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('MessagesController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to messages');
                navigation.navigateToPage('login');
                return;
            }

            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Get current user
            this.#currentUser = User.getCurrentUser();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load initial messages
            await this.#loadMessages();

            // Start message polling
            this.#startMessagePolling();

            this.#isInitialized = true;
            this.#logger.info('MessagesController initialized successfully');
        } catch (error) {
            this.#logger.error('MessagesController initialization error:', error);
            this.#handleError('Failed to initialize messages');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        this.#logger.info('Authorization check:', { isAuthenticated });
        return isAuthenticated;
    }

    #initializeView() {
        this.#view = {
            // Message containers
            messagesContainer: document.getElementById('messages-container'),
            messagesList: document.getElementById('messages-list'),
            conversationList: document.getElementById('conversation-list'),
            
            // Message form elements
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            recipientSelect: document.getElementById('recipient-select'),
            
            // Filter elements
            searchInput: document.getElementById('message-search'),
            filterSelect: document.getElementById('message-filter'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message'),
            unreadBadge: document.getElementById('unread-badge')
        };

        this.#logger.debug('View elements initialized:', {
            hasMessagesContainer: !!this.#view.messagesContainer,
            hasMessageForm: !!this.#view.messageForm,
            hasFilters: !!(this.#view.searchInput && this.#view.filterSelect)
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

        // Conversation selection
        if (this.#view.conversationList) {
            this.#view.conversationList.addEventListener('click', (e) => this.#handleConversationSelect(e));
        }

        // Handle visibility change to manage polling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.#stopMessagePolling();
            } else {
                this.#startMessagePolling();
            }
        });

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadMessages() {
        try {
            this.#showLoading(true);
            const messages = await this.#dataService.getData();
            
            const userMessages = this.#filterMessagesByUser(messages);
            await this.#renderMessages(userMessages);
            
            this.#updateUnreadCount(userMessages);

            this.#logger.info('Messages loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading messages:', error);
            this.#handleError('Failed to load messages');
        } finally {
            this.#showLoading(false);
        }
    }

    #filterMessagesByUser(messages) {
        return messages.filter(message => 
            message.senderId === this.#currentUser.id ||
            message.recipientId === this.#currentUser.id
        );
    }

    async #renderMessages(messages) {
        if (!this.#view.messagesList) return;

        this.#view.messagesList.innerHTML = messages.length ? 
            messages.map(message => this.#createMessageElement(message)).join('') :
            '<div class="no-messages">No messages found</div>';
    }

    #createMessageElement(message) {
        const isOwn = message.senderId === this.#currentUser.id;
        return `
            <div class="message ${isOwn ? 'message--own' : ''}" data-message-id="${message.id}">
                <div class="message__header">
                    <span class="message__sender">${message.senderName}</span>
                    <span class="message__time">${this.#formatDate(message.timestamp)}</span>
                </div>
                <div class="message__content">${this.#escapeHtml(message.content)}</div>
                ${!message.read && !isOwn ? '<span class="message__unread">New</span>' : ''}
            </div>
        `;
    }

    async #handleMessageSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing message submission');

        try {
            this.#showLoading(true);

            const messageData = this.#getMessageFormData();
            
            if (!this.#validateMessageData(messageData)) {
                return;
            }

            await this.#sendMessage(messageData);
            
            this.#showSuccess('Message sent successfully');
            event.target.reset();
            await this.#loadMessages();

        } catch (error) {
            this.#logger.error('Error sending message:', error);
            this.#handleError('Failed to send message');
        } finally {
            this.#showLoading(false);
        }
    }

    #getMessageFormData() {
        return {
            content: this.#view.messageInput.value.trim(),
            recipientId: this.#view.recipientSelect.value,
            senderId: this.#currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        };
    }

    #validateMessageData(message) {
        if (!message.content) {
            this.#handleError('Message content is required');
            return false;
        }

        if (!message.recipientId) {
            this.#handleError('Recipient is required');
            return false;
        }

        return true;
    }

    async #sendMessage(messageData) {
        try {
            await this.#dataService.addMessage(messageData);
            this.#logger.info('Message sent successfully');
        } catch (error) {
            throw new Error('Failed to send message');
        }
    }

    #handleConversationSelect(event) {
        const conversationEl = event.target.closest('.conversation');
        if (!conversationEl) return;

        const conversationId = conversationEl.dataset.conversationId;
        this.#loadConversation(conversationId);
    }

    async #loadConversation(conversationId) {
        try {
            this.#showLoading(true);
            const messages = await this.#dataService.getConversationMessages(conversationId);
            await this.#renderMessages(messages);
            await this.#markConversationAsRead(conversationId);
        } catch (error) {
            this.#logger.error('Error loading conversation:', error);
            this.#handleError('Failed to load conversation');
        } finally {
            this.#showLoading(false);
        }
    }

    async #markConversationAsRead(conversationId) {
        try {
            await this.#dataService.markConversationAsRead(conversationId);
            this.#updateUnreadCount();
        } catch (error) {
            this.#logger.error('Error marking conversation as read:', error);
        }
    }

    #updateUnreadCount(messages) {
        if (!this.#view.unreadBadge) return;

        const unreadCount = messages?.filter(m => 
            !m.read && m.recipientId === this.#currentUser.id
        ).length || 0;

        this.#view.unreadBadge.textContent = unreadCount;
        this.#view.unreadBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    #startMessagePolling() {
        this.#pollingTimer = setInterval(() => this.#loadMessages(), this.#messagePollingInterval);
        this.#logger.debug('Message polling started');
    }

    #stopMessagePolling() {
        if (this.#pollingTimer) {
            clearInterval(this.#pollingTimer);
            this.#pollingTimer = null;
            this.#logger.debug('Message polling stopped');
        }
    }

    #handleSearch() {
        this.#loadMessages();
    }

    #handleFilterChange() {
        this.#loadMessages();
    }

    #debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    #formatDate(date) {
        return new Date(date).toLocaleString();
    }

    #escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
        return parseInt(this.#view.unreadBadge?.textContent || '0');
    }

    cleanup() {
        this.#stopMessagePolling();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MessagesController();
});