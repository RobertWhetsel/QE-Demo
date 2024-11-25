import Logger from '../../utils/logging/LoggerService.js';
import errorHandler from '../error/ErrorHandlerService.js';
import config from '../../../config/client.js';

class FormHandlerService {
    #logger;
    #forms = new Map();
    #validators = new Map();
    #isInitialized = false;
    #defaultValidationMessages = {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: 'This field must be at least {min} characters long',
        maxLength: 'This field must be no more than {max} characters long',
        pattern: 'Please enter a valid value',
        match: 'Fields do not match',
        custom: 'Invalid value'
    };

    constructor() {
        this.#logger = Logger;
        this.#logger.info('FormHandlerService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup form validation rules
            this.#setupDefaultValidators();
            
            // Setup global form handlers
            this.#setupGlobalHandlers();

            this.#isInitialized = true;
            this.#logger.info('FormHandlerService initialized successfully');
        } catch (error) {
            this.#logger.error('FormHandlerService initialization error:', error);
            throw error;
        }
    }

    #setupDefaultValidators() {
        this.#validators.set('required', (value) => {
            return !!value && value.toString().trim().length > 0;
        });

        this.#validators.set('email', (value) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        });

        this.#validators.set('minLength', (value, min) => {
            return value.length >= min;
        });

        this.#validators.set('maxLength', (value, max) => {
            return value.length <= max;
        });

        this.#validators.set('pattern', (value, pattern) => {
            return new RegExp(pattern).test(value);
        });

        this.#validators.set('match', (value, targetValue) => {
            return value === targetValue;
        });
    }

    #setupGlobalHandlers() {
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.hasAttribute('data-form-handler')) {
                event.preventDefault();
                this.#handleFormSubmit(form);
            }
        });

        document.addEventListener('input', (event) => {
            const input = event.target;
            if (input.hasAttribute('data-validate')) {
                this.#validateField(input);
            }
        });
    }

    registerForm(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            this.#logger.error('Form not found:', formId);
            return false;
        }

        const formConfig = {
            onSubmit: options.onSubmit || null,
            onValidate: options.onValidate || null,
            validators: options.validators || {},
            messages: options.messages || {},
            validateOnInput: options.validateOnInput ?? true,
            resetOnSubmit: options.resetOnSubmit ?? true
        };

        form.setAttribute('data-form-handler', 'true');
        this.#forms.set(formId, formConfig);
        
        this.#logger.info('Form registered:', formId);
        return true;
    }

    async #handleFormSubmit(form) {
        const formId = form.id;
        const config = this.#forms.get(formId);

        if (!config) {
            this.#logger.warn('Form not registered:', formId);
            return;
        }

        try {
            // Show loading state
            this.#setFormLoading(form, true);

            // Validate form
            const isValid = await this.#validateForm(form);
            if (!isValid) return;

            // Get form data
            const formData = this.#getFormData(form);

            // Call onSubmit handler if provided
            if (config.onSubmit) {
                await config.onSubmit(formData);
            }

            // Reset form if configured
            if (config.resetOnSubmit) {
                form.reset();
            }

            this.#logger.info('Form submitted successfully:', formId);

        } catch (error) {
            this.#logger.error('Form submission error:', error);
            errorHandler.handleError(error);
        } finally {
            this.#setFormLoading(form, false);
        }
    }

    async #validateForm(form) {
        const formId = form.id;
        const config = this.#forms.get(formId);
        let isValid = true;

        // Clear previous errors
        this.#clearFormErrors(form);

        // Validate each field
        for (const field of form.elements) {
            if (!field.name) continue;

            const fieldValid = await this.#validateField(field);
            isValid = isValid && fieldValid;
        }

        // Call custom validation if provided
        if (config.onValidate) {
            try {
                const customValidation = await config.onValidate(this.#getFormData(form));
                if (customValidation !== true) {
                    this.#showFormError(form, customValidation);
                    isValid = false;
                }
            } catch (error) {
                this.#logger.error('Custom validation error:', error);
                isValid = false;
            }
        }

        return isValid;
    }

    async #validateField(field) {
        const formId = field.closest('form').id;
        const config = this.#forms.get(formId);
        const validators = config.validators[field.name] || {};
        let isValid = true;

        // Clear previous errors
        this.#clearFieldError(field);

        // Run validators
        for (const [rule, param] of Object.entries(validators)) {
            const validator = this.#validators.get(rule);
            if (!validator) continue;

            const isFieldValid = await validator(field.value, param);
            if (!isFieldValid) {
                this.#showFieldError(field, this.#getErrorMessage(rule, config.messages, param));
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    #getFormData(form) {
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    #getErrorMessage(rule, messages, param) {
        const message = messages[rule] || this.#defaultValidationMessages[rule];
        return message.replace(/{(\w+)}/g, (match, key) => param[key] || param);
    }

    #showFieldError(field, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.classList.add('error');
        field.parentNode.appendChild(errorDiv);
    }

    #showFormError(form, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
    }

    #clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
    }

    #clearFormErrors(form) {
        form.querySelectorAll('.field-error, .form-error').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }

    #setFormLoading(form, loading) {
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) {
            submitButton.disabled = loading;
            
            // Store original text if loading
            if (loading) {
                submitButton.dataset.originalText = submitButton.textContent;
                submitButton.textContent = 'Loading...';
            } else if (submitButton.dataset.originalText) {
                // Restore original text
                submitButton.textContent = submitButton.dataset.originalText;
                delete submitButton.dataset.originalText;
            }
        }
    }

    // Public methods for external validation
    addValidator(name, validator, message) {
        this.#validators.set(name, validator);
        this.#defaultValidationMessages[name] = message;
    }

    removeValidator(name) {
        this.#validators.delete(name);
        delete this.#defaultValidationMessages[name];
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            return this.#validateField(field);
        }
        return false;
    }
}

// Create and export singleton instance
const formHandler = new FormHandlerService();
export default formHandler;