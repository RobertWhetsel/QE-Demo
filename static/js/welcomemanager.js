// welcomeManager.js
class WelcomeManager {
    constructor() {
        this.state = {
            user: null,
            welcomeMessage: null,
            instructions: null,
            isLoading: false,
            error: null
        };

        // Default mock content
        this.MOCK_DATA = {
            welcomeMessage: "Welcome {name}! Have a wonderful {time}!",
            instructions: "## Getting Started\n- Please wait for admin setup\n- Check back soon"
        };

        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.updateContent = this.updateContent.bind(this);
        this.render = this.render.bind(this);
        this.showError = this.showError.bind(this);
        this.retryLoad = this.retryLoad.bind(this);

        this.initialize();
    }

    async initialize() {
        try {
            this.showLoading();
            await this.loadMockContent();
            this.render();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async loadMockContent() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                this.state.welcomeMessage = this.MOCK_DATA.welcomeMessage;
                this.state.instructions = this.MOCK_DATA.instructions;
                this.state.user = { name: 'Guest' };
                resolve();
            }, 1000);
        });
    }

    updateContent(newContent) {
        try {
            // Type checking
            if (typeof newContent !== 'object') {
                throw new Error('Invalid content format');
            }

            if (newContent.welcomeMessage && typeof newContent.welcomeMessage === 'string') {
                this.MOCK_DATA.welcomeMessage = newContent.welcomeMessage;
                this.state.welcomeMessage = newContent.welcomeMessage;
            }
            
            if (newContent.instructions && typeof newContent.instructions === 'string') {
                this.MOCK_DATA.instructions = newContent.instructions;
                this.state.instructions = newContent.instructions;
            }
            
            this.render();
            this.showToast('Content updated successfully', 'success');
        } catch (error) {
            this.showError(error.message);
        }
    }

    render() {
        this.updateWelcomeMessage();
        this.updateInstructions();
    }

    updateWelcomeMessage() {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement && this.state.welcomeMessage) {
            const timeOfDay = this.getTimeOfDay();
            const message = this.state.welcomeMessage
                .replace('{name}', this.state.user.name)
                .replace('{time}', timeOfDay);
            
            welcomeElement.textContent = message;
        }
    }

    updateInstructions() {
        const instructionsElement = document.getElementById('adminInstructions');
        if (instructionsElement && this.state.instructions) {
            // Safely parse markdown if marked library is available
            if (window.marked) {
                instructionsElement.innerHTML = marked(this.state.instructions);
            } else {
                instructionsElement.textContent = this.state.instructions;
            }
        }
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    showLoading() {
        this.state.isLoading = true;
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.hidden = false;
        }
    }

    hideLoading() {
        this.state.isLoading = false;
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.hidden = true;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            const errorText = errorElement.querySelector('p');
            if (errorText) {
                errorText.textContent = message;
            }
            errorElement.hidden = false;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}" aria-hidden="true"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    async retryLoad() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.hidden = true;
        }
        await this.initialize();
    }
}

// Initialize welcome manager
document.addEventListener('DOMContentLoaded', () => {
    // Load required libraries
    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(markedScript);

    window.welcomeManager = new WelcomeManager();
});