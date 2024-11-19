// Form handling utilities
class FormHandler {
    constructor() {
        this.messageTimeout = 3000; // 3 seconds for messages
    }

    validateHelpForm(data) {
        return data.topic && data.topic.trim() && 
               data.description && data.description.trim();
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
            
            // Here you would typically send the data to a server
            console.log('Help request submitted:', data);
            
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
