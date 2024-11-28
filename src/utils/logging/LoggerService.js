import config from '../../../config/client.js';

class LoggerService {
    #logBuffer = [];
    #maxBufferSize = 1000;
    #storageKey = 'appLogs';
    #logLevels = {
        ERROR: 'ERROR',
        WARN: 'WARN',
        INFO: 'INFO',
        DEBUG: 'DEBUG'
    };
    #currentLevel = window.env.SITE_STATE === 'dev' ? 'DEBUG' : 'INFO';
    #levelColors = {
        ERROR: '#dc3545',
        WARN: '#ffc107',
        INFO: '#17a2b8',
        DEBUG: '#6c757d'
    };
    #isInitialized = false;

    constructor() {
        console.info('LoggerService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup unload handler
            window.addEventListener('beforeunload', () => {
                this.#flush();
            });

            // Clear old logs if necessary
            this.#cleanOldLogs();

            // Setup periodic flush
            setInterval(() => this.#flush(), 30000); // Flush every 30 seconds

            this.#isInitialized = true;
            console.info('LoggerService initialized successfully');
        } catch (error) {
            console.error('LoggerService initialization error:', error);
        }
    }

    #cleanOldLogs() {
        try {
            const logs = localStorage.getItem(this.#storageKey);
            if (logs) {
                const logEntries = logs.split('\n');
                if (logEntries.length > this.#maxBufferSize) {
                    const trimmedLogs = logEntries
                        .slice(-this.#maxBufferSize)
                        .join('\n');
                    localStorage.setItem(this.#storageKey, trimmedLogs);
                }
            }
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    async #writeToConsole(level, formattedMessage, ...args) {
        const color = this.#levelColors[level];
        const style = `color: ${color}; font-weight: bold;`;

        switch (level) {
            case this.#logLevels.ERROR:
                console.error(`%c${formattedMessage}`, style, ...args);
                break;
            case this.#logLevels.WARN:
                console.warn(`%c${formattedMessage}`, style, ...args);
                break;
            case this.#logLevels.DEBUG:
                console.debug(`%c${formattedMessage}`, style, ...args);
                break;
            default:
                console.log(`%c${formattedMessage}`, style, ...args);
        }
    }

    #saveToStorage(entry) {
        try {
            // Get existing logs
            let logs = localStorage.getItem(this.#storageKey) || '';
            
            // Append new entry
            logs += entry + '\n';
            
            // Save back to storage
            localStorage.setItem(this.#storageKey, logs);
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    async #log(level, message, ...args) {
        if (!this.#shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Format additional arguments if present
        const additionalInfo = args.length > 0 
            ? '\n' + args.map(arg => {
                try {
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (error) {
                    return String(arg);
                }
            }).join('\n')
            : '';

        const logEntry = formattedMessage + additionalInfo;

        // Write to console
        await this.#writeToConsole(level, formattedMessage, ...args);

        // Add to buffer
        this.#logBuffer.push(logEntry);
        
        if (this.#logBuffer.length >= this.#maxBufferSize) {
            await this.#flush();
        }
    }

    #shouldLog(level) {
        const levels = Object.keys(this.#logLevels);
        const currentLevelIndex = levels.indexOf(this.#currentLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    async #flush() {
        if (this.#logBuffer.length > 0) {
            const buffer = this.#logBuffer.join('\n');
            this.#logBuffer = [];
            this.#saveToStorage(buffer);
        }
    }

    // Public logging methods
    async error(message, ...args) {
        await this.#log(this.#logLevels.ERROR, message, ...args);
    }

    async warn(message, ...args) {
        await this.#log(this.#logLevels.WARN, message, ...args);
    }

    async info(message, ...args) {
        await this.#log(this.#logLevels.INFO, message, ...args);
    }

    async debug(message, ...args) {
        await this.#log(this.#logLevels.DEBUG, message, ...args);
    }

    // Public utility methods
    getLogs() {
        return localStorage.getItem(this.#storageKey) || '';
    }

    async downloadLogs() {
        await this.#flush();
        const logs = this.getLogs();
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-logs-${new Date().toISOString()}.log`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    clearLogs() {
        localStorage.removeItem(this.#storageKey);
        this.#logBuffer = [];
    }

    setLogLevel(level) {
        if (this.#logLevels[level]) {
            this.#currentLevel = level;
            this.info(`Log level set to: ${level}`);
            return true;
        }
        return false;
    }

    getLogLevel() {
        return this.#currentLevel;
    }

    // Search logs with optional filters
    searchLogs(query, options = {}) {
        const {
            level = null,
            startDate = null,
            endDate = null,
            caseSensitive = false
        } = options;

        const logs = this.getLogs().split('\n');
        return logs.filter(log => {
            if (!log) return false;

            // Apply level filter
            if (level && !log.includes(`[${level}]`)) return false;

            // Apply date range filter
            if (startDate || endDate) {
                const logDate = new Date(log.slice(1, 25));
                if (startDate && logDate < new Date(startDate)) return false;
                if (endDate && logDate > new Date(endDate)) return false;
            }

            // Apply search query
            if (query) {
                return caseSensitive
                    ? log.includes(query)
                    : log.toLowerCase().includes(query.toLowerCase());
            }

            return true;
        });
    }

    // Get log statistics
    getLogStats() {
        const logs = this.getLogs().split('\n').filter(Boolean);
        const stats = {
            total: logs.length,
            byLevel: {},
            byHour: {},
            recentErrors: []
        };

        logs.forEach(log => {
            // Count by level
            const levelMatch = log.match(/\[(ERROR|WARN|INFO|DEBUG)\]/);
            if (levelMatch) {
                const level = levelMatch[1];
                stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
            }

            // Count by hour
            const timestamp = new Date(log.slice(1, 25));
            const hour = timestamp.getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

            // Track recent errors
            if (log.includes('[ERROR]')) {
                stats.recentErrors.push({
                    timestamp,
                    message: log.slice(log.indexOf('[ERROR]') + 8)
                });
            }
        });

        // Keep only last 10 errors
        stats.recentErrors = stats.recentErrors
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

        return stats;
    }
}

// Create and export singleton instance
const logger = new LoggerService();
export default logger;
