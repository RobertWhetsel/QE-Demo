class AnalyticsService {
    #enabled = window.env.SITE_STATE !== 'dev';
    #events = [];
    #maxEvents = 1000;

    constructor() {
        if (this.#enabled) {
            console.log('Analytics Service initializing');
            this.#initialize();
        }
    }

    #initialize() {
        // Setup event listeners
        window.addEventListener('beforeunload', () => {
            this.#flush();
        });

        // Setup periodic flush
        setInterval(() => this.#flush(), 30000); // Flush every 30 seconds
    }

    #flush() {
        if (this.#events.length > 0) {
            // In production, send to analytics service
            // In dev, just log
            if (window.env.SITE_STATE === 'dev') {
                console.log('Analytics events:', this.#events);
            } else {
                // Send to analytics service
                this.#sendToAnalytics(this.#events);
            }
            this.#events = [];
        }
    }

    #sendToAnalytics(events) {
        // Implementation for sending to analytics service
        console.log('Sending to analytics:', events);
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

        if (this.#events.length >= this.#maxEvents) {
            this.#flush();
        }
    }

    trackPageView(page) {
        this.trackEvent('Page View', page);
    }

    trackError(error) {
        this.trackEvent('Error', error.message, error.stack);
    }

    trackTiming(category, variable, time) {
        this.trackEvent('Timing', category, variable, time);
    }
}

// Create and export singleton instance
const analytics = new AnalyticsService();
export default analytics;
