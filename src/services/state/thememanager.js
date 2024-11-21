export default class ThemeManager {
    static getTheme() {
        const username = sessionStorage.getItem('username');
        if (!username) return 'light';

        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        return userPreferences.theme || 'light';
    }
    
    static setTheme(theme) {
        console.log('Setting theme:', theme); // Debug log
        const username = sessionStorage.getItem('username');
        if (!username) return;

        // Save theme preference
        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        userPreferences.theme = theme;
        localStorage.setItem(`user_preferences_${username}`, JSON.stringify(userPreferences));
        
        // Apply theme
        this.applyTheme(theme);

        // Notify other windows/tabs
        const changeEvent = {
            theme,
            timestamp: Date.now(),
            username
        };
        localStorage.setItem('theme_change', JSON.stringify(changeEvent));
        console.log('Theme change event dispatched:', changeEvent); // Debug log
    }
    
    static applyTheme(theme) {
        console.log('Applying theme:', theme); // Debug log
        
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
        
        console.log('Theme applied:', theme); // Debug log
    }
    
    static initialize() {
        console.log('Initializing ThemeManager'); // Debug log
        
        // Apply theme immediately
        const theme = this.getTheme();
        console.log('Initial theme:', theme); // Debug log
        this.applyTheme(theme);

        // Listen for changes from other tabs/windows
        window.addEventListener('storage', (event) => {
            if (event.key === 'theme_change') {
                const data = JSON.parse(event.newValue || '{}');
                console.log('Theme change detected:', data); // Debug log
                if (data.theme && data.username === sessionStorage.getItem('username')) {
                    this.applyTheme(data.theme);
                }
            }
        });

        // Listen for theme changes from within the application
        window.addEventListener('themechange', (event) => {
            console.log('Theme change event received:', event.detail); // Debug log
        });

        console.log('ThemeManager initialized'); // Debug log
    }
}
