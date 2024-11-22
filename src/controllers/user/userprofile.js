import { User } from '../../models/user.js';

export class UserProfileController {
    constructor() {
        if (!User.isAuthenticated()) {
            window.location.href = '/src/views/pages/login.html';
            return;
        }

        this.user = User.getCurrentUser();
        if (!this.user) {
            console.error('Failed to load user data');
            return;
        }

        this.initializeElements();
        this.loadUserData();
        this.attachEventListeners();
    }

    initializeElements() {
        // Form elements
        this.personalInfoForm = document.getElementById('personal-info-form');
        this.accountSettingsForm = document.getElementById('account-settings-form');
        
        // Personal info fields
        this.usernameField = document.getElementById('username');
        this.fullNameField = document.getElementById('fullName');
        this.emailField = document.getElementById('email');
        this.phoneField = document.getElementById('phone');
        
        // Password fields
        this.currentPasswordField = document.getElementById('currentPassword');
        this.newPasswordField = document.getElementById('newPassword');
        this.confirmPasswordField = document.getElementById('confirmPassword');
    }

    loadUserData() {
        // Populate personal info form
        this.usernameField.value = this.user.username;
        this.fullNameField.value = this.user.fullName;
        this.emailField.value = this.user.email;
        this.phoneField.value = this.user.phoneNumber;
    }

    attachEventListeners() {
        // Handle personal info form submission
        this.personalInfoForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                fullName: this.fullNameField.value,
                email: this.emailField.value,
                phoneNumber: this.phoneField.value
            };

            if (User.updateCurrentUser(updates)) {
                this.showSuccess('Personal information updated successfully');
                this.user = User.getCurrentUser();
            } else {
                this.showError('Failed to update personal information');
            }
        });

        // Handle password change form submission
        this.accountSettingsForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = this.currentPasswordField.value;
            const newPassword = this.newPasswordField.value;
            const confirmPassword = this.confirmPasswordField.value;

            if (newPassword !== confirmPassword) {
                this.showError('New passwords do not match');
                return;
            }

            if (User.updatePassword(currentPassword, newPassword)) {
                this.showSuccess('Password updated successfully');
                this.accountSettingsForm.reset();
            } else {
                this.showError('Failed to update password. Please check your current password.');
            }
        });
    }

    showSuccess(message) {
        const event = new CustomEvent('showNotification', {
            detail: {
                type: 'success',
                message: message
            }
        });
        document.dispatchEvent(event);
    }

    showError(message) {
        const event = new CustomEvent('showNotification', {
            detail: {
                type: 'error',
                message: message
            }
        });
        document.dispatchEvent(event);
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserProfileController();
});
