// Status options for workspace management
const STATUS_OPTIONS = `
    <option value="active">Active</option>
    <option value="pending">Pending</option>
    <option value="completed">Completed</option>
    <option value="archived">Archived</option>
`;

document.addEventListener('DOMContentLoaded', () => {
    initializeWorkspaceForm();
    loadWorkspaces();
});

function initializeWorkspaceForm() {
    const form = document.getElementById('add-workspace-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const workspaceName = formData.get('workspace-name');

        const workspacesList = document.getElementById('workspaces-list');
        if (!workspacesList) return;

        const newRow = createWorkspaceRow({
            name: workspaceName,
            teams: [],
            assigned: false,
            dueDate: ''
        });

        workspacesList.insertAdjacentHTML('beforeend', newRow);
        form.reset();
        updateDropdowns();
    });
}

function loadWorkspaces() {
    const workspaces = JSON.parse(sessionStorage.getItem('workspaces')) || [];
    const workspacesList = document.getElementById('workspaces-list');
    if (!workspacesList) return;

    // Clear existing content
    workspacesList.innerHTML = '';

    // Add each workspace
    workspaces.forEach(workspace => {
        const rowHtml = createWorkspaceRow(workspace);
        workspacesList.insertAdjacentHTML('beforeend', rowHtml);
    });

    updateDropdowns();
}

function createWorkspaceRow(workspace) {
    return `
        <tr>
            <td>${workspace.name}</td>
            <td class="assigned-teams">${workspace.teams ? workspace.teams.join(', ') : ''}</td>
            <td><input type="checkbox" ${workspace.assigned ? 'checked' : ''}></td>
            <td><input type="datetime-local" value="${workspace.dueDate || ''}"></td>
            <td>
                <select class="status-select">
                    ${STATUS_OPTIONS}
                </select>
            </td>
        </tr>
    `;
}

// Note: This function is called from utils.js and needs to be kept in sync
// with any changes made there
function updateDropdowns() {
    if (typeof window.updateDropdowns === 'function') {
        window.updateDropdowns();
    }
}
