// errorHandler.js

class ErrorHandler {
    constructor() {
        this.errorContainer = document.getElementById('errorMessage');
    }

    showError(message, duration = 5000) {
        if (!this.errorContainer) {
            console.error('Error container not found');
            return;
        }

        this.errorContainer.textContent = message;
        this.errorContainer.style.display = 'block';

        // Auto-hide error after specified duration
        setTimeout(() => {
            this.errorContainer.style.display = 'none';
        }, duration);
    }

    showSuccess(message, duration = 3000) {
        // Create success message element if it doesn't exist
        let successMessage = document.querySelector('.success-message');
        if (!successMessage) {
            successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            document.body.appendChild(successMessage);
        }

        successMessage.textContent = message;
        successMessage.style.display = 'block';

        // Remove after specified duration
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, duration);
    }

    logError(error) {
        console.error('Application error:', error);
        this.showError('An unexpected error occurred. Please try again.');
    }
}

// Initialize error handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler = new ErrorHandler();
});
