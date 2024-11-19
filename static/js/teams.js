import { HTML_TEMPLATES, DOM_SELECTORS } from './constants.js';
import DatabaseService from './modules/database.js';
import { updateDropdowns } from './utils.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTeamManagement();
    loadTeamData();
});

/**
 * Initialize team management functionality
 */
function initializeTeamManagement() {
    const teamForm = document.getElementById('add-team-form');
    if (!teamForm) return;

    teamForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(teamForm);
        const teamName = formData.get('team-name');
        const workspaceName = formData.get('team-workspace');

        const teamsListElement = document.getElementById('teams-list');
        if (!teamsListElement) return;

        const newTeam = {
            name: teamName,
            workspace: workspaceName,
            personnel: [],
            assigned: false,
            dueDate: ''
        };

        // Save to storage
        const teamsData = DatabaseService.loadFromStorage('teams', '[]');
        const teamsArray = JSON.parse(teamsData);
        teamsArray.push(newTeam);
        DatabaseService.saveToStorage('teams', JSON.stringify(teamsArray));

        const newRow = createTeamRowElement(newTeam);
        teamsListElement.insertAdjacentHTML('beforeend', newRow);
        teamForm.reset();
        updateDropdowns();
    });
}

/**
 * Load teams data from storage and populate the table
 */
function loadTeamData() {
    const teamsData = JSON.parse(DatabaseService.loadFromStorage('teams', '[]'));
    const teamsListElement = document.getElementById('teams-list');
    if (!teamsListElement) return;

    // Clear existing content
    teamsListElement.innerHTML = '';

    // Add each team
    teamsData.forEach(teamData => {
        const rowHtml = createTeamRowElement(teamData);
        teamsListElement.insertAdjacentHTML('beforeend', rowHtml);
    });

    updateDropdowns();
}

/**
 * Create HTML row element for a team
 * @param {Object} teamData - Team data object
 * @returns {string} HTML string for the team row
 */
function createTeamRowElement(teamData) {
    return `
        <tr>
            <td>${teamData.name}</td>
            <td class="assigned-personnel">${teamData.personnel ? teamData.personnel.join(', ') : ''}</td>
            <td><input type="checkbox" ${teamData.assigned ? 'checked' : ''}></td>
            <td><input type="datetime-local" value="${teamData.dueDate || ''}"></td>
            <td>
                <select class="status-select">
                    ${HTML_TEMPLATES.TEAM_STATUS_OPTIONS}
                </select>
            </td>
            <td>
                <select class="workspace-select">
                    <option value="${teamData.workspace}">${teamData.workspace}</option>
                </select>
            </td>
        </tr>
    `;
}

// Export functions that might be needed by other modules
export {
    initializeTeamManagement,
    loadTeamData,
    createTeamRowElement
};
