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
    static #fileHandle = null;

    static async #initializeFileHandle() {
        try {
            // Request permission to access file system
            const handle = await window.showSaveFilePicker({
                suggestedName: 'app.log',
                types: [{
                    description: 'Log File',
                    accept: {'text/plain': ['.log']},
                }],
            });
            this.#fileHandle = handle;
        } catch (error) {
            console.warn('Unable to initialize file logging:', error);
        }
    }

    static async #writeToFile(entry) {
        if (!this.#fileHandle) {
            await this.#initializeFileHandle();
        }

        if (this.#fileHandle) {
            try {
                const writable = await this.#fileHandle.createWritable({ keepExistingData: true });
                await writable.seek((await this.#fileHandle.getFile()).size);
                await writable.write(entry);
                await writable.close();
            } catch (error) {
                console.error('Error writing to log file:', error);
            }
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

        // Always log to console
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

        // Add to buffer
        this.#logBuffer.push(logEntry);
        if (this.#logBuffer.length >= this.#maxBufferSize) {
            // Write buffer to file
            const buffer = this.#logBuffer.join('');
            this.#logBuffer = [];
            await this.#writeToFile(buffer);
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

    // Flush remaining buffer
    static async flush() {
        if (this.#logBuffer.length > 0) {
            const buffer = this.#logBuffer.join('');
            this.#logBuffer = [];
            await this.#writeToFile(buffer);
        }
    }
}

export default Logger;
