import ThemeManager from './state/thememanager.js';
import FontManager from './state/fontmanager.js';

// Initialize state managers
export function initializeApp() {
    console.log('Initializing application...');
    
    // Initialize managers
    ThemeManager.initialize();
    FontManager.initialize();
    
    // Get user preferences if logged in
    const username = sessionStorage.getItem('username');
    if (username) {
        const userPreferences = JSON.parse(localStorage.getItem(`user_preferences_${username}`) || '{}');
        
        // Apply theme and font from preferences
        if (userPreferences.theme) {
            ThemeManager.setTheme(userPreferences.theme);
        }
        if (userPreferences.fontFamily) {
            FontManager.setFont(userPreferences.fontFamily);
        }
        
        // Listen for preference changes from other tabs/windows
        window.addEventListener('storage', (event) => {
            if (event.key === `user_preferences_${username}`) {
                const preferences = JSON.parse(event.newValue || '{}');
                if (preferences.theme) {
                    ThemeManager.setTheme(preferences.theme);
                }
                if (preferences.fontFamily) {
                    FontManager.setFont(preferences.fontFamily);
                }
            }
        });
    } else {
        // Apply default theme and font for non-logged-in users
        ThemeManager.setTheme('light');
        FontManager.setFont('Arial');
    }
    
    console.log('Application initialized');
}

// Initialize immediately when script is loaded
initializeApp();
