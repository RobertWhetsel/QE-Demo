import navigation from '../../services/navigation/navigation.js';
import paths from '../../../config/paths.js';
import Logger from '../../utils/logging/logger.js';

// Survey Management
class SurveyManager {
    constructor() {
        Logger.info('Initializing Survey Manager');
        this.initializeElements();
        this.attachEventListeners();
        this.loadSurveys();
    }

    initializeElements() {
        this.surveyList = document.getElementById('surveyList');
        this.surveyFilter = document.getElementById('surveyFilter');
        this.refreshButton = document.getElementById('refreshSurveys');
        this.noSurveysMessage = document.getElementById('noSurveys');
        this.surveyTemplate = document.getElementById('surveyTemplate');

        Logger.debug('Elements initialized:', {
            hasSurveyList: !!this.surveyList,
            hasSurveyFilter: !!this.surveyFilter,
            hasRefreshButton: !!this.refreshButton,
            hasNoSurveysMessage: !!this.noSurveysMessage,
            hasSurveyTemplate: !!this.surveyTemplate
        });
    }

    attachEventListeners() {
        if (this.surveyFilter) {
            Logger.debug('Attaching survey filter event listener');
            this.surveyFilter.addEventListener('change', () => this.filterSurveys());
        }
        
        if (this.refreshButton) {
            Logger.debug('Attaching refresh button event listener');
            this.refreshButton.addEventListener('click', () => this.loadSurveys());
        }
    }

    async loadSurveys() {
        try {
            Logger.info('Loading surveys');
            // In a real app, this would be an API call
            const surveys = this.getSampleSurveys();
            this.renderSurveys(surveys);
            Logger.info('Surveys loaded successfully');
        } catch (error) {
            Logger.error('Error loading surveys:', error);
            this.showError('Failed to load surveys');
        }
    }

    getSampleSurveys() {
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

    renderSurveys(surveys) {
        if (!this.surveyList || !this.surveyTemplate) {
            Logger.warn('Required elements not found for rendering surveys');
            return;
        }

        Logger.info('Rendering surveys');
        // Clear existing surveys
        this.surveyList.innerHTML = '';

        // Filter surveys based on selected filter
        const filterValue = this.surveyFilter?.value || 'all';
        const filteredSurveys = filterValue === 'all' 
            ? surveys 
            : surveys.filter(survey => survey.status === filterValue);

        Logger.debug('Filtered surveys:', {
            filterValue,
            totalSurveys: surveys.length,
            filteredCount: filteredSurveys.length
        });

        if (filteredSurveys.length === 0) {
            this.showNoSurveys();
            return;
        }

        // Hide no surveys message
        this.hideNoSurveys();

        // Render each survey
        filteredSurveys.forEach(survey => {
            const surveyCard = this.createSurveyCard(survey);
            this.surveyList.appendChild(surveyCard);
        });
        Logger.info('Surveys rendered successfully');
    }

    createSurveyCard(survey) {
        const template = this.surveyTemplate.content.cloneNode(true);
        const card = template.querySelector('.survey-card');

        // Add completed class if survey is completed
        if (survey.status === 'completed') {
            card.classList.add('completed');
        }

        // Set survey content
        card.querySelector('.survey-title').textContent = survey.title;
        card.querySelector('.survey-description').textContent = survey.description;
        card.querySelector('.deadline').textContent = `Deadline: ${this.formatDate(survey.deadline)}`;
        card.querySelector('.estimated-time').textContent = `Est. Time: ${survey.estimatedTime}`;

        // Configure buttons based on status
        const startButton = card.querySelector('.start-survey');
        const viewButton = card.querySelector('.view-results');

        if (survey.status === 'completed') {
            startButton.style.display = 'none';
            viewButton.classList.remove('hidden');
            viewButton.addEventListener('click', () => this.viewResults(survey.id));
        } else {
            viewButton.style.display = 'none';
            startButton.addEventListener('click', () => this.startSurvey(survey.id));
        }

        return card;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    filterSurveys() {
        Logger.info('Filtering surveys');
        this.loadSurveys();
    }

    startSurvey(surveyId) {
        Logger.info('Starting survey:', { surveyId });
        const formPath = paths.join(paths.pages, `survey-form.html?id=${surveyId}`);
        navigation.navigateTo(formPath);
    }

    viewResults(surveyId) {
        Logger.info('Viewing survey results:', { surveyId });
        const resultsPath = paths.join(paths.pages, `survey-results.html?id=${surveyId}`);
        navigation.navigateTo(resultsPath);
    }

    showNoSurveys() {
        Logger.info('Showing no surveys message');
        if (this.noSurveysMessage) {
            this.noSurveysMessage.classList.remove('hidden');
        }
    }

    hideNoSurveys() {
        Logger.debug('Hiding no surveys message');
        if (this.noSurveysMessage) {
            this.noSurveysMessage.classList.add('hidden');
        }
    }

    showError(message) {
        Logger.error('Survey error:', message);
        const errorEvent = new CustomEvent('showNotification', {
            detail: {
                type: 'error',
                message: message
            }
        });
        document.dispatchEvent(errorEvent);
    }
}

// Initialize survey manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SurveyManager();
});
