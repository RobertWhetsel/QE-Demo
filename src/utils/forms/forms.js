import config from '../../config/client.js';
import paths from '../../config/paths.js';

// Form handling utilities
class FormHandler {
    constructor() {
        this.messageTimeout = config.ui.toastDuration;
        this.helpRequestsKey = 'helpRequests';
        this.storage = localStorage;
    }

    validateHelpForm(data) {
        return data.topic && data.topic.trim() && 
               data.description && data.description.trim();
    }

    getHelpRequests() {
        try {
            const stored = this.storage.getItem(this.helpRequestsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading help requests:', error);
            return [];
        }
    }

    saveHelpRequest(request) {
        try {
            const requests = this.getHelpRequests();
            const newRequest = {
                ...request,
                id: Date.now(),
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            requests.push(newRequest);
            this.storage.setItem(this.helpRequestsKey, JSON.stringify(requests));
            
            if (config.features.enableNotifications) {
                this.notifyNewRequest(newRequest);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving help request:', error);
            return false;
        }
    }

    notifyNewRequest(request) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Help Request', {
                    body: `Topic: ${request.topic}`,
                    icon: paths.resolve(paths.join(paths.assets, 'qeLogoBW.png'))
                });
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    async handleHelpFormSubmit(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Validate form data
            if (!this.validateHelpForm(data)) {
                throw new Error('Please fill in all required fields');
            }
            
            // Save help request to localStorage
            if (!this.saveHelpRequest(data)) {
                throw new Error('Failed to save help request');
            }
            
            // Clear and hide form
            form.reset();
            form.classList.add('hidden');
            
            // Show success message
            this.showMessage('Help request submitted successfully!', 'success');
        } catch (error) {
            console.error('Error submitting help request:', error);
            this.showMessage(error.message, 'error');
        }
    }

    showMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // Remove message after timeout
        setTimeout(() => {
            messageElement.remove();
        }, this.messageTimeout);
    }

    toggleForm(formElement) {
        if (!formElement) return;
        formElement.classList.toggle('hidden');
    }
}

export default new FormHandler();
