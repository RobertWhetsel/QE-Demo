import { User } from '../../models/user.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import { ROLES } from '../../models/index.js';

export class ReportController {
    #logger;
    #view;
    #dataService;
    #currentReport = null;
    #isInitialized = false;
    #reportTypes = {
        SUMMARY: 'summary',
        DETAILED: 'detailed',
        ANALYTICS: 'analytics',
        CUSTOM: 'custom'
    };

    constructor() {
        this.#logger = Logger;
        this.#logger.info('ReportController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to reports');
                navigation.navigateToPage('login');
                return;
            }

            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load initial report data
            await this.#loadReportData();

            this.#isInitialized = true;
            this.#logger.info('ReportController initialized successfully');
        } catch (error) {
            this.#logger.error('ReportController initialization error:', error);
            this.#handleError('Failed to initialize reports');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && 
               [ROLES.GENESIS_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole);
    }

    #initializeView() {
        this.#view = {
            // Report generation form
            reportForm: document.getElementById('report-form'),
            reportType: document.getElementById('report-type'),
            dateRange: document.getElementById('date-range'),
            customOptions: document.getElementById('custom-options'),
            
            // Report display elements
            reportContainer: document.getElementById('report-container'),
            reportPreview: document.getElementById('report-preview'),
            
            // Export options
            exportPDF: document.getElementById('export-pdf'),
            exportCSV: document.getElementById('export-csv'),
            exportExcel: document.getElementById('export-excel'),
            
            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasReportForm: !!this.#view.reportForm,
            hasReportContainer: !!this.#view.reportContainer,
            hasExportOptions: !!this.#view.exportPDF
        });
    }

    #setupEventListeners() {
        if (this.#view.reportForm) {
            this.#view.reportForm.addEventListener('submit', (e) => this.#handleReportGeneration(e));
        }

        if (this.#view.reportType) {
            this.#view.reportType.addEventListener('change', () => this.#handleReportTypeChange());
        }

        if (this.#view.exportPDF) {
            this.#view.exportPDF.addEventListener('click', () => this.#exportReport('pdf'));
        }

        if (this.#view.exportCSV) {
            this.#view.exportCSV.addEventListener('click', () => this.#exportReport('csv'));
        }

        if (this.#view.exportExcel) {
            this.#view.exportExcel.addEventListener('click', () => this.#exportReport('excel'));
        }
    }

    async #loadReportData() {
        try {
            this.#showLoading(true);
            const data = await this.#dataService.getData();
            this.#updateReportPreview(data);
        } catch (error) {
            this.#logger.error('Error loading report data:', error);
            this.#handleError('Failed to load report data');
        } finally {
            this.#showLoading(false);
        }
    }

    async #handleReportGeneration(event) {
        event.preventDefault();
        this.#logger.info('Generating report');

        try {
            this.#showLoading(true);
            const reportConfig = this.#getReportConfig();
            
            if (!this.#validateReportConfig(reportConfig)) {
                return;
            }

            const reportData = await this.#generateReport(reportConfig);
            this.#updateReportPreview(reportData);
            this.#showSuccess('Report generated successfully');

        } catch (error) {
            this.#logger.error('Error generating report:', error);
            this.#handleError('Failed to generate report');
        } finally {
            this.#showLoading(false);
        }
    }

    #getReportConfig() {
        return {
            type: this.#view.reportType.value,
            dateRange: this.#view.dateRange.value,
            customOptions: this.#getCustomOptions()
        };
    }

    #getCustomOptions() {
        if (!this.#view.customOptions || 
            this.#view.reportType.value !== this.#reportTypes.CUSTOM) {
            return null;
        }

        // Get custom report options based on form fields
        return {
            // Implementation for custom options
        };
    }

    #validateReportConfig(config) {
        if (!config.type) {
            this.#handleError('Please select a report type');
            return false;
        }
        if (!config.dateRange) {
            this.#handleError('Please select a date range');
            return false;
        }
        return true;
    }

    async #generateReport(config) {
        // Implementation for report generation based on config
        return {};
    }

    #updateReportPreview(data) {
        if (!this.#view.reportPreview) return;

        // Implementation for updating report preview
    }

    async #exportReport(format) {
        try {
            this.#showLoading(true);
            this.#logger.info('Exporting report:', format);

            // Implementation for report export
            this.#showSuccess(`Report exported successfully as ${format.toUpperCase()}`);
        } catch (error) {
            this.#logger.error('Error exporting report:', error);
            this.#handleError('Failed to export report');
        } finally {
            this.#showLoading(false);
        }
    }

    #handleReportTypeChange() {
        const showCustomOptions = this.#view.reportType.value === this.#reportTypes.CUSTOM;
        if (this.#view.customOptions) {
            this.#view.customOptions.style.display = showCustomOptions ? 'block' : 'none';
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    refreshReport() {
        return this.#loadReportData();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ReportController();
});