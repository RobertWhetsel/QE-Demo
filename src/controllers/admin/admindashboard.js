// Handle authentication
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('userName')) {
        window.location.href = 'login.html';
    }

    // Initialize iframe content
    const contentFrame = document.getElementById('content-frame');
    if (contentFrame) {
        // Handle iframe load events
        contentFrame.addEventListener('load', () => {
            console.log('Content frame loaded:', contentFrame.src);
        });

        // Handle iframe errors
        contentFrame.addEventListener('error', (error) => {
            console.error('Error loading content frame:', error);
            contentFrame.src = 'error.html';
        });
    }
});
