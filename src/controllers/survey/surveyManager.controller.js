import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import { User } from '../../models/user.js';
import paths from '../../../config/paths.js';
import config from '../../../config/client.js';
import { ROLES } from '../../models/index.js';

export class SurveyManagerController {
    #logger;
    #view;
    #dataService;
    #currentSurvey = null;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SurveyManagerController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Check authorization
            if (!this.#checkAuth()) {
                this.#logger.warn('Unauthorized access attempt to survey manager');
                this.#handleError('Unauthorized access');
                return;
            }

            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load initial data
            await this.#loadSurveyData();

            this.#isInitialized = true;
            this.#logger.info('SurveyManagerController initialized successfully');
        } catch (error) {
            this.#logger.error('SurveyManagerController initialization error:', error);
            this.#handleError('Failed to initialize survey manager');
        }
    }

    #checkAuth() {
        const isAuthenticated = User.isAuthenticated();
        const userRole = User.getCurrentUserRole();

        this.#logger.info('Authorization check:', { isAuthenticated, userRole });

        return isAuthenticated && 
               [ROLES.GENESIS_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole);
    }

    #initializeView() {
        this.#view = {
            // Form elements
            surveyForm: document.getElementById('survey-form'),
            addQuestionBtn: document.getElementById('add-question'),
            surveyQuestions: document.getElementById('survey-questions'),
            surveyName: document.getElementById('survey-name'),
            surveyDescription: document.getElementById('survey-description'),
            surveyTarget: document.getElementById('survey-target'),
            surveyTargetSpecific: document.getElementById('survey-target-specific'),
            surveyDueDate: document.getElementById('survey-due-date'),

            // Loading and messages
            loadingSpinner: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message')
        };

        this.#logger.debug('View elements initialized:', {
            hasSurveyForm: !!this.#view.surveyForm,
            hasQuestionBtn: !!this.#view.addQuestionBtn,
            hasQuestionsContainer: !!this.#view.surveyQuestions
        });
    }

    #setupEventListeners() {
        // Add question button
        if (this.#view.addQuestionBtn) {
            this.#view.addQuestionBtn.addEventListener('click', () => this.#addQuestion());
        }

        // Survey form
        if (this.#view.surveyForm) {
            this.#view.surveyForm.addEventListener('submit', (e) => this.#handleSurveySubmit(e));
        }

        // Target selection
        if (this.#view.surveyTarget) {
            this.#view.surveyTarget.addEventListener('change', () => this.#updateTargetSpecific());
        }

        // Listen for question type changes to show/hide options
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('question-type')) {
                this.#handleQuestionTypeChange(e.target);
            }
        });

        this.#logger.debug('Event listeners setup complete');
    }

    async #loadSurveyData() {
        try {
            this.#showLoading(true);
            const data = sessionStorage.getItem('surveyData') || '[]';
            const surveys = JSON.parse(data);
            this.#logger.info('Survey data loaded:', { count: surveys.length });
        } catch (error) {
            this.#logger.error('Error loading survey data:', error);
            this.#handleError('Failed to load surveys');
        } finally {
            this.#showLoading(false);
        }
    }

    #addQuestion() {
        const questionCount = document.querySelectorAll('.question').length + 1;
        
        const questionHtml = `
            <div class="question">
                <input type="text" placeholder="Question ${questionCount}" required>
                <select class="question-type">
                    <option value="text">Text</option>
                    <option value="multiple">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                </select>
                <div class="question-options" style="display: none;">
                    <input type="text" placeholder="Option 1" class="option-input">
                    <input type="text" placeholder="Option 2" class="option-input">
                    <button type="button" class="add-option">Add Option</button>
                </div>
            </div>
        `;
        
        if (this.#view.surveyQuestions) {
            this.#view.surveyQuestions.insertAdjacentHTML('beforeend', questionHtml);
        }

        this.#logger.debug('Question added:', { questionCount });
    }

    #handleQuestionTypeChange(selectElement) {
        const questionDiv = selectElement.closest('.question');
        const optionsDiv = questionDiv.querySelector('.question-options');
        
        if (selectElement.value === 'multiple') {
            optionsDiv.style.display = 'block';
        } else {
            optionsDiv.style.display = 'none';
        }

        this.#logger.debug('Question type changed:', { type: selectElement.value });
    }

    #updateTargetSpecific() {
        const target = this.#view.surveyTarget.value;
        const specificSelect = this.#view.surveyTargetSpecific;

        if (!specificSelect) return;

        specificSelect.innerHTML = '';

        if (target !== 'all') {
            specificSelect.style.display = 'block';
            let options = [];
            
            switch(target) {
                case 'workspace':
                    options = JSON.parse(sessionStorage.getItem('workspaces')) || [];
                    break;
                case 'team':
                    options = JSON.parse(sessionStorage.getItem('teams')) || [];
                    break;
                case 'individual':
                    options = JSON.parse(sessionStorage.getItem('personnelList')) || [];
                    break;
            }

            options.forEach(option => {
                const optionHtml = `<option value="${option.name}">${option.name}</option>`;
                specificSelect.insertAdjacentHTML('beforeend', optionHtml);
            });
        } else {
            specificSelect.style.display = 'none';
        }

        this.#logger.debug('Target specific updated:', { target, optionsCount: options?.length });
    }

    async #handleSurveySubmit(event) {
        event.preventDefault();
        this.#logger.info('Processing survey submission');

        try {
            this.#showLoading(true);

            const surveyData = this.#getSurveyData();
            
            if (!this.#validateSurveyData(surveyData)) {
                return;
            }

            await this.#saveSurvey(surveyData);
            
            this.#showSuccess('Survey created successfully');
            event.target.reset();
            this.#view.surveyQuestions.innerHTML = '';

        } catch (error) {
            this.#logger.error('Error submitting survey:', error);
            this.#handleError('Failed to create survey');
        } finally {
            this.#showLoading(false);
        }
    }

    #getSurveyData() {
        const survey = {
            name: this.#view.surveyName.value,
            description: this.#view.surveyDescription.value,
            target: this.#view.surveyTarget.value,
            targetSpecific: this.#view.surveyTargetSpecific.value,
            dueDate: this.#view.surveyDueDate.value,
            questions: []
        };

        document.querySelectorAll('.question').forEach(questionElement => {
            const question = {
                text: questionElement.querySelector('input').value,
                type: questionElement.querySelector('.question-type').value,
                options: []
            };

            if (question.type === 'multiple') {
                questionElement.querySelectorAll('.option-input').forEach(optionInput => {
                    if (optionInput.value.trim()) {
                        question.options.push(optionInput.value.trim());
                    }
                });
            }

            survey.questions.push(question);
        });

        return survey;
    }

    #validateSurveyData(survey) {
        if (!survey.name?.trim()) {
            this.#handleError('Survey name is required');
            return false;
        }

        if (!survey.questions.length) {
            this.#handleError('Survey must have at least one question');
            return false;
        }

        for (const question of survey.questions) {
            if (!question.text?.trim()) {
                this.#handleError('All questions must have text');
                return false;
            }

            if (question.type === 'multiple' && question.options.length < 2) {
                this.#handleError('Multiple choice questions must have at least 2 options');
                return false;
            }
        }

        return true;
    }

    async #saveSurvey(survey) {
        try {
            const existingSurveys = JSON.parse(sessionStorage.getItem('surveyData') || '[]');
            existingSurveys.push(survey);
            sessionStorage.setItem('surveyData', JSON.stringify(existingSurveys));
            
            this.#logger.info('Survey saved successfully');
        } catch (error) {
            this.#logger.error('Error saving survey:', error);
            throw new Error('Failed to save survey');
        }
    }

    #showLoading(show) {
        if (this.#view.loadingSpinner) {
            this.#view.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    #showMessage(message, type) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type,
                duration: config.ui.toastDuration
            }
        });
        document.dispatchEvent(event);
    }

    #showSuccess(message) {
        this.#logger.info('Success:', message);
        this.#showMessage(message, 'success');
    }

    #handleError(message) {
        this.#logger.error('Error:', message);
        this.#showMessage(message, 'error');
    }

    // Public methods for external access
    getCurrentSurvey() {
        return this.#currentSurvey;
    }

    resetForm() {
        if (this.#view.surveyForm) {
            this.#view.surveyForm.reset();
            this.#view.surveyQuestions.innerHTML = '';
        }
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SurveyManagerController();
});