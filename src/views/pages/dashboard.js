// Dashboard view module with lazy-loaded components
import cache from '../../services/cache/cache.service.js';

// Template for the dashboard
const template = `
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>Dashboard</h1>
        </header>
        <main class="dashboard-content">
            <div class="dashboard-widgets" id="widgets">
                <!-- Widgets will be dynamically loaded here -->
            </div>
        </main>
    </div>
`;

// Lazy load dashboard widgets
async function loadWidgets() {
    const widgetIds = ['stats', 'chart', 'activity'];
    const widgetsContainer = document.getElementById('widgets');
    
    for (const id of widgetIds) {
        const cachedWidget = cache.get(`widget-${id}`);
        
        if (cachedWidget) {
            widgetsContainer.innerHTML += cachedWidget;
            continue;
        }

        try {
            // Dynamic import of widget module
            const widget = await import(
                /* webpackChunkName: "widget-[request]" */
                `../components/widgets/${id}.js`
            );
            
            const widgetContent = widget.default();
            cache.set(`widget-${id}`, widgetContent, 300000); // Cache for 5 minutes
            widgetsContainer.innerHTML += widgetContent;
            
        } catch (error) {
            console.error(`Error loading widget ${id}:`, error);
            widgetsContainer.innerHTML += `
                <div class="widget widget-error">
                    <p>Failed to load ${id} widget</p>
                </div>
            `;
        }
    }
}

// Initialize function that will be called by the router
export async function initialize() {
    await loadWidgets();
    
    // Add event listeners or other initialization logic
    document.querySelectorAll('.widget').forEach(widget => {
        widget.addEventListener('click', () => {
            console.log('Widget clicked:', widget.id);
        });
    });
}

// Export the template as default
export default template;
