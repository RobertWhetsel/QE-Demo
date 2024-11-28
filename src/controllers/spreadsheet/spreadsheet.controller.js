import { DataService } from '../../models/dataservice.js';
import { User } from '../../models/user.js';
import Logger from '../../utils/logging/loggerService.utils.js';
import navigation from '../../services/navigation/navigation.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';
import { ROLES } from '../../models/index.js';

export class SpreadsheetController {
    #logger;
    #view;
    #dataService;
    #currentSpreadsheet = null;
    #isInitialized = false;
    #undoStack = [];
    #redoStack = [];
    #maxStackSize = 50;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SpreadsheetController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to spreadsheet');
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

            // Load initial data
            await this.#loadSpreadsheet();

            this.#isInitialized = true;
            this.#logger.info('SpreadsheetController initialized successfully');
        } catch (error) {
            this.#logger.error('SpreadsheetController initialization error:', error);
            this.#handleError('Failed to initialize spreadsheet');
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
            // Spreadsheet elements
            spreadsheetContainer: document.getElementById('spreadsheet-container'),
            gridContainer: document.getElementById('grid-container'),
            
            // Toolbar elements
            toolbar: {
                saveButton: document.getElementById('save-button'),
                undoButton: document.getElementById('undo-button'),
                redoButton: document.getElementById('redo-button'),
                boldButton: document.getElementById('bold-button'),
                italicButton: document.getElementById('italic-button'),
                alignmentButtons: document.querySelectorAll('.alignment-button'),
                formulaBar: document.getElementById('formula-bar')
            },
            
            // Formula and cell elements
            selectedCell: null,
            formulaInput: document.getElementById('formula-input'),
            
            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('View elements initialized:', {
            hasSpreadsheet: !!this.#view.spreadsheetContainer,
            hasToolbar: !!this.#view.toolbar.saveButton,
            hasFormulaBar: !!this.#view.formulaInput
        });
    }

    #setupEventListeners() {
        // Toolbar button handlers
        if (this.#view.toolbar.saveButton) {
            this.#view.toolbar.saveButton.addEventListener('click', () => this.#handleSave());
        }
        if (this.#view.toolbar.undoButton) {
            this.#view.toolbar.undoButton.addEventListener('click', () => this.#handleUndo());
        }
        if (this.#view.toolbar.redoButton) {
            this.#view.toolbar.redoButton.addEventListener('click', () => this.#handleRedo());
        }

        // Grid interaction handlers
        if (this.#view.gridContainer) {
            this.#view.gridContainer.addEventListener('click', (e) => this.#handleCellClick(e));
            this.#view.gridContainer.addEventListener('dblclick', (e) => this.#handleCellDoubleClick(e));
        }

        // Formula bar handler
        if (this.#view.formulaInput) {
            this.#view.formulaInput.addEventListener('input', (e) => this.#handleFormulaInput(e));
            this.#view.formulaInput.addEventListener('keydown', (e) => this.#handleFormulaKeydown(e));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.#handleKeyboardShortcut(e));

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadSpreadsheet() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading spreadsheet data');

            const data = await this.#dataService.getData();
            
            if (!data) {
                // Create new spreadsheet if none exists
                await this.#createNewSpreadsheet();
            } else {
                await this.#renderSpreadsheet(data);
            }

            this.#logger.info('Spreadsheet loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading spreadsheet:', error);
            this.#handleError('Failed to load spreadsheet');
        } finally {
            this.#showLoading(false);
        }
    }

    async #createNewSpreadsheet() {
        const rows = 100;
        const cols = 26;
        const gridData = Array(rows).fill().map(() => Array(cols).fill(''));
        await this.#renderSpreadsheet(gridData);
    }

    #renderSpreadsheet(data) {
        if (!this.#view.gridContainer) return;

        const html = this.#generateGridHTML(data);
        this.#view.gridContainer.innerHTML = html;
        this.#currentSpreadsheet = data;
    }

    #generateGridHTML(data) {
        const cols = data[0].length;
        let html = '<table class="spreadsheet-grid">';

        // Generate column headers (A, B, C, etc.)
        html += '<tr><th></th>';
        for (let c = 0; c < cols; c++) {
            html += `<th>${String.fromCharCode(65 + c)}</th>`;
        }
        html += '</tr>';

        // Generate rows
        data.forEach((row, rowIndex) => {
            html += `<tr><th>${rowIndex + 1}</th>`;
            row.forEach((cell, colIndex) => {
                html += `<td data-row="${rowIndex}" data-col="${colIndex}">${cell}</td>`;
            });
            html += '</tr>';
        });

        html += '</table>';
        return html;
    }

    #handleCellClick(event) {
        const cell = event.target.closest('td');
        if (!cell) return;

        this.#selectCell(cell);
    }

    #handleCellDoubleClick(event) {
        const cell = event.target.closest('td');
        if (!cell) return;

        this.#editCell(cell);
    }

    #selectCell(cell) {
        // Remove previous selection
        this.#view.selectedCell?.classList.remove('selected');

        // Update selection
        this.#view.selectedCell = cell;
        cell.classList.add('selected');

        // Update formula bar
        if (this.#view.formulaInput) {
            this.#view.formulaInput.value = cell.textContent;
        }
    }

    #editCell(cell) {
        cell.contentEditable = true;
        cell.focus();

        const originalValue = cell.textContent;

        const finishEdit = () => {
            cell.contentEditable = false;
            if (cell.textContent !== originalValue) {
                this.#addToUndoStack();
                this.#updateCellValue(cell, cell.textContent);
            }
        };

        cell.addEventListener('blur', finishEdit, { once: true });
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            }
        });
    }

    #updateCellValue(cell, value) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.#currentSpreadsheet[row][col] = value;
        cell.textContent = value;
    }

    #handleFormulaInput(event) {
        if (!this.#view.selectedCell) return;
        this.#updateCellValue(this.#view.selectedCell, event.target.value);
    }

    #handleFormulaKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.#addToUndoStack();
            this.#view.selectedCell?.focus();
        }
    }

    #handleKeyboardShortcut(event) {
        // Ctrl/Cmd + S: Save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.#handleSave();
        }
        // Ctrl/Cmd + Z: Undo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            this.#handleUndo();
        }
        // Ctrl/Cmd + Y: Redo
        if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            this.#handleRedo();
        }
    }

    async #handleSave() {
        try {
            this.#showLoading(true);
            await this.#dataService.saveData(this.#currentSpreadsheet);
            this.#showSuccess('Spreadsheet saved successfully');
        } catch (error) {
            this.#logger.error('Error saving spreadsheet:', error);
            this.#handleError('Failed to save spreadsheet');
        } finally {
            this.#showLoading(false);
        }
    }

    #addToUndoStack() {
        this.#undoStack.push(JSON.stringify(this.#currentSpreadsheet));
        if (this.#undoStack.length > this.#maxStackSize) {
            this.#undoStack.shift();
        }
        this.#redoStack = [];
        this.#updateToolbarState();
    }

    #handleUndo() {
        if (this.#undoStack.length === 0) return;

        const currentState = JSON.stringify(this.#currentSpreadsheet);
        this.#redoStack.push(currentState);

        const previousState = JSON.parse(this.#undoStack.pop());
        this.#renderSpreadsheet(previousState);
        this.#updateToolbarState();
    }

    #handleRedo() {
        if (this.#redoStack.length === 0) return;

        const currentState = JSON.stringify(this.#currentSpreadsheet);
        this.#undoStack.push(currentState);

        const nextState = JSON.parse(this.#redoStack.pop());
        this.#renderSpreadsheet(nextState);
        this.#updateToolbarState();
    }

    #updateToolbarState() {
        if (this.#view.toolbar.undoButton) {
            this.#view.toolbar.undoButton.disabled = this.#undoStack.length === 0;
        }
        if (this.#view.toolbar.redoButton) {
            this.#view.toolbar.redoButton.disabled = this.#redoStack.length === 0;
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
    getCurrentData() {
        return JSON.parse(JSON.stringify(this.#currentSpreadsheet));
    }

    exportToCSV() {
        if (!this.#currentSpreadsheet) return '';
        return this.#currentSpreadsheet
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SpreadsheetController();
});