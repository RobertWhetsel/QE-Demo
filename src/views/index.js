// Component Loading System
export class ComponentLoader {
    static async loadComponent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${path}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Component loading error:', error);
            throw error;
        }
    }

    static async insertComponent(targetSelector, componentPath, data = {}) {
        try {
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                throw new Error(`Target element not found: ${targetSelector}`);
            }

            const html = await this.loadComponent(componentPath);
            const processedHtml = this.processTemplate(html, data);
            targetElement.innerHTML = processedHtml;

            // Process any scripts in the component
            await this.processComponentScripts(targetElement);
        } catch (error) {
            console.error('Component insertion error:', error);
            throw error;
        }
    }

    static processTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    }

    static async processComponentScripts(container) {
        const scripts = container.getElementsByTagName('script');
        for (const script of Array.from(scripts)) {
            const newScript = document.createElement('script');
            
            // Copy script attributes
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Handle both inline and external scripts
            if (script.src) {
                newScript.src = script.src;
                await new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                });
            } else {
                newScript.textContent = script.textContent;
            }

            script.parentNode.replaceChild(newScript, script);
        }
    }
}

// Component Paths
export const COMPONENTS = {
    HEADER: '/src/views/components/header.html',
    NAV: '/src/views/components/nav.html',
    SIDEBAR: '/src/views/components/sidebar.html'
};

// Page Paths
export const PAGES = {
    LOGIN: '/src/views/pages/login.html',
    ADMIN_DASHBOARD: '/src/views/pages/adminDashboard.html',
    USER_PROFILE: '/src/views/pages/userProfile.html',
    SURVEY: '/src/views/pages/survey.html'
};

// Style Paths
export const STYLES = {
    BASE: '/src/views/styles/core/base.css',
    COMPONENTS: '/src/views/styles/components',
    LAYOUTS: '/src/views/styles/layouts',
    THEMES: '/src/views/styles/themes'
};

// Template Functions
export const Templates = {
    renderUserCard: (user) => `
        <div class="user-card">
            <h3>${user.username}</h3>
            <p>Role: ${user.role}</p>
            <p>Email: ${user.email}</p>
        </div>
    `,
    
    renderSurveyItem: (survey) => `
        <div class="survey-item">
            <h4>${survey.title}</h4>
            <p>Created by: ${survey.createdBy}</p>
            <p>Questions: ${survey.questions.length}</p>
            <button onclick="handleSurveyClick('${survey.id}')">View Survey</button>
        </div>
    `
};
