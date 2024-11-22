import { User } from '../../models/user.js';

class FontManager {
    // Map of display names to CSS-safe values and full font-family strings
    fontMap = {
        'Arial': {
            dataFont: 'arial',
            cssFamily: 'Arial, sans-serif'
        },
        'Helvetica': {
            dataFont: 'helvetica',
            cssFamily: 'Helvetica, sans-serif'
        },
        'Times New Roman': {
            dataFont: 'times-new-roman',
            cssFamily: '"Times New Roman", serif'
        },
        'Georgia': {
            dataFont: 'georgia',
            cssFamily: 'Georgia, serif'
        },
        'Verdana': {
            dataFont: 'verdana',
            cssFamily: 'Verdana, sans-serif'
        },
        'Tahoma': {
            dataFont: 'tahoma',
            cssFamily: 'Tahoma, sans-serif'
        },
        'Trebuchet MS': {
            dataFont: 'trebuchet-ms',
            cssFamily: '"Trebuchet MS", sans-serif'
        },
        'Geneva': {
            dataFont: 'geneva',
            cssFamily: 'Geneva, sans-serif'
        },
        'Courier New': {
            dataFont: 'courier-new',
            cssFamily: '"Courier New", monospace'
        },
        'Monaco': {
            dataFont: 'monaco',
            cssFamily: 'Monaco, monospace'
        },
        'system-ui': {
            dataFont: 'system-ui',
            cssFamily: 'system-ui, sans-serif'
        }
    };

    constructor() {
        this.initialize();
    }

    getFont() {
        if (!User.isAuthenticated()) return 'Arial';

        const preferences = User.getUserPreferences();
        const fontFamily = preferences?.fontFamily || 'Arial';
        
        // Validate the font exists in our map
        return this.fontMap[fontFamily] ? fontFamily : 'Arial';
    }
    
    setFont(fontFamily) {
        console.log('Setting font:', fontFamily);
        
        // Validate font family
        if (!this.fontMap[fontFamily]) {
            console.error('Invalid font family:', fontFamily);
            fontFamily = 'Arial'; // Fallback to Arial if invalid
        }

        // If user is logged in, save preference
        if (User.isAuthenticated()) {
            const preferences = User.getUserPreferences() || {};
            preferences.fontFamily = fontFamily;
            User.updateUserPreferences(preferences);
        }
        
        // Apply font regardless of login state
        this.applyFont(fontFamily);
    }
    
    applyFont(fontFamily) {
        console.log('Applying font:', fontFamily);
        
        // Validate font family and get config
        const fontConfig = this.fontMap[fontFamily];
        if (!fontConfig) {
            console.error('Invalid font family:', fontFamily);
            fontConfig = this.fontMap['Arial']; // Fallback to Arial if invalid
        }
        
        // Set data-font attribute on root element
        document.documentElement.setAttribute('data-font', fontConfig.dataFont);
        
        // Set CSS variable using the full font-family string
        document.documentElement.style.setProperty('--font-family-custom', fontConfig.cssFamily);
        
        // Force reflow to ensure changes are applied
        void document.documentElement.offsetHeight;
        
        // Dispatch event for other components
        const event = new CustomEvent('fontchange', { 
            detail: { fontFamily },
            bubbles: true 
        });
        window.dispatchEvent(event);
        
        console.log('Font applied:', fontFamily, 'with data-font:', fontConfig.dataFont, 'and CSS family:', fontConfig.cssFamily);
    }
    
    initialize() {
        console.log('Initializing FontManager');
        
        // Get current font (handles both logged-in and non-logged-in states)
        const currentFont = this.getFont();
        
        // Apply the font
        this.applyFont(currentFont);

        // If user is logged in, set up storage event listener
        if (User.isAuthenticated()) {
            const username = User.getCurrentUser()?.username;
            window.addEventListener('storage', (event) => {
                if (event.key === `user_preferences_${username}`) {
                    const preferences = JSON.parse(event.newValue || '{}');
                    console.log('Preferences change detected:', preferences);
                    if (preferences.fontFamily && this.fontMap[preferences.fontFamily]) {
                        this.applyFont(preferences.fontFamily);
                    }
                }
            });
        }

        // Listen for font changes from within the application
        window.addEventListener('fontchange', (event) => {
            console.log('Font change event received:', event.detail);
        });

        console.log('FontManager initialized with font:', currentFont);
    }
}

// Export singleton instance
const fontManager = new FontManager();
export default fontManager;
