// Stats widget component
const createStatsWidget = () => {
    const stats = {
        users: 1234,
        activeProjects: 56,
        completedTasks: 789
    };

    return `
        <div class="widget widget-stats" id="stats-widget">
            <h3>Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${stats.users}</span>
                    <span class="stat-label">Total Users</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.activeProjects}</span>
                    <span class="stat-label">Active Projects</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.completedTasks}</span>
                    <span class="stat-label">Completed Tasks</span>
                </div>
            </div>
        </div>
    `;
};

// Export the widget creation function
export default createStatsWidget;
