import navigation from '../../services/navigation/navigation.js';
import { DataService } from '../../models/dataservice.js';
import Logger from '../../utils/logging/logger.js';
import config from '../../../config/client.js';
import paths from '../../../config/paths.js';

export class SurveyController {
    #logger;
    #view;
    #dataService;
    #currentSurvey = null;
    #isInitialized = false;

    constructor() {
        this.#logger = Logger;
        this.#logger.info('SurveyController initializing');
        this.#initialize();
    }

    async #initialize() {
        try {
            // Initialize DataService
            this.#dataService = DataService.getInstance();
            await this.#dataService.init();

            // Initialize view elements
            this.#initializeView();
            
            // Setup event listeners
            this.#setupEventListeners();

            // Load initial surveys
            await this.#loadSurveys();

            this.#isInitialized = true;
            this.#logger.info('SurveyController initialized successfully');
        } catch (error) {
            this.#logger.error('SurveyController initialization error:', error);
            this.#handleError('Failed to initialize survey management');
        }
    }

    #initializeView() {
        this.#view = {
            surveyList: document.getElementById('surveyList'),
            surveyFilter: document.getElementById('surveyFilter'),
            refreshButton: document.getElementById('refreshSurveys'),
            noSurveysMessage: document.getElementById('noSurveys'),
            surveyTemplate: document.getElementById('surveyTemplate'),
            loadingSpinner: document.getElementById('loading'),
            messageContainer: document.getElementById('message-container')
        };

        this.#logger.debug('View elements initialized:', {
            hasSurveyList: !!this.#view.surveyList,
            hasSurveyFilter: !!this.#view.surveyFilter,
            hasRefreshButton: !!this.#view.refreshButton,
            hasTemplate: !!this.#view.surveyTemplate
        });
    }

    #setupEventListeners() {
        // Setup filter change handler
        if (this.#view.surveyFilter) {
            this.#view.surveyFilter.addEventListener('change', () => this.#filterSurveys());
        }

        // Setup refresh button handler
        if (this.#view.refreshButton) {
            this.#view.refreshButton.addEventListener('click', () => this.#loadSurveys());
        }

        // Listen for error events
        document.addEventListener('showError', (event) => {
            this.#handleError(event.detail.message);
        });
    }

    async #loadSurveys() {
        try {
            this.#showLoading(true);
            this.#logger.info('Loading surveys');

            // In a real app, this would be an API call
            const surveys = this.#getSampleSurveys();
            await this.#renderSurveys(surveys);

            this.#logger.info('Surveys loaded successfully');
        } catch (error) {
            this.#logger.error('Error loading surveys:', error);
            this.#handleError('Failed to load surveys');
        } finally {
            this.#showLoading(false);
        }
    }

    #getSampleSurveys() {
        return [
            {
                id: 1,
                title: "Customer Satisfaction Survey",
                description: "Help us improve our services by sharing your experience",
                deadline: "2024-02-01",
                estimatedTime: "10 minutes",
                status: "pending"
            },
            {
                id: 2,
                title: "Product Feedback Survey",
                description: "Share your thoughts on our latest product features",
                deadline: "2024-02-15",
                estimatedTime: "15 minutes",
                status: "completed"
            },
            {
                id: 3,
                title: "Website Usability Survey",
                description: "Help us make our website better for you",
                deadline: "2024-02-28",
                estimatedTime: "5 minutes",
                status: "pending"
            }
        ];
    }

    async #renderSurveys(surveys) {
        if (!this.#view.surveyList || !this.#view.surveyTemplate) {
            this.#logger.warn('Required elements not found for rendering surveys');
            return;
        }

        this.#logger.info('Rendering surveys');
        
        // Clear existing surveys
        this.#view.surveyList.innerHTML = '';

        // Filter surveys based on selected filter
        const filterValue = this.#view.surveyFilter?.value || 'all';
        const filteredSurveys = this.#filterSurveysByStatus(surveys, filterValue);

        this.#logger.debug('Filtered surveys:', {
            filterValue,
            totalSurveys: surveys.length,
            filteredCount: filteredSurveys.length
        });

        if (filteredSurveys.length === 0) {
            this.#showNoSurveys();
            return;
        }

        // Hide no surveys message
        this.#hideNoSurveys();

        // Render each survey
        filteredSurveys.forEach(survey => {
            const surveyCard = this.#createSurveyCard(survey);
            this.#view.surveyList.appendChild(surveyCard);
        });

        this.#logger.info('Surveys rendered successfully');
    }

    #filterSurveysByStatus(surveys, status) {
        if (status === 'all') return surveys;
        return surveys.filter(survey => survey.status === status);
    }

    #createSurveyCard(survey) {
        const template = this.#view.surveyTemplate.content.cloneNode(true);
        const card = template.querySelector('.survey-card');

        // Add completed class if survey is completed
        if (survey.status === 'completed') {
            card.classList.add('completed');
        }

        // Set survey content
        card.querySelector('.survey-title').textContent = survey.title;
        card.querySelector('.survey-description').textContent = survey.description;
        card.querySelector('.deadline').textContent = `Deadline: ${this.#formatDate(survey.deadline)}`;
        card.querySelector('.estimated-time').textContent = `Est. Time: ${survey.estimatedTime}`;

        // Configure buttons based on status
        const startButton = card.querySelector('.start-survey');
        const viewButton = card.querySelector('.view-results');

        if (survey.status === 'completed') {
            startButton.style.display = 'none';
            viewButton.classList.remove('hidden');
            viewButton.addEventListener('click', () => this.#viewResults(survey.id));
        } else {
            viewButton.style.display = 'none';
            startButton.addEventListener('click', () => this.#startSurvey(survey.id));
        }

        return card;
    }

    #formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    #filterSurveys() {
        this.#logger.info('Filtering surveys');
        this.#loadSurveys();
    }

    #startSurvey(surveyId) {
        this.#logger.info('Starting survey:', { surveyId });
        const formPath = paths.getPagePath('survey-form') + `?id=${surveyId}`;
        navigation.navigateTo(formPath);
    }

    #viewResults(surveyId) {
        this.#logger.info('Viewing survey results:', { surveyId });
        const resultsPath = paths.getPagePath('survey-results') + `?id=${surveyId}`;
        navigation.navigateTo(resultsPath);
    }

    #showNoSurveys() {
        this.#logger.info('Showing no surveys message');
        if (this.#view.noSurveysMessage) {
            this.#view.noSurveysMessage.classList.remove('hidden');
        }
    }

    #hideNoSurveys() {
        this.#logger.debug('Hiding no surveys message');
        if (this.#view.noSurveysMessage) {
            this.#view.noSurveysMessage.classList.add('hidden');
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

    refreshSurveys() {
        this.#loadSurveys();
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SurveyController();
});