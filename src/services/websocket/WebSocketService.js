import logger from '../logger/LoggerService.js';
import errorHandler from '../error/ErrorHandlerService.js';
import { User } from '../../models/user.js';
import { SITE_STATE } from '../../../config/paths.js';

class WebSocketService {
    #logger;
    #socket = null;
    #isConnected = false;
    #isInitialized = false;
    #connectionAttempts = 0;
    #maxReconnectAttempts = 5;
    #reconnectDelay = 3000; // 3 seconds
    #heartbeatInterval = 30000; // 30 seconds
    #heartbeatTimer = null;
    #messageQueue = [];
    #subscribers = new Map();
    #handlers = new Map();
    #baseUrl = SITE_STATE === 'dev' 
        ? 'ws://localhost:5500/ws'
        : 'wss://api.example.com/ws';

    constructor() {
        this.#logger = logger;
        this.#logger.info('WebSocketService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup message handlers
            this.#setupMessageHandlers();
            
            // Connect if user is authenticated
            if (User.isAuthenticated()) {
                this.connect();
            }

            // Listen for auth state changes
            this.#setupAuthListener();

            this.#isInitialized = true;
            this.#logger.info('WebSocketService initialized successfully');
        } catch (error) {
            this.#logger.error('WebSocketService initialization error:', error);
            errorHandler.handleError('Failed to initialize WebSocket service');
        }
    }

    #setupMessageHandlers() {
        // System handlers
        this.#handlers.set('ping', this.#handlePing.bind(this));
        this.#handlers.set('auth', this.#handleAuth.bind(this));
        this.#handlers.set('error', this.#handleError.bind(this));
        
        // Application handlers
        this.#handlers.set('notification', this.#handleNotification.bind(this));
        this.#handlers.set('user_update', this.#handleUserUpdate.bind(this));
        this.#handlers.set('task_update', this.#handleTaskUpdate.bind(this));
        this.#handlers.set('chat_message', this.#handleChatMessage.bind(this));
    }

    #setupAuthListener() {
        document.addEventListener('userDataReady', (event) => {
            if (event.detail && !this.#isConnected) {
                this.connect();
            }
        });
    }

    async connect() {
        if (this.#isConnected) return;

        try {
            this.#socket = new WebSocket(this.#baseUrl);
            
            this.#socket.onopen = this.#handleOpen.bind(this);
            this.#socket.onclose = this.#handleClose.bind(this);
            this.#socket.onerror = this.#handleSocketError.bind(this);
            this.#socket.onmessage = this.#handleMessage.bind(this);

            this.#logger.info('WebSocket connecting...');
        } catch (error) {
            this.#logger.error('WebSocket connection error:', error);
            this.#handleReconnect();
        }
    }

    disconnect() {
        if (this.#socket) {
            this.#socket.close();
            this.#socket = null;
            this.#isConnected = false;
            this.#stopHeartbeat();
            this.#logger.info('WebSocket disconnected');
        }
    }

    #handleOpen() {
        this.#isConnected = true;
        this.#connectionAttempts = 0;
        this.#startHeartbeat();
        this.#authenticate();
        this.#processMessageQueue();
        this.#logger.info('WebSocket connected');
    }

    #handleClose(event) {
        this.#isConnected = false;
        this.#stopHeartbeat();
        this.#logger.info('WebSocket closed:', { code: event.code, reason: event.reason });
        
        if (event.code !== 1000) { // Normal closure
            this.#handleReconnect();
        }
    }

    #handleSocketError(error) {
        this.#logger.error('WebSocket error:', error);
        errorHandler.handleError('WebSocket connection error');
    }

    #handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            const { type, data } = message;

            const handler = this.#handlers.get(type);
            if (handler) {
                handler(data);
            } else {
                this.#logger.warn('Unknown message type:', type);
            }

            // Notify subscribers
            this.#notifySubscribers(type, data);

        } catch (error) {
            this.#logger.error('Message handling error:', error);
        }
    }

    #handleReconnect() {
        if (this.#connectionAttempts >= this.#maxReconnectAttempts) {
            this.#logger.error('Max reconnection attempts reached');
            errorHandler.handleError('Unable to establish WebSocket connection');
            return;
        }

        this.#connectionAttempts++;
        this.#logger.info('Attempting to reconnect...', { attempt: this.#connectionAttempts });

        setTimeout(() => {
            this.connect();
        }, this.#reconnectDelay * this.#connectionAttempts);
    }

    #authenticate() {
        const user = User.getCurrentUser();
        if (user) {
            this.send('auth', {
                username: user.username,
                role: user.role
            });
        }
    }

    #startHeartbeat() {
        this.#stopHeartbeat();
        this.#heartbeatTimer = setInterval(() => {
            this.send('ping', { timestamp: Date.now() });
        }, this.#heartbeatInterval);
    }

    #stopHeartbeat() {
        if (this.#heartbeatTimer) {
            clearInterval(this.#heartbeatTimer);
            this.#heartbeatTimer = null;
        }
    }

    #processMessageQueue() {
        while (this.#messageQueue.length > 0) {
            const { type, data } = this.#messageQueue.shift();
            this.send(type, data);
        }
    }

    #notifySubscribers(type, data) {
        if (this.#subscribers.has(type)) {
            this.#subscribers.get(type).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.#logger.error('Subscriber callback error:', error);
                }
            });
        }
    }

    // Message handlers
    #handlePing(data) {
        this.send('pong', { timestamp: data.timestamp });
    }

    #handleAuth(data) {
        this.#logger.info('Authentication result:', data);
    }

    #handleError(error) {
        this.#logger.error('Server error:', error);
        errorHandler.handleError(error.message);
    }

    #handleNotification(data) {
        document.dispatchEvent(new CustomEvent('showNotification', {
            detail: data
        }));
    }

    #handleUserUpdate(data) {
        document.dispatchEvent(new CustomEvent('userUpdate', {
            detail: data
        }));
    }

    #handleTaskUpdate(data) {
        document.dispatchEvent(new CustomEvent('taskUpdate', {
            detail: data
        }));
    }

    #handleChatMessage(data) {
        document.dispatchEvent(new CustomEvent('chatMessage', {
            detail: data
        }));
    }

    // Public methods
    send(type, data) {
        if (!this.#isConnected) {
            this.#messageQueue.push({ type, data });
            return false;
        }

        try {
            this.#socket.send(JSON.stringify({ type, data }));
            return true;
        } catch (error) {
            this.#logger.error('Send error:', error);
            return false;
        }
    }

    subscribe(type, callback) {
        if (!this.#subscribers.has(type)) {
            this.#subscribers.set(type, new Set());
        }
        this.#subscribers.get(type).add(callback);
        return () => this.#subscribers.get(type).delete(callback);
    }

    // Public utility methods
    isConnected() {
        return this.#isConnected;
    }

    getConnectionStatus() {
        return {
            connected: this.#isConnected,
            attempts: this.#connectionAttempts,
            queueSize: this.#messageQueue.length
        };
    }

    clearMessageQueue() {
        this.#messageQueue = [];
    }

    // Configuration methods
    setReconnectAttempts(max) {
        this.#maxReconnectAttempts = max;
    }

    setReconnectDelay(delay) {
        this.#reconnectDelay = delay;
    }

    setHeartbeatInterval(interval) {
        this.#heartbeatInterval = interval;
        if (this.#isConnected) {
            this.#startHeartbeat();
        }
    }
}

// Create and export singleton instance
const websocketService = new WebSocketService();
export default websocketService;    