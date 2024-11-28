import logger from '../logger/LoggerService.js';
import errorHandler from '../error/ErrorHandlerService.js';
import { ROLES } from '../../models/index.js';

class ValidationService {
    #logger;
    #customValidators = new Map();
    #isInitialized = false;
    #defaultMessages = {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: 'Must be at least {min} characters',
        maxLength: 'Must be no more than {max} characters',
        pattern: 'Please enter a valid value',
        integer: 'Please enter a whole number',
        float: 'Please enter a valid number',
        url: 'Please enter a valid URL',
        phone: 'Please enter a valid phone number',
        date: 'Please enter a valid date',
        password: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and be at least 8 characters long',
        username: 'Username must be between 3 and 20 characters and contain only letters, numbers, and underscores',
        role: 'Please select a valid role'
    };

    constructor() {
        this.#logger = logger;
        this.#logger.info('ValidationService initializing');
        this.#initialize();
    }

    #initialize() {
        try {
            // Setup default validators
            this.#setupDefaultValidators();

            this.#isInitialized = true;
            this.#logger.info('ValidationService initialized successfully');
        } catch (error) {
            this.#logger.error('ValidationService initialization error:', error);
            errorHandler.handleError('Failed to initialize validation service');
        }
    }

    #setupDefaultValidators() {
        // Required field validator
        this.#customValidators.set('required', {
            validate: (value) => {
                return value !== null && value !== undefined && value.toString().trim() !== '';
            },
            message: this.#defaultMessages.required
        });

        // Email validator
        this.#customValidators.set('email', {
            validate: (value) => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: this.#defaultMessages.email
        });

        // Min length validator
        this.#customValidators.set('minLength', {
            validate: (value, min) => {
                return value.length >= min;
            },
            message: this.#defaultMessages.minLength
        });

        // Max length validator
        this.#customValidators.set('maxLength', {
            validate: (value, max) => {
                return value.length <= max;
            },
            message: this.#defaultMessages.maxLength
        });

        // Pattern validator
        this.#customValidators.set('pattern', {
            validate: (value, pattern) => {
                return new RegExp(pattern).test(value);
            },
            message: this.#defaultMessages.pattern
        });

        // Integer validator
        this.#customValidators.set('integer', {
            validate: (value) => {
                return /^-?\d+$/.test(value);
            },
            message: this.#defaultMessages.integer
        });

        // Float validator
        this.#customValidators.set('float', {
            validate: (value) => {
                return /^-?\d*\.?\d+$/.test(value);
            },
            message: this.#defaultMessages.float
        });

        // URL validator
        this.#customValidators.set('url', {
            validate: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: this.#defaultMessages.url
        });

        // Phone validator
        this.#customValidators.set('phone', {
            validate: (value) => {
                return /^\+?[\d\s-]{10,}$/.test(value);
            },
            message: this.#defaultMessages.phone
        });

        // Date validator
        this.#customValidators.set('date', {
            validate: (value) => {
                const date = new Date(value);
                return !isNaN(date.getTime());
            },
            message: this.#defaultMessages.date
        });

        // Password validator
        this.#customValidators.set('password', {
            validate: (value) => {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
            },
            message: this.#defaultMessages.password
        });

        // Username validator
        this.#customValidators.set('username', {
            validate: (value) => {
                return /^[a-zA-Z0-9_]{3,20}$/.test(value);
            },
            message: this.#defaultMessages.username
        });

        // Role validator
        this.#customValidators.set('role', {
            validate: (value) => {
                return Object.values(ROLES).includes(value);
            },
            message: this.#defaultMessages.role
        });
    }

    // Validate single value
    validate(value, rules) {
        const errors = [];

        for (const [rule, params] of Object.entries(rules)) {
            const validator = this.#customValidators.get(rule);
            if (!validator) {
                this.#logger.warn('Validator not found:', rule);
                continue;
            }

            const isValid = validator.validate(value, params);
            if (!isValid) {
                let message = validator.message;
                if (typeof params === 'object') {
                    Object.entries(params).forEach(([key, value]) => {
                        message = message.replace(`{${key}}`, value);
                    });
                }
                errors.push(message);
            }
        }

        return errors;
    }

    // Validate object
    validateObject(obj, schema) {
        const errors = {};

        for (const [field, rules] of Object.entries(schema)) {
            const fieldErrors = this.validate(obj[field], rules);
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }

    // Validate form
    validateForm(formElement, schema) {
        const formData = new FormData(formElement);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        return this.validateObject(data, schema);
    }

    // Add custom validator
    addValidator(name, validator, message) {
        if (this.#customValidators.has(name)) {
            this.#logger.warn('Overwriting existing validator:', name);
        }

        this.#customValidators.set(name, {
            validate: validator,
            message: message || this.#defaultMessages.pattern
        });

        this.#logger.info('Custom validator added:', name);
    }

    // Remove validator
    removeValidator(name) {
        if (this.#customValidators.has(name)) {
            this.#customValidators.delete(name);
            this.#logger.info('Validator removed:', name);
            return true;
        }
        return false;
    }

    // Get available validators
    getValidators() {
        return Array.from(this.#customValidators.keys());
    }

    // Update validator message
    updateValidatorMessage(name, message) {
        const validator = this.#customValidators.get(name);
        if (validator) {
            validator.message = message;
            this.#customValidators.set(name, validator);
            return true;
        }
        return false;
    }

    // Validation schemas
    createSchema(schema) {
        return Object.entries(schema).reduce((acc, [field, rules]) => {
            acc[field] = this.#normalizeRules(rules);
            return acc;
        }, {});
    }

    #normalizeRules(rules) {
        if (typeof rules === 'string') {
            return { [rules]: true };
        }
        if (Array.isArray(rules)) {
            return rules.reduce((acc, rule) => {
                if (typeof rule === 'string') {
                    acc[rule] = true;
                } else {
                    Object.assign(acc, rule);
                }
                return acc;
            }, {});
        }
        return rules;
    }

    // Special validation methods
    isStrongPassword(password) {
        return this.validate(password, { password: true }).length === 0;
    }

    isValidEmail(email) {
        return this.validate(email, { email: true }).length === 0;
    }

    isValidUsername(username) {
        return this.validate(username, { username: true }).length === 0;
    }

    isValidPhone(phone) {
        return this.validate(phone, { phone: true }).length === 0;
    }
}

// Create and export singleton instance
const validationService = new ValidationService();
export default validationService;