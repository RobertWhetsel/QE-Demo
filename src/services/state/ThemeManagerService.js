import { User } from '../../models/user.js';
import Logger from '../../utils/logging/LoggerService.js';
import errorHandler from '../error/ErrorHandlerService.js';

class ThemeManagerService {
    #logger;
    #isInitialized = false;
    #currentTheme = 'light';
    #defaultTheme = 'light';
    #observers = new Set();
    
    #availableThemes = {
        light: {
            name: 'Light Theme',
            cssVariables: {
                '--primary': '#007bff',
                '--secondary': '#6c757d',
                '--success': '#28a745',
                '--danger': '#dc3545',
                '--warning': '#ffc107',
                '--info': '#17a2b8',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-primary': '#212529',
                '--text-secondary': '#6c757d'
            }
        },
        dark: {
            name: 'Dark Theme',
            cssVariables: {
                '--primary': '#375a7f',
                '--secondary': '#444444',
                '--success': '#00bc8c',
                '--danger': '#e74c3c',
                '--warning': '#f39c12',
                '--info': '#3498db',
                '--bg-primary': '#222222',
                '--bg-secondary': '#303030',
                '--text-primary': '#ffffff',
                '--text-secondary': '#888888'
            }
        },
        highContrast: {
            name: 'High Contrast',
            cssVariables: {
                '--primary': '#0066cc',
                '--secondary': '#000000',
                '--success': '#006600',
                '--danger': '#cc0000',
                '--warning': '#cc6600',
                '--info': '#0099cc',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f0f0f0',
                '--text-primary': '#000000',
                '--text-secondary': '#333333'
            }
        }
    };

    constructor() {
        this.#logger = Logger;
        this.#logger.info('ThemeManagerService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Check for system preference
            this.#checkSystemPreference();
            
            // Load user preference or default theme
            this.#loadUserPreference();
            
            // Setup theme change listeners
            this.#setupEventListeners();

            this.#isInitialized = true;
            this.#logger.info('ThemeManagerService initialized successfully');
        } catch (error) {
            this.#logger.error('ThemeManagerService initialization error:', error);
            errorHandler.handleError('Failed to initialize theme management');
        }
    }

    #checkSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.#defaultTheme = 'dark';
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', event => {
                if (!User.isAuthenticated()) {
                    this.setTheme(event.matches ? 'dark' : 'light');
                }
            });
    }

    #loadUserPreference() {
        if (User.isAuthenticated()) {
            const preferences = User.getUserPreferences();
            if (preferences?.theme && this.#availableThemes[preferences.theme]) {
                this.#currentTheme = preferences.theme;
            }
        } else {
            this.#currentTheme = this.#defaultTheme;
        }

        this.applyTheme(this.#currentTheme);
    }

    #setupEventListeners() {
        // Listen for theme changes from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'theme_change') {
                this.#handleStorageChange(event);
            }
        });

        // Listen for user preferences changes
        document.addEventListener('userPreferencesChanged', (event) => {
            if (event.detail.theme) {
                this.setTheme(event.detail.theme);
            }
        });
    }

    #handleStorageChange(event) {
        try {
            const data = JSON.parse(event.newValue || '{}');
            if (data.theme && data.theme !== this.#currentTheme) {
                if (User.isAuthenticated()) {
                    const currentUser = User.getCurrentUser();
                    if (data.username === currentUser?.username) {
                        this.applyTheme(data.theme);
                    }
                } else {
                    this.applyTheme(data.theme);
                }
            }
        } catch (error) {
            this.#logger.error('Error handling storage change:', error);
        }
    }

    setTheme(theme) {
        if (!this.#availableThemes[theme]) {
            this.#logger.error('Invalid theme:', theme);
            return false;
        }

        this.#logger.info('Setting theme:', theme);
        
        if (User.isAuthenticated()) {
            const preferences = User.getUserPreferences() || {};
            preferences.theme = theme;
            User.updateUserPreferences(preferences);
        }

        this.applyTheme(theme);
        this.#notifyThemeChange(theme);

        return true;
    }

    applyTheme(theme) {
        if (!this.#availableThemes[theme]) {
            this.#logger.error('Cannot apply invalid theme:', theme);
            return false;
        }

        this.#logger.info('Applying theme:', theme);

        try {
            // Remove current theme
            document.documentElement.removeAttribute('data-theme');
            
            // Force a reflow
            void document.documentElement.offsetHeight;
            
            // Apply new theme
            document.documentElement.setAttribute('data-theme', theme);
            
            // Apply CSS variables
            const cssVariables = this.#availableThemes[theme].cssVariables;
            Object.entries(cssVariables).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });

            this.#currentTheme = theme;
            
            // Notify observers
            this.#notifyObservers();

            return true;
        } catch (error) {
            this.#logger.error('Error applying theme:', error);
            return false;
        }
    }

    #notifyThemeChange(theme) {
        // Notify other windows/tabs
        const changeEvent = {
            theme,
            timestamp: Date.now(),
            username: User.getCurrentUser()?.username
        };
        localStorage.setItem('theme_change', JSON.stringify(changeEvent));

        // Dispatch event for other components
        const event = new CustomEvent('themeChange', { 
            detail: { theme },
            bubbles: true 
        });
        window.dispatchEvent(event);
    }

    #notifyObservers() {
        this.#observers.forEach(observer => {
            try {
                observer(this.#currentTheme);
            } catch (error) {
                this.#logger.error('Error notifying observer:', error);
            }
        });
    }

    // Public subscription method
    subscribe(callback) {
        this.#observers.add(callback);
        return () => this.#observers.delete(callback);
    }

    // Public getters
    getTheme() {
        return this.#currentTheme;
    }

    getAvailableThemes() {
        return Object.keys(this.#availableThemes).map(key => ({
            id: key,
            name: this.#availableThemes[key].name
        }));
    }

    // Public utility methods
    toggleTheme() {
        const newTheme = this.#currentTheme === 'light' ? 'dark' : 'light';
        return this.setTheme(newTheme);
    }

    isValidTheme(theme) {
        return theme in this.#availableThemes;
    }

    getThemeVariables(theme = this.#currentTheme) {
        if (!this.#availableThemes[theme]) return null;
        return { ...this.#availableThemes[theme].cssVariables };
    }
}

// Create and export singleton instance
const themeManager = new ThemeManagerService();
export default themeManager;