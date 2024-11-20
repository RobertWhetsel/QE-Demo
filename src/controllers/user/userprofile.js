// User Profile Management
class UserProfile {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadUserData();
    }

    initializeElements() {
        // Profile elements
        this.profileName = document.getElementById('profileName');
        this.profileRole = document.getElementById('profileRole');
        this.avatarImage = document.getElementById('avatarImage');
        this.avatarInput = document.getElementById('avatarInput');
        
        // Forms
        this.personalForm = document.getElementById('personalInfoForm');
        this.securityForm = document.getElementById('securityForm');
        this.preferencesForm = document.getElementById('preferencesForm');
        
        // Navigation
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.sections = document.querySelectorAll('.profile-section');
    }

    attachEventListeners() {
        // Avatar change
        document.getElementById('changeAvatar')?.addEventListener('click', () => {
            this.avatarInput?.click();
        });

        this.avatarInput?.addEventListener('change', this.handleAvatarChange.bind(this));

        // Tab navigation
        this.navButtons.forEach(button => {
            button.addEventListener('click', () => this.switchSection(button.dataset.section));
        });

        // Form submissions
        this.personalForm?.addEventListener('submit', this.handlePersonalInfoSubmit.bind(this));
        this.securityForm?.addEventListener('submit', this.handleSecuritySubmit.bind(this));
        this.preferencesForm?.addEventListener('submit', this.handlePreferencesSubmit.bind(this));
    }

    async loadUserData() {
        try {
            // In a real app, this would be an API call
            const userData = {
                firstName: sessionStorage.getItem('firstName') || 'John',
                lastName: sessionStorage.getItem('lastName') || 'Doe',
                email: sessionStorage.getItem('email') || 'john.doe@example.com',
                role: sessionStorage.getItem('userRole') || 'Volunteer',
                phone: sessionStorage.getItem('phone') || '',
                location: sessionStorage.getItem('location') || '',
                preferences: JSON.parse(sessionStorage.getItem('preferences') || '{}')
            };

            this.updateProfile(userData);
            this.populateActivityLog();
        } catch (error) {
            this.showError('Failed to load user data');
            console.error('Error loading user data:', error);
        }
    }

    updateProfile(userData) {
        // Update header
        this.profileName.textContent = `${userData.firstName} ${userData.lastName}`;
        this.profileRole.textContent = userData.role;

        // Update personal info form
        document.getElementById('firstName').value = userData.firstName;
        document.getElementById('lastName').value = userData.lastName;
        document.getElementById('email').value = userData.email;
        document.getElementById('phone').value = userData.phone;
        document.getElementById('location').value = userData.location;

        // Update preferences
        const prefs = userData.preferences;
        if (prefs.notifications) {
            document.querySelectorAll('[name="notifications"]').forEach(checkbox => {
                checkbox.checked = prefs.notifications.includes(checkbox.value);
            });
        }
        if (prefs.language) {
            document.getElementById('language').value = prefs.language;
        }
    }

    switchSection(sectionId) {
        // Update navigation buttons
        this.navButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.section === sectionId);
        });

        // Update sections
        this.sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });
    }

    async handleAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.avatarImage.src = e.target.result;
                // In a real app, you would upload this to a server
                sessionStorage.setItem('avatarImage', e.target.result);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            this.showError('Failed to update profile picture');
            console.error('Error updating avatar:', error);
        }
    }

    async handlePersonalInfoSubmit(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            
            // In a real app, this would be an API call
            Object.entries(data).forEach(([key, value]) => {
                sessionStorage.setItem(key, value);
            });

            this.showSuccess('Personal information updated successfully');
            this.loadUserData();
        } catch (error) {
            this.showError('Failed to update personal information');
            console.error('Error updating personal info:', error);
        }
    }

    async handleSecuritySubmit(event) {
        event.preventDefault();
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            // In a real app, this would be an API call
            this.showSuccess('Password updated successfully');
            event.target.reset();
        } catch (error) {
            this.showError(error.message || 'Failed to update password');
            console.error('Error updating password:', error);
        }
    }

    async handlePreferencesSubmit(event) {
        event.preventDefault();
        try {
            const notifications = Array.from(document.querySelectorAll('[name="notifications"]:checked'))
                .map(checkbox => checkbox.value);
            const language = document.getElementById('language').value;

            // In a real app, this would be an API call
            sessionStorage.setItem('preferences', JSON.stringify({ notifications, language }));
            
            this.showSuccess('Preferences updated successfully');
        } catch (error) {
            this.showError('Failed to update preferences');
            console.error('Error updating preferences:', error);
        }
    }

    populateActivityLog() {
        const activityLog = document.getElementById('activityLog');
        if (!activityLog) return;

        // In a real app, this would be fetched from a server
        const activities = [
            { date: '2024-01-15', action: 'Profile updated' },
            { date: '2024-01-14', action: 'Password changed' },
            { date: '2024-01-13', action: 'Logged in from new device' }
        ];

        activityLog.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-date">${new Date(activity.date).toLocaleDateString()}</span>
                <span class="activity-action">${activity.action}</span>
            </div>
        `).join('');
    }

    showSuccess(message) {
        // You could implement a toast notification system here
        alert(message);
    }

    showError(message) {
        // You could implement a toast notification system here
        alert('Error: ' + message);
    }
}

// Initialize profile when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserProfile();
});
