/**
 * Initializes global path configurations.
 * Assumes window.env is populated from env.json.
 */

console.log('Initializing QE namespace and services...');

// Verify window.env exists
if (!window.env) {
    console.error('window.env not found. env.json must be loaded first.');
    throw new Error('Environment not initialized');
}

// Initialize window.QE namespace
try {
    console.log('Setting up window.QE namespace...');
    window.QE = {};
    
    // Initialize User service
    console.log('Initializing User service...');
    window.QE.User = {
        checkExistingUsers: async () => {
            try {
                console.log('Checking for existing users...');
                const response = await fetch('/src/models/data/users.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const users = await response.json();
                const hasUsers = Array.isArray(users) && users.length > 0;
                console.log('User check result:', hasUsers ? 'Users found' : 'No users found');
                return hasUsers;
            } catch (error) {
                console.error('Error checking existing users:', error);
                return false;
            }
        }
    };
    
    console.log('QE namespace and services initialized successfully');
} catch (error) {
    console.error('Failed to initialize QE namespace:', error);
    throw error;
}

// Export for module usage
export default window.QE;
