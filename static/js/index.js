// index.js

class SettingsManager {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        this.settingsPopup = document.getElementById('settingsPopup');
        this.saveSettingsBtn = document.getElementById('saveButton');
        this.backSettingsBtn = document.getElementById('backButton');
        this.cancelSettingsBtn = document.getElementById('cancelButton');
    }

    setupEventListeners() {
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.backSettingsBtn.addEventListener('click', () => this.closeSettingsPopup());
        this.cancelSettingsBtn.addEventListener('click', () => this.cancelSettings());

        // Close settings on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsPopup.style.display === 'flex') {
                this.closeSettingsPopup();
            }
        });

        // Close settings on outside click
        this.settingsPopup.addEventListener('click', (e) => {
            if (e.target === this.settingsPopup) {
                this.closeSettingsPopup();
            }
        });
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('settings')) || {};
            const elements = {
                'dateFormat': settings.dateFormat || 'mdy',
                'timeFormat': settings.timeFormat || '24h',
                'timeOverlayToggle': settings.timeOverlay || false,
                'modeToggle': settings.mode || 'day',
                'fontChoice': settings.font || 'Arial'
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });

            this.applySettings(settings);
        } catch (error) {
            this.errorHandler.logError(error);
        }
    }

    openSettingsPopup() {
        this.settingsPopup.style.display = 'flex';
        this.settingsPopup.setAttribute('aria-hidden', 'false');
    }

    closeSettingsPopup() {
        this.settingsPopup.style.display = 'none';
        this.settingsPopup.setAttribute('aria-hidden', 'true');
    }

    async saveSettings() {
        try {
            const settings = {
                dateFormat: document.getElementById('dateFormat').value,
                timeFormat: document.getElementById('timeFormat').value,
                timeOverlay: document.getElementById('timeOverlayToggle').checked,
                mode: document.getElementById('modeToggle').value,
                font: document.getElementById('fontChoice').value
            };

            localStorage.setItem('settings', JSON.stringify(settings));
            this.applySettings(settings);
            this.closeSettingsPopup();
            this.errorHandler.showSuccess('Settings saved successfully!');
        } catch (error) {
            this.errorHandler.logError(error);
        }
    }

    cancelSettings() {
        this.loadSettings();
        this.closeSettingsPopup();
    }

    applySettings(settings) {
        document.body.style.fontFamily = settings.font;
        document.body.classList.toggle('night-mode', settings.mode === 'night');
        this.updateTimeOverlay(settings.timeOverlay, settings.timeFormat);
    }

    updateTimeOverlay(show, format) {
        let overlay = document.getElementById('timeOverlay');

        if (!overlay && show) {
            overlay = document.createElement('div');
            overlay.id = 'timeOverlay';
            document.body.appendChild(overlay);
            this.makeOverlayDraggable(overlay);
        }

        if (show) {
            overlay.style.display = 'block';
            this.updateTime(overlay, format);
            setInterval(() => this.updateTime(overlay, format), 1000);
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }

    updateTime(overlay, format) {
        const now = new Date();
        const options = { hour12: format !== '24h' };
        overlay.textContent = now.toLocaleTimeString('en-US', options);
    }

    makeOverlayDraggable(overlay) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;

        overlay.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === overlay) isDragging = true;
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, overlay);
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    }
}

class LoginManager {
    constructor() {
        this.errorHandler = window.errorHandler;
        if (!this.errorHandler) {
            throw new Error('ErrorHandler not initialized');
        }

        this.initializeElements();
        this.setupEventListeners();
        this.settingsManager = new SettingsManager(this.errorHandler);
    }

    initializeElements() {
        this.loginForm = document.getElementById('loginForm');
        this.roleSelect = document.getElementById('roleSelect');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.settingsBtn.addEventListener('click', () => this.settingsManager.openSettingsPopup());
    }

    async handleLogin(e) {
        e.preventDefault();
        const selectedRole = this.roleSelect.value;

        if (!selectedRole) {
            this.errorHandler.showError('Please select a role.');
            return;
        }

        try {
            this.showLoading();

            // Create user session
            const userSession = {
                role: selectedRole,
                loginTime: new Date().toISOString(),
                settings: JSON.parse(localStorage.getItem('settings')) || {},
                isAuthenticated: true,
                sessionId: this.generateSessionId(),
                lastActive: Date.now()
            };

            // Simulate API call
            await this.simulateApiCall();

            // Store session data
            sessionStorage.setItem('userSession', JSON.stringify(userSession));

            // Redirect based on role
            this.redirectBasedOnRole(selectedRole);

        } catch (error) {
            this.errorHandler.logError(error);
        } finally {
            this.hideLoading();
        }
    }

    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9);
    }

    async simulateApiCall() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    redirectBasedOnRole(role) {
        const rolePages = {
            'Volunteer': 'volunteerDashboard.html',
            'Research': 'researchDashboard.html',
            'Admin': 'adminDashboard.html'
        };

        const page = rolePages[role];
        if (page) {
            window.location.href = page;
        } else {
            throw new Error('Invalid role selected');
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Initialize login manager when DOM is ready and ErrorHandler is available
document.addEventListener('DOMContentLoaded', () => {
    // Ensure ErrorHandler is initialized first
    if (!window.errorHandler) {
        console.error('ErrorHandler not found. Please ensure errorHandler.js is loaded first.');
        return;
    }
    window.loginManager = new LoginManager();
});
