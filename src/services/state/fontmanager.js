export default class FontManager {
    static getFont() {
        const username = sessionStorage.getItem('username');
        if (!username) return 'Arial';

        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        return userPreferences.fontFamily || 'Arial';
    }
    
    static setFont(fontFamily) {
        console.log('Setting font:', fontFamily); // Debug log
        const username = sessionStorage.getItem('username');
        if (!username) return;

        // Get all existing preferences
        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        
        // Update font preference while preserving other preferences
        userPreferences.fontFamily = fontFamily;
        
        // Save all preferences back to localStorage
        localStorage.setItem(`user_preferences_${username}`, JSON.stringify(userPreferences));
        
        // Apply font
        this.applyFont(fontFamily);
    }
    
    static applyFont(fontFamily) {
        console.log('Applying font:', fontFamily); // Debug log
        
        // Set CSS variable
        document.documentElement.style.setProperty('--font-family-custom', fontFamily);
        
        // Force reflow
        void document.documentElement.offsetHeight;
        
        // Dispatch event for other components
        const event = new CustomEvent('fontchange', { 
            detail: { fontFamily },
            bubbles: true 
        });
        window.dispatchEvent(event);
        
        console.log('Font applied:', fontFamily); // Debug log
    }
    
    static initialize() {
        console.log('Initializing FontManager'); // Debug log
        
        // Get username and preferences
        const username = sessionStorage.getItem('username');
        if (!username) return;

        // Load and apply font from preferences
        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        const font = userPreferences.fontFamily || 'Arial';
        console.log('Initial font:', font); // Debug log
        this.applyFont(font);

        // Listen for preference changes
        window.addEventListener('storage', (event) => {
            if (event.key === `user_preferences_${username}`) {
                const preferences = JSON.parse(event.newValue || '{}');
                console.log('Preferences change detected:', preferences); // Debug log
                if (preferences.fontFamily) {
                    this.applyFont(preferences.fontFamily);
                }
            }
        });

        // Listen for font changes from within the application
        window.addEventListener('fontchange', (event) => {
            console.log('Font change event received:', event.detail); // Debug log
        });

        console.log('FontManager initialized'); // Debug log
    }
}
