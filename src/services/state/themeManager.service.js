// Theme manager service following singleton pattern
class ThemeManager {
    constructor() {
        if (ThemeManager.instance) {
            return ThemeManager.instance;
        }
        ThemeManager.instance = this;
        
        // Initialize state
        this.currentTheme = 'light';
        this.isInitialized = false;
        this.supportedThemes = ['light', 'dark'];
        this.observers = new Set();
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Load saved theme preference
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme && this.supportedThemes.includes(savedTheme)) {
                this.currentTheme = savedTheme;
            } else {
                // Check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.currentTheme = prefersDark ? 'dark' : 'light';
            }

            // Apply initial theme
            this.applyTheme(this.currentTheme);

            // Set up media query listener
            window.matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', this.handleSystemThemeChange.bind(this));

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Theme manager initialization failed:', error);
            return false;
        }
    }

    handleSystemThemeChange(event) {
        if (event.matches) {
            this.setTheme('dark');
        } else {
            this.setTheme('light');
        }
    }

    applyTheme(theme) {
        // Remove any existing theme classes
        document.documentElement.classList.remove(...this.supportedThemes.map(t => `theme--${t}`));
        // Add new theme class
        document.documentElement.classList.add(`theme--${theme}`);
        // Store preference
        localStorage.setItem('theme', theme);
        // Notify observers
        this.notifyObservers();
    }

    setTheme(theme) {
        if (!this.supportedThemes.includes(theme)) {
            throw new Error(`Unsupported theme: ${theme}`);
        }
        this.currentTheme = theme;
        this.applyTheme(theme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // Observer pattern implementation
    addObserver(callback) {
        this.observers.add(callback);
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => {
            callback(this.currentTheme);
        });
    }
}

// Export singleton instance
export default new ThemeManager();