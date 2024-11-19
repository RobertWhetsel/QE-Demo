let surveyData = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-question')?.addEventListener('click', addQuestion);
    document.getElementById('survey-form')?.addEventListener('submit', submitSurvey);
    document.getElementById('survey-target')?.addEventListener('change', updateTargetSpecific);
});

function addQuestion() {
    const questionCount = document.querySelectorAll('.question').length + 1;
    const surveyQuestions = document.getElementById('survey-questions');
    if (!surveyQuestions) return;

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
    
    surveyQuestions.insertAdjacentHTML('beforeend', questionHtml);
}

function submitSurvey(e) {
    e.preventDefault();
    const survey = {
        name: document.getElementById('survey-name')?.value || '',
        description: document.getElementById('survey-description')?.value || '',
        target: document.getElementById('survey-target')?.value || '',
        targetSpecific: document.getElementById('survey-target-specific')?.value || '',
        dueDate: document.getElementById('survey-due-date')?.value || '',
        questions: []
    };

    document.querySelectorAll('.question').forEach(questionElement => {
        const question = {
            text: questionElement.querySelector('input')?.value || '',
            type: questionElement.querySelector('.question-type')?.value || '',
            options: []
        };

        if (question.type === 'multiple' || question.type === 'true-false') {
            questionElement.querySelectorAll('.option-input').forEach(optionInput => {
                if (optionInput.value) {
                    question.options.push(optionInput.value);
                }
            });
        }

        survey.questions.push(question);
    });

    surveyData.push(survey);
    sessionStorage.setItem('surveyData', JSON.stringify(surveyData));
    console.log("Survey created:", survey);

    // Reset form
    const form = document.getElementById('survey-form');
    if (form) {
        form.reset();
    }
    
    const surveyQuestions = document.getElementById('survey-questions');
    if (surveyQuestions) {
        surveyQuestions.innerHTML = '';
    }
}

function updateTargetSpecific() {
    const target = document.getElementById('survey-target')?.value;
    const specificSelect = document.getElementById('survey-target-specific');
    if (!specificSelect) return;

    // Clear existing options
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
}

function getSurveyData() {
    return JSON.parse(sessionStorage.getItem('surveyData')) || [];
}

// Export for global access
window.getSurveyData = getSurveyData;
