import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import cacheService from '../cache/CacheService.js';
import { SITE_STATE } from '../../../config/paths.js';

class AnalyticsService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #events = [];
    #maxEvents = 1000;
    #flushInterval = 60000; // 1 minute
    #flushTimer = null;
    #isTracking = config.features.enableAnalytics;
    #sessionId = null;

    constructor() {
        if (AnalyticsService.instance) {
            return AnalyticsService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('AnalyticsService initializing');
        this.#initialize();
        AnalyticsService.instance = this;
    }

    async #initialize() {
        try {
            // Generate session ID
            this.#sessionId = this.#generateSessionId();
            
            // Setup auto-flush
            this.#setupAutoFlush();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('AnalyticsService initialized successfully');
        } catch (error) {
            this.#logger.error('AnalyticsService initialization error:', error);
            throw error;
        }
    }

    #generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    #setupAutoFlush() {
        if (this.#flushTimer) {
            clearInterval(this.#flushTimer);
        }
        this.#flushTimer = setInterval(() => this.flush(), this.#flushInterval);
    }

    #setupEventListeners() {
        // Track page views
        window.addEventListener('popstate', () => this.trackPageView());
        
        // Track user interactions
        document.addEventListener('click', (e) => this.#handleUserInteraction(e));
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('visibility', 'page_hidden');
            } else {
                this.trackEvent('visibility', 'page_visible');
            }
        });

        // Handle unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session', 'end');
            this.flush(true);
        });
    }

    #handleUserInteraction(event) {
        const target = event.target;
        
        // Track button clicks
        if (target.matches('button, .button')) {
            this.trackEvent('interaction', 'button_click', {
                buttonText: target.textContent,
                buttonId: target.id
            });
        }
        
        // Track form submissions
        if (target.matches('form')) {
            this.trackEvent('interaction', 'form_submit', {
                formId: target.id
            });
        }
        
        // Track link clicks
        if (target.matches('a')) {
            this.trackEvent('interaction', 'link_click', {
                href: target.href
            });
        }
    }

    trackEvent(category, action, data = {}) {
        if (!this.#isTracking) return;

        const event = {
            category,
            action,
            data,
            timestamp: new Date().toISOString(),
            sessionId: this.#sessionId,
            page: window.location.pathname,
            environment: SITE_STATE
        };

        this.#events.push(event);
        this.#logger.debug('Event tracked:', event);

        if (this.#events.length >= this.#maxEvents) {
            this.flush();
        }
    }

    trackPageView(details = {}) {
        this.trackEvent('page', 'view', {
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
            ...details
        });
    }

    trackError(error, context = {}) {
        this.trackEvent('error', error.name || 'generic_error', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }

    trackPerformance(metric, value, context = {}) {
        this.trackEvent('performance', metric, {
            value,
            ...context
        });
    }

    async flush(immediate = false) {
        if (!this.#events.length) return;

        try {
            const events = [...this.#events];
            this.#events = [];

            if (SITE_STATE === 'dev') {
                // Store in local storage in dev mode
                this.#storeEventsLocally(events);
                this.#logger.info('Events stored locally:', events.length);
            } else {
                // Send to analytics endpoint in production
                await this.#sendEvents(events, immediate);
            }
        } catch (error) {
            this.#logger.error('Error flushing events:', error);
            // Restore events that failed to send
            this.#events.unshift(...events);
        }
    }

    #storeEventsLocally(events) {
        try {
            const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            storedEvents.push(...events);
            localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
        } catch (error) {
            this.#logger.error('Error storing events locally:', error);
        }
    }

    async #sendEvents(events, immediate) {
        const endpoint = `${paths.BASE_URL}/api/analytics`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(events)
        };

        if (immediate) {
            // Use synchronous beacon API for immediate send
            return navigator.sendBeacon(endpoint, JSON.stringify(events));
        }

        const response = await fetch(endpoint, options);
        if (!response.ok) {
            throw new Error(`Failed to send events: ${response.statusText}`);
        }
    }

    // Public utility methods
    enableTracking() {
        this.#isTracking = true;
    }

    disableTracking() {
        this.#isTracking = false;
    }

    clearEvents() {
        this.#events = [];
        if (SITE_STATE === 'dev') {
            localStorage.removeItem('analytics_events');
        }
    }

    getStoredEvents() {
        if (SITE_STATE === 'dev') {
            try {
                return JSON.parse(localStorage.getItem('analytics_events') || '[]');
            } catch (error) {
                this.#logger.error('Error getting stored events:', error);
                return [];
            }
        }
        return [];
    }

    getStats() {
        return {
            isTracking: this.#isTracking,
            pendingEvents: this.#events.length,
            sessionId: this.#sessionId
        };
    }

    static getInstance() {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }
}

// Create and export singleton instance
const analyticsService = AnalyticsService.getInstance();
export default analyticsService;