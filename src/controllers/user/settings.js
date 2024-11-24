import { User } from '../../models/user.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';
import navigation from '../../services/navigation/navigation.js';
import paths from '../../../config/paths.js';

export class SettingsController {
    constructor() {
        if (!User.isAuthenticated()) {
            const loginPath = paths.join(paths.pages, 'login.html');
            navigation.navigateTo(loginPath);
            return;
        }

        this.user = User.getCurrentUser();
        if (!this.user) {
            console.error('Failed to load user data');
            return;
        }

        this.initializeElements();
        this.loadUserPreferences();
        this.attachEventListeners();
    }

    initializeElements() {
        // Form elements
        this.settingsForm = document.getElementById('settings-form');
        
        // Theme elements
        this.themeSelect = document.getElementById('theme');
        this.themePreview = document.getElementById('theme-preview');
        
        // Font elements
        this.fontSelect = document.getElementById('font-family');
        this.fontPreview = document.getElementById('font-preview');

        // Notification elements
        this.notificationsCheckbox = document.getElementById('notifications');
        this.notificationFields = document.getElementById('notification-fields');
        this.emailNotificationsCheckbox = document.getElementById('email-notifications');
        this.smsNotificationsCheckbox = document.getElementById('sms-notifications');
        this.emailFields = document.querySelector('.notification-email-fields');
        this.phoneFields = document.querySelector('.notification-phone-fields');
        this.notificationEmail = document.getElementById('notification-email');
        this.notificationPhone = document.getElementById('notification-phone');
    }

    loadUserPreferences() {
        const preferences = User.getUserPreferences();
        if (!preferences) return;

        // Load theme preference
        const currentTheme = ThemeManager.getTheme();
        this.themeSelect.value = currentTheme;
        this.updateThemePreview(currentTheme);

        // Load font preference
        const currentFont = FontManager.getFont();
        if (currentFont) {
            this.updateFontPreview(currentFont);
        }

        // Load notification preferences
        if (preferences.notifications) {
            this.notificationsCheckbox.checked = true;
            this.notificationFields.classList.add('show');
            
            if (preferences.emailNotifications) {
                this.emailNotificationsCheckbox.checked = true;
                this.emailFields.classList.add('show');
                this.notificationEmail.value = preferences.notificationEmail || '';
            }
            
            if (preferences.smsNotifications) {
                this.smsNotificationsCheckbox.checked = true;
                this.phoneFields.classList.add('show');
                this.notificationPhone.value = preferences.notificationPhone || '';
            }
        }
    }

    attachEventListeners() {
        // Handle notifications toggle
        this.notificationsCheckbox?.addEventListener('change', (e) => {
            this.notificationFields.classList.toggle('show', e.target.checked);
            if (!e.target.checked) {
                this.emailNotificationsCheckbox.checked = false;
                this.smsNotificationsCheckbox.checked = false;
                this.emailFields.classList.remove('show');
                this.phoneFields.classList.remove('show');
            }
        });

        // Handle email notifications toggle
        this.emailNotificationsCheckbox?.addEventListener('change', (e) => {
            this.emailFields.classList.toggle('show', e.target.checked);
        });

        // Handle SMS notifications toggle
        this.smsNotificationsCheckbox?.addEventListener('change', (e) => {
            this.phoneFields.classList.toggle('show', e.target.checked);
        });

        // Handle font changes
        this.fontSelect?.addEventListener('change', (e) => {
            const newFont = e.target.value;
            FontManager.setFont(newFont);
            this.updateFontPreview(newFont);
        });

        // Handle theme changes
        this.themeSelect?.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            ThemeManager.setTheme(newTheme);
            this.updateThemePreview(newTheme);
        });

        // Handle settings form submission
        this.settingsForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const preferences = {
                notifications: this.notificationsCheckbox.checked,
                fontFamily: this.fontSelect.value,
                theme: this.themeSelect.value
            };
            
            // Save notification preferences if enabled
            if (preferences.notifications) {
                preferences.notificationEmail = this.notificationEmail.value;
                preferences.notificationPhone = this.notificationPhone.value;
                preferences.emailNotifications = this.emailNotificationsCheckbox.checked;
                preferences.smsNotifications = this.smsNotificationsCheckbox.checked;
            }

            if (User.updateUserPreferences(preferences)) {
                // Apply theme and font changes
                ThemeManager.setTheme(preferences.theme);
                FontManager.setFont(preferences.fontFamily);
                this.showSuccess('Settings saved successfully');
            } else {
                this.showError('Failed to save settings');
            }
        });
    }

    updateFontPreview(fontFamily) {
        const fontConfig = FontManager.fontMap[fontFamily];
        if (fontConfig) {
            this.fontPreview.style.fontFamily = fontConfig.cssFamily;
            this.fontSelect.value = fontFamily;
        }
    }

    updateThemePreview(theme) {
        this.themePreview.className = `theme-preview ${theme}`;
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
    new SettingsController();
});
