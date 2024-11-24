import { User } from '../../models/user.js';

class ThemeManager {
    constructor() {
        // Don't initialize in constructor
        this._initialized = false;
    }

    getTheme() {
        // For non-authenticated users (like login page), check if theme is already set
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme) return currentTheme;

        // For authenticated users, get from preferences
        if (User.isAuthenticated()) {
            const preferences = User.getUserPreferences();
            return preferences?.theme || 'light';
        }

        // Default to light theme
        return 'light';
    }
    
    setTheme(theme) {
        console.log('Setting theme:', theme);
        
        // For authenticated users, save preferences
        if (User.isAuthenticated()) {
            const preferences = User.getUserPreferences() || {};
            preferences.theme = theme;
            
            if (User.updateUserPreferences(preferences)) {
                this.applyTheme(theme);

                // Notify other windows/tabs
                const changeEvent = {
                    theme,
                    timestamp: Date.now(),
                    username: User.getCurrentUser()?.username
                };
                localStorage.setItem('theme_change', JSON.stringify(changeEvent));
                console.log('Theme change event dispatched:', changeEvent);
            }
        } else {
            // For non-authenticated users, just apply the theme
            this.applyTheme(theme);
        }
    }
    
    applyTheme(theme) {
        console.log('Applying theme:', theme);
        
        // Ensure CSS variables are loaded before applying theme
        if (!this._cssLoaded()) {
            console.log('Waiting for CSS to load...');
            setTimeout(() => this.applyTheme(theme), 50);
            return;
        }
        
        // Remove any existing theme
        document.documentElement.removeAttribute('data-theme');
        
        // Force a reflow
        void document.documentElement.offsetHeight;
        
        // Apply new theme
        document.documentElement.setAttribute('data-theme', theme);
        
        // Dispatch event for other components
        const event = new CustomEvent('themechange', { 
            detail: { theme },
            bubbles: true 
        });
        window.dispatchEvent(event);
        
        console.log('Theme applied:', theme);
    }

    _cssLoaded() {
        // Check if CSS variables are loaded by testing a core variable
        const styles = getComputedStyle(document.documentElement);
        return styles.getPropertyValue('--color-surface-primary').trim() !== '';
    }
    
    initialize() {
        if (this._initialized) return;
        console.log('Initializing ThemeManager');

        // Wait for DOM to be ready
        const initializeTheme = () => {
            // Apply theme immediately
            const theme = this.getTheme();
            console.log('Initial theme:', theme);
            this.applyTheme(theme);

            // Listen for changes from other tabs/windows
            window.addEventListener('storage', (event) => {
                if (event.key === 'theme_change') {
                    const data = JSON.parse(event.newValue || '{}');
                    console.log('Theme change detected:', data);
                    if (User.isAuthenticated()) {
                        const currentUser = User.getCurrentUser();
                        if (data.theme && data.username === currentUser?.username) {
                            this.applyTheme(data.theme);
                        }
                    } else {
                        // For non-authenticated users, apply theme directly
                        if (data.theme) {
                            this.applyTheme(data.theme);
                        }
                    }
                }
            });

            // Listen for theme changes from within the application
            window.addEventListener('themechange', (event) => {
                console.log('Theme change event received:', event.detail);
            });

            this._initialized = true;
            console.log('ThemeManager initialized');
        };

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeTheme);
        } else {
            initializeTheme();
        }
    }
}

// Export singleton instance
const themeManager = new ThemeManager();
export default themeManager;
