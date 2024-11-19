// research.js

class ResearchCenter {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.validateAccess();
        this.initializeElements();
        this.setupEventListeners();
        this.loadInitialData();
    }

    validateAccess() {
        try {
            const userRole = sessionStorage.getItem('userRole');
            const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
            
            if (!isAuthenticated) {
                window.location.href = 'login.html';
                return;
            }

            if (!userRole || !userRole.toLowerCase().includes('admin')) {
                this.showError('Access denied. Admin role required.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
        } catch (error) {
            console.error('Access validation error:', error);
            window.location.href = 'login.html';
        }
    }

    initializeElements() {
        // Initialize UI elements
        this.refreshBtn = document.getElementById('refreshData');
        this.exportBtn = document.getElementById('exportToSpreadsheet');
        this.dateRange = document.getElementById('dateRange');
        this.dataType = document.getElementById('dataType');
        this.searchInput = document.getElementById('searchData');
        this.dataBody = document.getElementById('dataBody');
        this.totalRecords = document.getElementById('totalRecords');
        this.lastUpdated = document.getElementById('lastUpdated');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorMessage = document.getElementById('errorMessage');
    }

    setupEventListeners() {
        // Set up event listeners for UI interactions
        this.refreshBtn?.addEventListener('click', () => this.refreshData());
        this.exportBtn?.addEventListener('click', () => this.exportData());
        this.dateRange?.addEventListener('change', () => this.filterData());
        this.dataType?.addEventListener('change', () => this.filterData());
        this.searchInput?.addEventListener('input', this.debounce(() => this.filterData(), 300));
        this.prevPageBtn?.addEventListener('click', () => this.changePage(-1));
        this.nextPageBtn?.addEventListener('click', () => this.changePage(1));

        // Modal event listeners
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                const modal = document.getElementById('dataPreviewModal');
                if (modal) modal.style.display = 'none';
            });
        });

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('dataPreviewModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Send to spreadsheet button
        document.getElementById('sendToSpreadsheet')?.addEventListener('click', () => {
            this.showSuccess('Data sent to spreadsheet');
            const modal = document.getElementById('dataPreviewModal');
            if (modal) modal.style.display = 'none';
        });
    }

    async loadInitialData() {
        try {
            this.showLoading();
            // Simulate loading initial data
            await this.simulateDataFetch();
            const sampleData = this.generateSampleData();
            this.updateDataDisplay(sampleData);
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load data');
            console.error('Error loading data:', error);
        } finally {
            this.hideLoading();
        }
    }

    generateSampleData() {
        const types = ['Survey', 'Response', 'Analytics'];
        const sources = ['Web', 'Mobile', 'API'];
        const statuses = ['Complete', 'Pending', 'Processing'];
        
        return Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: types[Math.floor(Math.random() * types.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)]
        }));
    }

    async refreshData() {
        try {
            this.showLoading();
            await this.simulateDataFetch();
            const newData = this.generateSampleData();
            this.updateDataDisplay(newData);
            this.updateStats();
            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            this.showError('Failed to refresh data');
            console.error('Error refreshing data:', error);
        } finally {
            this.hideLoading();
        }
    }

    async exportData() {
        try {
            this.showLoading();
            await this.simulateDataFetch();
            window.location.href = 'spreadsheet.html';
        } catch (error) {
            this.showError('Failed to export data');
            console.error('Error exporting data:', error);
        } finally {
            this.hideLoading();
        }
    }

    updateDataDisplay(data) {
        if (!this.dataBody) return;

        this.dataBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.date}</td>
                <td>${item.type}</td>
                <td>${item.source}</td>
                <td>${item.status}</td>
                <td>
                    <button class="btn" onclick="viewData(${item.id})">View</button>
                    <button class="btn" onclick="downloadData(${item.id})">Download</button>
                </td>
            `;
            this.dataBody.appendChild(row);
        });
    }

    updateStats() {
        if (this.totalRecords) {
            this.totalRecords.textContent = this.dataBody?.children.length || 0;
        }
        if (this.lastUpdated) {
            this.lastUpdated.textContent = new Date().toLocaleString();
        }
    }

    filterData() {
        // Implementation for filtering data based on selected criteria
        this.refreshData();
    }

    changePage(direction) {
        if (!this.pageInfo) return;

        const currentPage = parseInt(this.pageInfo.textContent.split(' ')[1]);
        const totalPages = parseInt(this.pageInfo.textContent.split(' ')[3]);
        const newPage = currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.pageInfo.textContent = `Page ${newPage} of ${totalPages}`;
            this.refreshData();
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            this.errorMessage.className = 'error-message';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 3000);
        }
    }

    showSuccess(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            this.errorMessage.className = 'success-message';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 3000);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async simulateDataFetch() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Initialize ResearchCenter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.researchCenter = new ResearchCenter();
});

// Global functions for data actions
window.viewData = function(id) {
    const modal = document.getElementById('dataPreviewModal');
    const preview = document.getElementById('dataPreview');
    if (modal && preview) {
        preview.textContent = JSON.stringify({ 
            id, 
            date: new Date().toISOString(),
            type: 'Sample Data',
            source: 'Preview',
            data: {
                field1: 'Sample value 1',
                field2: 'Sample value 2',
                field3: 'Sample value 3'
            }
        }, null, 2);
        modal.style.display = 'block';
    }
};

window.downloadData = function(id) {
    window.researchCenter.showSuccess(`Downloading data for ID: ${id}`);
};
