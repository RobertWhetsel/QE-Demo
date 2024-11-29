// Use proper path resolution from window.env
const { default: Logger } = await import(window.env.PathResolver.resolve(window.env.CORE_PATHS.utils.logging.logger));
const { EventBus } = await import(window.env.PathResolver.resolve(window.env.CORE_PATHS.services.events.eventBus));

class AnalyticsService {
    #enabled = window.env.SITE_STATE !== 'dev';
    #events = [];
    #maxEvents = window.env.ANALYTICS_MAX_EVENTS || 1000;
    #flushInterval = window.env.ANALYTICS_FLUSH_INTERVAL || 30000;
    #logger;

    constructor() {
        this.#logger = Logger;
        if (this.#enabled) {
            this.#logger.info('AnalyticsService initializing');
            this.#initialize();
        }
    }

    #initialize() {
        // Setup event listeners
        window.addEventListener('beforeunload', () => {
            this.#flush();
        });

        // Setup periodic flush
        setInterval(() => this.#flush(), this.#flushInterval);

        // Subscribe to relevant events
        EventBus.subscribe('error', (data) => this.trackError(data.error));
        EventBus.subscribe('navigationEnd', (data) => this.trackPageView(data.route));

        this.#logger.info('AnalyticsService initialized successfully');
    }

    #flush() {
        if (this.#events.length > 0) {
            // In production, send to analytics service
            // In dev, just log
            if (window.env.SITE_STATE === 'dev') {
                this.#logger.debug('Analytics events:', this.#events);
            } else {
                // Send to analytics service
                this.#sendToAnalytics(this.#events);
            }
            this.#events = [];
        }
    }

    #sendToAnalytics(events) {
        // Implementation for sending to analytics service
        this.#logger.info('Sending to analytics:', events);
        
        // Publish event for tracking
        EventBus.publish('analyticsSend', { events });
    }

    trackEvent(category, action, label = null, value = null) {
        if (!this.#enabled) return;

        const event = {
            category,
            action,
            label,
            value,
            timestamp: new Date().toISOString()
        };

        this.#events.push(event);
        
        // Publish event for real-time tracking
        EventBus.publish('analyticsEvent', event);

        if (this.#events.length >= this.#maxEvents) {
            this.#flush();
        }
    }

    trackPageView(page) {
        this.trackEvent('Page View', page);
        this.#logger.debug('Page view tracked:', page);
    }

    trackError(error) {
        this.trackEvent('Error', error.message, error.stack);
        this.#logger.debug('Error tracked:', error.message);
    }

    trackTiming(category, variable, time) {
        this.trackEvent('Timing', category, variable, time);
        this.#logger.debug('Timing tracked:', { category, variable, time });
    }

    // Public getters
    get isEnabled() {
        return this.#enabled;
    }

    get pendingEvents() {
        return this.#events.length;
    }

    get configuration() {
        return {
            enabled: this.#enabled,
            maxEvents: this.#maxEvents,
            flushInterval: this.#flushInterval
        };
    }
}

// Create and export singleton instance
const analytics = new AnalyticsService();
export default analytics;
