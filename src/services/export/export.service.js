import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import databaseService from '../database/DatabaseService.js';
import queueService from '../queue/queue.service.js';

class ExportService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #activeExports = new Set();
    #maxConcurrentExports = 3;
    #supportedFormats = new Set(['csv', 'json', 'xlsx', 'pdf']);
    #exportTimeout = 180000; // 3 minutes

    constructor() {
        if (ExportService.instance) {
            return ExportService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('ExportService initializing');
        this.#initialize();
        ExportService.instance = this;
    }

    async #initialize() {
        try {
            // Setup export queue
            queueService.createQueue('exports', {
                maxRetries: 2,
                priority: 1
            });

            this.#isInitialized = true;
            this.#logger.info('ExportService initialized successfully');
        } catch (error) {
            this.#logger.error('ExportService initialization error:', error);
            throw error;
        }
    }

    async exportData(config) {
        try {
            this.#logger.info('Starting data export:', config);

            // Validate configuration
            this.#validateExportConfig(config);

            // Check concurrent exports limit
            if (this.#activeExports.size >= this.#maxConcurrentExports) {
                throw new Error('Maximum concurrent exports limit reached');
            }

            const exportId = crypto.randomUUID();
            const exportTask = {
                id: exportId,
                config,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Add to active exports
            this.#activeExports.add(exportId);

            // Queue export
            await queueService.enqueue('exports', 
                () => this.#processExport(exportTask),
                { 
                    timeout: this.#exportTimeout,
                    priority: config.priority || 0
                }
            );

            return exportId;

        } catch (error) {
            this.#logger.error('Export error:', error);
            throw error;
        }
    }

    #validateExportConfig(config) {
        if (!config.type) {
            throw new Error('Export type is required');
        }

        if (!config.format || !this.#supportedFormats.has(config.format)) {
            throw new Error(`Unsupported format: ${config.format}`);
        }

        if (!config.data && !config.query) {
            throw new Error('Either data or query must be provided');
        }
    }

    async #processExport(exportTask) {
        try {
            this.#logger.info('Processing export:', exportTask.id);

            // Update status
            exportTask.status = 'processing';
            exportTask.startedAt = new Date().toISOString();

            // Get data
            const data = await this.#getExportData(exportTask.config);

            // Format data
            const formattedData = await this.#formatData(data, exportTask.config.format);

            // Generate file
            const file = await this.#generateFile(formattedData, exportTask.config);

            // Update status
            exportTask.status = 'completed';
            exportTask.completedAt = new Date().toISOString();
            exportTask.downloadUrl = file.url;
            exportTask.fileSize = file.size;

            return exportTask;

        } catch (error) {
            this.#logger.error('Export processing error:', error);
            exportTask.status = 'failed';
            exportTask.error = error.message;
            exportTask.failedAt = new Date().toISOString();
            throw error;
        } finally {
            this.#activeExports.delete(exportTask.id);
        }
    }

    async #getExportData(config) {
        if (config.data) {
            return config.data;
        }

        // Fetch data using query
        return await databaseService.query(config.query.table, {
            where: config.query.filters,
            orderBy: config.query.sort,
            limit: config.query.limit
        });
    }

    async #formatData(data, format) {
        const formatters = {
            csv: this.#formatCSV.bind(this),
            json: this.#formatJSON.bind(this),
            xlsx: this.#formatXLSX.bind(this),
            pdf: this.#formatPDF.bind(this)
        };

        const formatter = formatters[format];
        if (!formatter) {
            throw new Error(`Unsupported format: ${format}`);
        }

        return await formatter(data);
    }

    #formatCSV(data) {
        if (!data || !data.length) return '';

        // Get headers
        const headers = Object.keys(data[0]);
        
        // Create CSV rows
        const rows = [
            headers.join(','),
            ...data.map(item => 
                headers.map(header => 
                    this.#escapeCSVValue(item[header])
                ).join(',')
            )
        ];

        return rows.join('\n');
    }

    #escapeCSVValue(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    #formatJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    async #formatXLSX(data) {
        // Implementation for XLSX formatting
        throw new Error('XLSX export not implemented');
    }

    async #formatPDF(data) {
        // Implementation for PDF formatting
        throw new Error('PDF export not implemented');
    }

    async #generateFile(data, config) {
        const blob = new Blob([data], {
            type: this.#getContentType(config.format)
        });

        const fileName = this.#generateFileName(config);
        
        return {
            url: URL.createObjectURL(blob),
            size: blob.size,
            name: fileName
        };
    }

    #getContentType(format) {
        const contentTypes = {
            csv: 'text/csv',
            json: 'application/json',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pdf: 'application/pdf'
        };
        return contentTypes[format] || 'application/octet-stream';
    }

    #generateFileName(config) {
        const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
        return `export-${config.type}-${timestamp}.${config.format}`;
    }

    getExportStatus(exportId) {
        if (this.#activeExports.has(exportId)) {
            return 'processing';
        }
        return 'not_found';
    }

    async cancelExport(exportId) {
        if (this.#activeExports.has(exportId)) {
            await queueService.cancel('exports', exportId);
            this.#activeExports.delete(exportId);
            return true;
        }
        return false;
    }

    // Public utility methods
    getSupportedFormats() {
        return Array.from(this.#supportedFormats);
    }

    getActiveExports() {
        return Array.from(this.#activeExports);
    }

    static getInstance() {
        if (!ExportService.instance) {
            ExportService.instance = new ExportService();
        }
        return ExportService.instance;
    }
}

// Create and export singleton instance
const exportService = ExportService.getInstance();
export default exportService;