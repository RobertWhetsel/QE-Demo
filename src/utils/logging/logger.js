// Log levels
export const LogLevel = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

class Logger {
    static #logBuffer = [];
    static #maxBufferSize = 100;
    static #storageKey = 'appLogs';

    static async #writeToConsole(level, formattedMessage, ...args) {
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage, ...args);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, ...args);
                break;
            case LogLevel.DEBUG:
                console.debug(formattedMessage, ...args);
                break;
            default:
                console.log(formattedMessage, ...args);
        }
    }

    static #saveToStorage(entry) {
        try {
            // Get existing logs
            let logs = localStorage.getItem(this.#storageKey) || '';
            // Append new entry
            logs += entry;
            // Save back to storage
            localStorage.setItem(this.#storageKey, logs);
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    static async log(level, message, ...args) {
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

        const logEntry = formattedMessage + additionalInfo + '\n';

        // Write to console
        await this.#writeToConsole(level, formattedMessage, ...args);

        // Add to buffer
        this.#logBuffer.push(logEntry);
        
        if (this.#logBuffer.length >= this.#maxBufferSize) {
            await this.flush();
        }
    }

    static async error(message, ...args) {
        await this.log(LogLevel.ERROR, message, ...args);
    }

    static async warn(message, ...args) {
        await this.log(LogLevel.WARN, message, ...args);
    }

    static async info(message, ...args) {
        await this.log(LogLevel.INFO, message, ...args);
    }

    static async debug(message, ...args) {
        await this.log(LogLevel.DEBUG, message, ...args);
    }

    static getLogs() {
        return localStorage.getItem(this.#storageKey) || '';
    }

    static downloadLogs() {
        const logs = this.getLogs();
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app.log';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    static clearLogs() {
        localStorage.removeItem(this.#storageKey);
        this.#logBuffer = [];
    }

    // Initialize logger
    static init() {
        // Set up window unload handler to flush logs
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    // Flush remaining buffer
    static async flush() {
        if (this.#logBuffer.length > 0) {
            const buffer = this.#logBuffer.join('');
            this.#logBuffer = [];
            this.#saveToStorage(buffer);
        }
    }
}

// Initialize logger when imported
Logger.init();

export default Logger;
