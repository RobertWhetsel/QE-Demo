export class NavigationService {
    /**
     * Navigates to a specified page
     */
    navigateTo(page) {
        try {
            // Check authentication
            const isAuthenticated = sessionStorage.getItem('isAuthenticated');
            if (!isAuthenticated && !page.includes('login.html') && !page.includes('genesisAdmin.html')) {
                window.location.href = "/src/views/pages/login.html";
                return;
            }

            // Ensure path starts with /src/views/pages/
            if (!page.startsWith('/')) {
                page = '/' + page;
            }
            if (!page.startsWith('/src/views/pages/')) {
                // Add .html extension if not present
                if (!page.endsWith('.html')) {
                    page += '.html';
                }
                page = `/src/views/pages${page}`;
            }

            console.log('Navigating to:', page); // Debug log
            window.location.href = page;
        } catch (error) {
            console.error('Navigation error:', error);
            const message = document.createElement('div');
            message.className = 'message message-error';
            message.textContent = 'Navigation failed. Please try again.';
            document.body.appendChild(message);
            setTimeout(() => message.remove(), 3000);
        }
    }

    /**
     * Clears the session cache
     */
    clearSessionCache() {
        sessionStorage.clear();
    }

    /**
     * Logout user
     */
    logout() {
        this.clearSessionCache();
        this.navigateTo('/login');
    }
}
