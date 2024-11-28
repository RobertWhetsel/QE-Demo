import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import databaseService from '../database/DatabaseService.js';
import cacheService from '../cache/CacheService.js';
import queueService from '../queue/QueueService.js';

class ReportService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #reportCache = new Map();
    #reportTemplates = new Map();
    #activeReports = new Set();
    #maxConcurrentReports = 5;
    #reportTimeout = 300000; // 5 minutes

    constructor() {
        if (ReportService.instance) {
            return ReportService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('ReportService initializing');
        this.#initialize();
        ReportService.instance = this;
    }

    async #initialize() {
        try {
            // Initialize report templates
            await this.#initializeTemplates();
            
            // Setup report queue
            queueService.createQueue('reports', {
                maxRetries: 2,
                priority: 1
            });

            this.#isInitialized = true;
            this.#logger.info('ReportService initialized successfully');
        } catch (error) {
            this.#logger.error('ReportService initialization error:', error);
            throw error;
        }
    }

    async #initializeTemplates() {
        // Initialize default report templates
        this.#reportTemplates.set('summary', {
            name: 'Summary Report',
            sections: ['overview', 'metrics', 'trends'],
            format: 'pdf'
        });

        this.#reportTemplates.set('detailed', {
            name: 'Detailed Report',
            sections: ['overview', 'metrics', 'trends', 'analysis', 'recommendations'],
            format: 'pdf'
        });

        this.#reportTemplates.set('analytics', {
            name: 'Analytics Report',
            sections: ['metrics', 'trends', 'analysis'],
            format: 'excel'
        });
    }

    async generateReport(config) {
        try {
            this.#logger.info('Generating report:', config);

            // Validate configuration
            this.#validateReportConfig(config);

            // Check concurrent reports limit
            if (this.#activeReports.size >= this.#maxConcurrentReports) {
                throw new Error('Maximum concurrent reports limit reached');
            }

            const reportId = crypto.randomUUID();
            const reportTask = {
                id: reportId,
                config,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Add to active reports
            this.#activeReports.add(reportId);

            // Queue report generation
            await queueService.enqueue('reports', 
                () => this.#processReport(reportTask),
                { 
                    timeout: this.#reportTimeout,
                    priority: config.priority || 0
                }
            );

            return reportId;

        } catch (error) {
            this.#logger.error('Report generation error:', error);
            throw error;
        }
    }

    #validateReportConfig(config) {
        if (!config.type || !this.#reportTemplates.has(config.type)) {
            throw new Error('Invalid report type');
        }

        if (!config.dateRange || !config.dateRange.start || !config.dateRange.end) {
            throw new Error('Invalid date range');
        }

        if (new Date(config.dateRange.end) < new Date(config.dateRange.start)) {
            throw new Error('End date must be after start date');
        }
    }

    async #processReport(reportTask) {
        try {
            this.#logger.info('Processing report:', reportTask.id);

            // Update status
            reportTask.status = 'processing';
            reportTask.startedAt = new Date().toISOString();

            // Get template
            const template = this.#reportTemplates.get(reportTask.config.type);

            // Gather data
            const data = await this.#gatherReportData(reportTask.config);

            // Generate sections
            const sections = await Promise.all(
                template.sections.map(section => 
                    this.#generateSection(section, data)
                )
            );

            // Combine sections
            const report = await this.#combineReportSections(sections);

            // Format report
            const formattedReport = await this.#formatReport(report, template.format);

            // Cache report
            await this.#cacheReport(reportTask.id, formattedReport);

            // Update status
            reportTask.status = 'completed';
            reportTask.completedAt = new Date().toISOString();

            return reportTask.id;

        } catch (error) {
            this.#logger.error('Report processing error:', error);
            reportTask.status = 'failed';
            reportTask.error = error.message;
            reportTask.failedAt = new Date().toISOString();
            throw error;
        } finally {
            this.#activeReports.delete(reportTask.id);
        }
    }

    async #gatherReportData(config) {
        const queries = {
            overview: async () => databaseService.query('overview', config),
            metrics: async () => databaseService.query('metrics', config),
            trends: async () => databaseService.query('trends', config),
            analysis: async () => databaseService.query('analysis', config)
        };

        const data = {};
        for (const [key, query] of Object.entries(queries)) {
            data[key] = await query();
        }

        return data;
    }

    async #generateSection(sectionName, data) {
        const generators = {
            overview: this.#generateOverviewSection,
            metrics: this.#generateMetricsSection,
            trends: this.#generateTrendsSection,
            analysis: this.#generateAnalysisSection,
            recommendations: this.#generateRecommendationsSection
        };

        const generator = generators[sectionName];
        if (!generator) {
            throw new Error(`Unknown section: ${sectionName}`);
        }

        return await generator(data[sectionName]);
    }

    async #combineReportSections(sections) {
        // Implementation for combining report sections
        return sections.join('\n\n');
    }

    async #formatReport(report, format) {
        const formatters = {
            pdf: this.#formatPDF,
            excel: this.#formatExcel,
            html: this.#formatHTML
        };

        const formatter = formatters[format];
        if (!formatter) {
            throw new Error(`Unsupported format: ${format}`);
        }

        return await formatter(report);
    }

    async #cacheReport(reportId, report) {
        await cacheService.set(`report:${reportId}`, report, {
            ttl: 3600000 // 1 hour
        });
    }

    async getReport(reportId) {
        try {
            // Check cache first
            const cachedReport = await cacheService.get(`report:${reportId}`);
            if (cachedReport) {
                return cachedReport;
            }

            throw new Error('Report not found');
        } catch (error) {
            this.#logger.error('Error retrieving report:', error);
            throw error;
        }
    }

    getReportStatus(reportId) {
        if (this.#activeReports.has(reportId)) {
            return 'processing';
        }

        if (cacheService.has(`report:${reportId}`)) {
            return 'completed';
        }

        return 'not_found';
    }

    async cancelReport(reportId) {
        if (this.#activeReports.has(reportId)) {
            // Cancel report generation
            await queueService.cancel('reports', reportId);
            this.#activeReports.delete(reportId);
            return true;
        }
        return false;
    }

    // Public utility methods
    getTemplates() {
        return Array.from(this.#reportTemplates.entries()).map(([id, template]) => ({
            id,
            name: template.name,
            sections: template.sections,
            format: template.format
        }));
    }

    getActiveReports() {
        return Array.from(this.#activeReports);
    }

    clearCache() {
        this.#reportCache.clear();
        return cacheService.clear();
    }

    static getInstance() {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }
}

// Create and export singleton instance
const reportService = ReportService.getInstance();
export default reportService;