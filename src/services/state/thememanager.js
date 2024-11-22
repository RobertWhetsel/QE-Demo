import { User } from '../../models/user.js';

class ThemeManager {
    constructor() {
        this.initialize();
    }

    getTheme() {
        if (!User.isAuthenticated()) return 'light';

        const preferences = User.getUserPreferences();
        return preferences?.theme || 'light';
    }
    
    setTheme(theme) {
        console.log('Setting theme:', theme);
        if (!User.isAuthenticated()) return;

        // Get current preferences and update theme
        const preferences = User.getUserPreferences() || {};
        preferences.theme = theme;
        
        // Save updated preferences
        if (User.updateUserPreferences(preferences)) {
            // Apply theme
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
    }
    
    applyTheme(theme) {
        console.log('Applying theme:', theme);
        
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
    
    initialize() {
        console.log('Initializing ThemeManager');
        
        // Apply theme immediately
        const theme = this.getTheme();
        console.log('Initial theme:', theme);
        this.applyTheme(theme);

        // Listen for changes from other tabs/windows
        window.addEventListener('storage', (event) => {
            if (event.key === 'theme_change') {
                const data = JSON.parse(event.newValue || '{}');
                console.log('Theme change detected:', data);
                const currentUser = User.getCurrentUser();
                if (data.theme && data.username === currentUser?.username) {
                    this.applyTheme(data.theme);
                }
            }
        });

        // Listen for theme changes from within the application
        window.addEventListener('themechange', (event) => {
            console.log('Theme change event received:', event.detail);
        });

        console.log('ThemeManager initialized');
    }
}

// Export singleton instance
const themeManager = new ThemeManager();
export default themeManager;
