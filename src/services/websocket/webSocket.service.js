class WebSocketService {
    #ws;
    #url;
    #reconnectAttempts = 0;
    #maxReconnectAttempts = 5;
    #reconnectDelay = 1000;
    #debugMode = window.env.SITE_STATE === 'dev';
    #handlers = new Map();
    #connected = false;

    constructor() {
        if (this.#debugMode) {
            console.log('WebSocketService initializing');
        }
        this.#url = window.env.SITE_STATE === 'dev' 
            ? 'ws://localhost:8080'
            : 'wss://api.quantumeye.com/ws';
    }

    connect() {
        try {
            this.#ws = new WebSocket(this.#url);
            this.#setupEventHandlers();

            if (this.#debugMode) {
                console.log('WebSocket connecting to:', this.#url);
            }
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.#handleError(error);
        }
    }

    #setupEventHandlers() {
        this.#ws.onopen = () => {
            this.#connected = true;
            this.#reconnectAttempts = 0;
            
            if (this.#debugMode) {
                console.log('WebSocket connected');
            }

            // Notify handlers
            this.#notifyHandlers('connect', { status: 'connected' });
        };

        this.#ws.onclose = () => {
            this.#connected = false;
            
            if (this.#debugMode) {
                console.log('WebSocket disconnected');
            }

            // Attempt to reconnect
            this.#attemptReconnect();

            // Notify handlers
            this.#notifyHandlers('disconnect', { status: 'disconnected' });
        };

        this.#ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.#handleError(error);
        };

        this.#ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (this.#debugMode) {
                    console.log('WebSocket message received:', message);
                }

                this.#handleMessage(message);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
                this.#handleError(error);
            }
        };
    }

    #handleMessage(message) {
        const { type, data } = message;
        this.#notifyHandlers(type, data);
    }

    #handleError(error) {
        console.error('WebSocket error:', error);
        this.#notifyHandlers('error', { error });
    }

    #attemptReconnect() {
        if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.#reconnectAttempts++;
        const delay = this.#reconnectDelay * Math.pow(2, this.#reconnectAttempts - 1);

        if (this.#debugMode) {
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.#reconnectAttempts})`);
        }

        setTimeout(() => this.connect(), delay);
    }

    #notifyHandlers(type, data) {
        const handlers = this.#handlers.get(type) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in WebSocket handler for type '${type}':`, error);
            }
        });
    }

    send(type, data) {
        if (!this.#connected) {
            throw new Error('WebSocket is not connected');
        }

        const message = JSON.stringify({ type, data });
        
        if (this.#debugMode) {
            console.log('Sending WebSocket message:', { type, data });
        }

        this.#ws.send(message);
    }

    on(type, handler) {
        if (!this.#handlers.has(type)) {
            this.#handlers.set(type, []);
        }
        this.#handlers.get(type).push(handler);

        if (this.#debugMode) {
            console.log(`Added handler for message type: ${type}`);
        }

        // Return unsubscribe function
        return () => this.off(type, handler);
    }

    off(type, handler) {
        if (!this.#handlers.has(type)) return;

        const handlers = this.#handlers.get(type);
        const index = handlers.indexOf(handler);
        
        if (index !== -1) {
            handlers.splice(index, 1);
            
            if (this.#debugMode) {
                console.log(`Removed handler for message type: ${type}`);
            }
        }

        if (handlers.length === 0) {
            this.#handlers.delete(type);
        }
    }

    disconnect() {
        if (this.#ws) {
            this.#ws.close();
            
            if (this.#debugMode) {
                console.log('WebSocket disconnected by user');
            }
        }
    }

    isConnected() {
        return this.#connected;
    }

    getStatus() {
        return {
            connected: this.#connected,
            reconnectAttempts: this.#reconnectAttempts,
            url: this.#url
        };
    }
}

// Create and export singleton instance
const websocket = new WebSocketService();
export default websocket;
