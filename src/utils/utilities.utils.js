import { DOM_SELECTORS } from './constants.js';
import DatabaseService from './modules/database.js';

//RENEME THIS FILE

/**
 * Form submission handler
 * @param {string} formId - ID of the form element
 * @param {string} tableId - ID of the table to update
 * @param {Function} rowTemplate - Function to generate row HTML
 */
export function handleFormSubmit(formId, tableId, rowTemplate) {
    const formElement = document.getElementById(formId);
    if (!formElement) return;

    formElement.addEventListener('submit', function(event) {
        event.preventDefault();
        try {
            const formData = new FormData(this);
            const formDataArray = Array.from(formData.entries()).map(([name, value]) => ({
                name,
                value
            }));
            
            const newRow = rowTemplate(formDataArray);
            const tableElement = document.getElementById(tableId);
            
            if (tableElement) {
                tableElement.insertAdjacentHTML('beforeend', newRow);
                updateDropdowns();
                this.reset();
            }
        } catch (error) {
            console.error(`Error submitting form ${formId}:`, error);
            // Display error to user
        }
    });
}

/**
 * Update all dropdown menus with current data
 */
export function updateDropdowns() {
    const teamElements = Array.from(document.querySelectorAll(`${DOM_SELECTORS.TEAMS_LIST} tr`))
        .map(row => row.querySelector('td:first-child')?.textContent || '');

    const workspaceElements = Array.from(document.querySelectorAll(`${DOM_SELECTORS.WORKSPACES_LIST} tr`))
        .map(row => row.querySelector('td:first-child')?.textContent || '');

    const personnelElements = Array.from(document.querySelectorAll(`${DOM_SELECTORS.PERSONNEL_LIST} tr`))
        .map(row => row.querySelector('td:first-child')?.textContent || '');

    updateSelectElements('.team-select', teamElements);
    updateSelectElements('.workspace-select', workspaceElements);
    updateSelectElements('.person-select', personnelElements);

    updateAssignments();
}

/**
 * Update a specific type of select elements with options
 * @param {string} selector - CSS selector for select elements
 * @param {string[]} options - Array of option values
 */
export function updateSelectElements(selector, options) {
    document.querySelectorAll(selector).forEach(selectElement => {
        const currentValue = selectElement.value;
        const optionsHtml = options
            .map(option => `<option value="${option}">${option}</option>`)
            .join('');
        selectElement.innerHTML = optionsHtml;
        selectElement.value = currentValue;
    });
}

/**
 * Update assignment information in tables
 */
export function updateAssignments() {
    // Update assigned personnel for each team
    document.querySelectorAll(`${DOM_SELECTORS.TEAMS_LIST} tr`).forEach(teamRow => {
        const teamName = teamRow.querySelector('td:first-child')?.textContent || '';
        const assignedPersonnel = Array.from(document.querySelectorAll(`${DOM_SELECTORS.PERSONNEL_LIST} tr`))
            .filter(personRow => personRow.querySelector('.team-select')?.value === teamName)
            .map(personRow => personRow.querySelector('td:first-child')?.textContent || '')
            .join(', ');
        
        const assignedCell = teamRow.querySelector('.assigned-personnel');
        if (assignedCell) {
            assignedCell.textContent = assignedPersonnel;
        }
    });

    // Update assigned teams for each workspace
    document.querySelectorAll(`${DOM_SELECTORS.WORKSPACES_LIST} tr`).forEach(workspaceRow => {
        const workspaceName = workspaceRow.querySelector('td:first-child')?.textContent || '';
        const assignedTeams = Array.from(document.querySelectorAll(`${DOM_SELECTORS.TEAMS_LIST} tr`))
            .filter(teamRow => teamRow.querySelector('.workspace-select')?.value === workspaceName)
            .map(teamRow => teamRow.querySelector('td:first-child')?.textContent || '')
            .join(', ');
        
        const assignedCell = workspaceRow.querySelector('.assigned-teams');
        if (assignedCell) {
            assignedCell.textContent = assignedTeams;
        }
    });
}

/**
 * Convert CSV string to JSON object
 * @param {string} csvContent - CSV string to convert
 * @returns {Object[]} Array of objects representing CSV data
 */
export function convertCsvToJson(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
            obj[header.trim()] = values[i]?.trim() || '';
            return obj;
        }, {});
    });
}

/**
 * UI Modal controller
 */
export const ModalController = {
    show(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.style.display = 'block';
        }
    },

    hide(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }
};
