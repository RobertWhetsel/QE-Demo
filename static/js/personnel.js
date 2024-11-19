import { HTML_TEMPLATES, ROLES } from './constants.js';
import DatabaseService from './modules/database.js';
import { updateDropdowns } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    loadPendingUserData();
    initializePersonnelManagement();

    // Handle role assignments
    document.addEventListener('click', (event) => {
        if (event.target.matches('.assign-role-btn')) {
            handleRoleAssignment(event.target);
        }
    });
});

/**
 * Initialize personnel management functionality
 */
function initializePersonnelManagement() {
    const personnelForm = document.getElementById('add-person-form');
    if (!personnelForm) return;

    personnelForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(personnelForm);
        const personnelData = {
            firstName: formData.get('first-name'),
            lastName: formData.get('last-name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            team: formData.get('person-team')
        };

        const personnelListElement = document.getElementById('personnel-list');
        if (!personnelListElement) return;

        // Save to storage
        const personnelArray = JSON.parse(DatabaseService.loadFromStorage('personnelList', '[]'));
        personnelArray.push(personnelData);
        DatabaseService.saveToStorage('personnelList', JSON.stringify(personnelArray));

        const newRow = createPersonnelRowElement(personnelData);
        personnelListElement.insertAdjacentHTML('beforeend', newRow);
        personnelForm.reset();
        updateDropdowns();
    });
}

/**
 * Handle role assignment button click
 * @param {HTMLElement} buttonElement - The clicked button element
 */
function handleRoleAssignment(buttonElement) {
    const rowElement = buttonElement.closest('tr');
    if (!rowElement) return;

    const username = rowElement.children[2].textContent;
    const roleSelectElement = rowElement.querySelector('.role-select');
    const role = roleSelectElement?.value;

    if (role) {
        assignUserRole(username, role);
        rowElement.remove();
        loadPersonnelData();
    } else {
        alert('Please select a role before assigning.');
    }
}

/**
 * Load pending users from storage and populate the table
 */
function loadPendingUserData() {
    const pendingUsers = JSON.parse(DatabaseService.loadFromStorage('pendingUsers', '[]'));
    const pendingUsersListElement = document.getElementById('pending-users-list');
    if (!pendingUsersListElement) return;

    // Clear existing content
    pendingUsersListElement.innerHTML = '';

    // Add each pending user
    pendingUsers.forEach(userData => {
        const rowHtml = `
            <tr>
                <td>${userData.firstName} ${userData.lastName}</td>
                <td>${userData.email}</td>
                <td>${userData.username}</td>
                <td>
                    <select class="role-select">
                        ${HTML_TEMPLATES.ROLE_OPTIONS}
                    </select>
                </td>
                <td><button class="assign-role-btn">Assign Role</button></td>
            </tr>
        `;
        pendingUsersListElement.insertAdjacentHTML('beforeend', rowHtml);
    });
}

/**
 * Assign a role to a user
 * @param {string} username - Username to assign role to
 * @param {string} role - Role to assign
 */
function assignUserRole(username, role) {
    const pendingUsers = JSON.parse(DatabaseService.loadFromStorage('pendingUsers', '[]'));
    const personnelList = JSON.parse(DatabaseService.loadFromStorage('personnelList', '[]'));

    const userIndex = pendingUsers.findIndex(user => user.username === username);
    if (userIndex !== -1) {
        const userData = pendingUsers[userIndex];
        userData.role = role;
        personnelList.push(userData);
        pendingUsers.splice(userIndex, 1);

        DatabaseService.saveToStorage('pendingUsers', JSON.stringify(pendingUsers));
        DatabaseService.saveToStorage('personnelList', JSON.stringify(personnelList));
    }
}

/**
 * Load personnel data from storage and populate the table
 */
function loadPersonnelData() {
    const personnelList = JSON.parse(DatabaseService.loadFromStorage('personnelList', '[]'));
    const personnelListElement = document.getElementById('personnel-list');
    if (!personnelListElement) return;

    // Clear existing content
    personnelListElement.innerHTML = '';

    // Add each person
    personnelList.forEach(personnelData => {
        const rowHtml = createPersonnelRowElement(personnelData);
        personnelListElement.insertAdjacentHTML('beforeend', rowHtml);
    });

    updateDropdowns();
}

/**
 * Create HTML row element for personnel
 * @param {Object} personnelData - Personnel data object
 * @returns {string} HTML string for the personnel row
 */
function createPersonnelRowElement(personnelData) {
    return `
        <tr>
            <td>${personnelData.firstName} ${personnelData.lastName}</td>
            <td>${personnelData.role}</td>
            <td><input type="checkbox"></td>
            <td><input type="datetime-local"></td>
            <td>
                <select class="status-select">
                    ${HTML_TEMPLATES.PERSONNEL_STATUS_OPTIONS}
                </select>
            </td>
            <td>
                <select class="team-select">
                    ${personnelData.team ? `<option value="${personnelData.team}">${personnelData.team}</option>` : ''}
                </select>
            </td>
            <td>
                <select class="workspace-select"></select>
            </td>
        </tr>
    `;
}

// Export functions that might be needed by other modules
export {
    initializePersonnelManagement,
    loadPersonnelData,
    createPersonnelRowElement,
    assignUserRole
};
