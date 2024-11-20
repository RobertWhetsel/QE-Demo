// Survey Management
class SurveyManager {
    constructor() {
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
    }

    attachEventListeners() {
        this.surveyFilter?.addEventListener('change', () => this.filterSurveys());
        this.refreshButton?.addEventListener('click', () => this.loadSurveys());
    }

    async loadSurveys() {
        try {
            // In a real app, this would be an API call
            const surveys = this.getSampleSurveys();
            this.renderSurveys(surveys);
        } catch (error) {
            console.error('Error loading surveys:', error);
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
        if (!this.surveyList || !this.surveyTemplate) return;

        // Clear existing surveys
        this.surveyList.innerHTML = '';

        // Filter surveys based on selected filter
        const filterValue = this.surveyFilter?.value || 'all';
        const filteredSurveys = filterValue === 'all' 
            ? surveys 
            : surveys.filter(survey => survey.status === filterValue);

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
        this.loadSurveys();
    }

    startSurvey(surveyId) {
        // In a real app, this would navigate to the survey page or open a modal
        console.log('Starting survey:', surveyId);
        window.location.href = `survey-form.html?id=${surveyId}`;
    }

    viewResults(surveyId) {
        // In a real app, this would show the survey results
        console.log('Viewing results for survey:', surveyId);
        window.location.href = `survey-results.html?id=${surveyId}`;
    }

    showNoSurveys() {
        if (this.noSurveysMessage) {
            this.noSurveysMessage.classList.remove('hidden');
        }
    }

    hideNoSurveys() {
        if (this.noSurveysMessage) {
            this.noSurveysMessage.classList.add('hidden');
        }
    }

    showError(message) {
        // In a real app, this would show a proper error message UI
        console.error(message);
        alert(message);
    }
}

// Initialize survey manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SurveyManager();
});
