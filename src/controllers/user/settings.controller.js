import { User } from '../../models/user.js';
import ThemeManager from '../../services/state/thememanager.js';
import FontManager from '../../services/state/fontmanager.js';
import navigation from '../../services/navigation/navigation.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';

export class SettingsController {
    #logger;
    #view;
    #user;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SettingsController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Verify authentication
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to settings');
                navigation.navigateToPage('login');
                return;
            }

            // Get current user
            this.#user = User.getCurrentUser();
            if (!this.#user) {
                throw new Error('Failed to load user data');
            }

            // Initialize view elements
            this.#initializeView();
            
            // Load user preferences
            this.#loadUserPreferences();
            
            // Setup event listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('SettingsController initialized successfully');
        } catch (error) {
            this.#logger.error('SettingsController initialization error:', error);
            this.#handleError('Failed to initialize settings');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        this.#logger.info('Authentication check:', { isAuthenticated });
        return isAuthenticated;
    }

    #initializeView() {
        this.#view = {
            // Forms
            settingsForm: document.getElementById('settings-form'),
            
            // Theme elements
            themeSelect: document.getElementById('theme'),
            themePreview: document.getElementById('theme-preview'),
            
            // Font elements
            fontSelect: document.getElementById('font-family'),
            fontPreview: document.getElementById('font-preview'),

            // Notification elements
            notificationsCheckbox: document.getElementById('notifications'),
            notificationFields: document.getElementById('notification-fields'),
            emailNotificationsCheckbox: document.getElementById('email-notifications'),
            smsNotificationsCheckbox: document.getElementById('sms-notifications'),
            emailFields: document.querySelector('.notification-email-fields'),
            phoneFields: document.querySelector('.notification-phone-fields'),
            notificationEmail: document.getElementById('notification-email'),
            notificationPhone: document.getElementById('notification-phone'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasSettingsForm: !!this.#view.settingsForm,
            hasThemeSelect: !!this.#view.themeSelect,
            hasFontSelect: !!this.#view.fontSelect,
            hasNotifications: !!this.#view.notificationsCheckbox
        });
    }

    #loadUserPreferences() {
        const preferences = User.getUserPreferences();
        if (!preferences) return;

        this.#logger.info('Loading user preferences');

        // Load theme preference
        const currentTheme = ThemeManager.getTheme();
        if (this.#view.themeSelect) {
            this.#view.themeSelect.value = currentTheme;
            this.#updateThemePreview(currentTheme);
        }

        // Load font preference
        const currentFont = FontManager.getFont();
        if (currentFont) {
            this.#updateFontPreview(currentFont);
            if (this.#view.fontSelect) {
                this.#view.fontSelect.value = currentFont;
            }
        }

        // Load notification preferences
        if (preferences.notifications && this.#view.notificationsCheckbox) {
            this.#view.notificationsCheckbox.checked = true;
            this.#view.notificationFields.classList.add('show');
            
            if (preferences.emailNotifications) {
                this.#view.emailNotificationsCheckbox.checked = true;
                this.#view.emailFields.classList.add('show');
                this.#view.notificationEmail.value = preferences.notificationEmail || '';
            }
            
            if (preferences.smsNotifications) {
                this.#view.smsNotificationsCheckbox.checked = true;
                this.#view.phoneFields.classList.add('show');
                this.#view.notificationPhone.value = preferences.notificationPhone || '';
            }
        }

        this.#logger.debug('User preferences loaded successfully');
    }

    #setupEventListeners() {
        // Handle notifications toggle
        if (this.#view.notificationsCheckbox) {
            this.#view.notificationsCheckbox.addEventListener('change', (e) => this.#handleNotificationsToggle(e));
        }

        // Handle email notifications toggle
        if (this.#view.emailNotificationsCheckbox) {
            this.#view.emailNotificationsCheckbox.addEventListener('change', (e) => this.#handleEmailNotificationsToggle(e));
        }

        // Handle SMS notifications toggle
        if (this.#view.smsNotificationsCheckbox) {
            this.#view.smsNotificationsCheckbox.addEventListener('change', (e) => this.#handleSMSNotificationsToggle(e));
        }

        // Handle font changes
        if (this.#view.fontSelect) {
            this.#view.fontSelect.addEventListener('change', (e) => this.#handleFontChange(e));
        }

        // Handle theme changes
        if (this.#view.themeSelect) {
            this.#view.themeSelect.addEventListener('change', (e) => this.#handleThemeChange(e));
        }

        // Handle settings form submission
        if (this.#view.settingsForm) {
            this.#view.settingsForm.addEventListener('submit', (e) => this.#handleSettingsSubmit(e));
        }

        this.#logger.debug('Event listeners setup complete');
    }

    #handleNotificationsToggle(event) {
        this.#view.notificationFields.classList.toggle('show', event.target.checked);
        if (!event.target.checked) {
            this.#view.emailNotificationsCheckbox.checked = false;
            this.#view.smsNotificationsCheckbox.checked = false;
            this.#view.emailFields.classList.remove('show');
            this.#view.phoneFields.classList.remove('show');
        }
    }

    #handleEmailNotificationsToggle(event) {
        this.#view.emailFields.classList.toggle('show', event.target.checked);
    }

    #handleSMSNotificationsToggle(event) {
        this.#view.phoneFields.classList.toggle('show', event.target.checked);
    }

    #handleFontChange(event) {
        const newFont = event.target.value;
        FontManager.setFont(newFont);
        this.#updateFontPreview(newFont);
    }

    #handleThemeChange(event) {
        const newTheme = event.target.value;
        ThemeManager.setTheme(newTheme);
        this.#updateThemePreview(newTheme);
    }

    async #handleSettingsSubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing settings update');

        try {
            this.#showLoading(true);

            const preferences = {
                notifications: this.#view.notificationsCheckbox.checked,
                fontFamily: this.#view.fontSelect.value,
                theme: this.#view.themeSelect.value
            };
            
            // Save notification preferences if enabled
            if (preferences.notifications) {
                preferences.notificationEmail = this.#view.notificationEmail.value;
                preferences.notificationPhone = this.#view.notificationPhone.value;
                preferences.emailNotifications = this.#view.emailNotificationsCheckbox.checked;
                preferences.smsNotifications = this.#view.smsNotificationsCheckbox.checked;
            }

            if (!this.#validateSettings(preferences)) {
                return;
            }

            if (User.updateUserPreferences(preferences)) {
                // Apply theme and font changes
                ThemeManager.setTheme(preferences.theme);
                FontManager.setFont(preferences.fontFamily);
                this.#showSuccess('Settings saved successfully');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            this.#logger.error('Settings update error:', error);
            this.#handleError(error.message);
        } finally {
            this.#showLoading(false);
        }
    }

    #validateSettings(preferences) {
        if (preferences.notifications) {
            if (preferences.emailNotifications && !this.#isValidEmail(preferences.notificationEmail)) {
                this.#handleError('Please enter a valid notification email address');
                return false;
            }
            
            if (preferences.smsNotifications && !this.#isValidPhone(preferences.notificationPhone)) {
                this.#handleError('Please enter a valid phone number');
                return false;
            }
        }
        return true;
    }

    #updateFontPreview(fontFamily) {
        const fontConfig = FontManager.fontMap[fontFamily];
        if (fontConfig && this.#view.fontPreview) {
            this.#view.fontPreview.style.fontFamily = fontConfig.cssFamily;
        }
    }

    #updateThemePreview(theme) {
        if (this.#view.themePreview) {
            this.#view.themePreview.className = `theme-preview ${theme}`;
        }
    }

    #isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    #isValidPhone(phone) {
        return /^\+?[\d\s-]{10,}$/.test(phone);
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
        this.#logger.warn('Error:', message);
        this.#showMessage(message, 'error');
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsController();
});