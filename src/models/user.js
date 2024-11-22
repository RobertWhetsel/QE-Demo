// User class definition
class User {
    constructor(data = {}) {
        // Basic user information with improved validation
        this.username = this.validateUsername(data.username) || '';
        this.fullName = this.validateFullName(data.fullName) || '';
        this.email = this.validateEmail(data.email) || '';
        this.phoneNumber = this.validatePhoneNumber(data.phoneNumber) || '';
        this.role = this.validateRole(data.role) || '';
        this.status = this.validateStatus(data.status) || 'active';
        this.created = data.created || new Date().toISOString();
        this.password = data.password;
        
        // Enhanced default preferences with more options
        this.preferences = {
            // Theme settings
            theme: data.preferences?.theme || 'light',
            fontFamily: data.preferences?.fontFamily || 'Arial',
            fontSize: data.preferences?.fontSize || 'medium',
            highContrast: data.preferences?.highContrast || false,
            
            // Notification preferences
            notifications: data.preferences?.notifications || false,
            emailNotifications: data.preferences?.emailNotifications || false,
            smsNotifications: data.preferences?.smsNotifications || false,
            notificationEmail: data.preferences?.notificationEmail || this.email,
            notificationPhone: data.preferences?.notificationPhone || this.phoneNumber,
            
            // Display preferences
            language: data.preferences?.language || 'en',
            timezone: data.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateFormat: data.preferences?.dateFormat || 'MM/DD/YYYY',
            timeFormat: data.preferences?.timeFormat || '12h',
            
            // Accessibility preferences
            screenReader: data.preferences?.screenReader || false,
            motionReduced: data.preferences?.motionReduced || false,
            
            // Privacy settings
            showEmail: data.preferences?.showEmail || false,
            showPhone: data.preferences?.showPhone || false
        };
    }

    // Instance validation methods
    validateUsername(username) {
        if (!username) return '';
        return username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }

    validateFullName(name) {
        if (!name) return '';
        return name.replace(/[^a-zA-Z\s-']/g, '').trim();
    }

    validateEmail(email) {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? email.toLowerCase() : '';
    }

    validatePhoneNumber(phone) {
        if (!phone) return '';
        return phone.replace(/[^0-9-+]/g, '');
    }

    validateRole(role) {
        const validRoles = ['Genesis Admin', 'Platform Admin', 'User Admin', 'User', 'Guest'];
        return validRoles.includes(role) ? role : '';
    }

    validateStatus(status) {
        const validStatuses = ['active', 'pending', 'disabled'];
        return validStatuses.includes(status) ? status : 'active';
    }
}

// Static methods
User.getCurrentUser = function() {
    try {
        console.log('Getting current user from session storage');
        const userData = sessionStorage.getItem('currentUser');
        if (!userData) {
            console.log('No user data found in session storage');
            return null;
        }

        console.log('Parsing current user data from session storage');
        const parsedUser = JSON.parse(userData);
        console.log('Current user data parsed:', {
            username: parsedUser.username,
            role: parsedUser.role,
            status: parsedUser.status
        });

        return new User(parsedUser);
    } catch (error) {
        console.error('Error getting current user:', error);
        console.error('Session storage state:', {
            currentUser: sessionStorage.getItem('currentUser'),
            isAuthenticated: sessionStorage.getItem('isAuthenticated'),
            userRole: sessionStorage.getItem('userRole')
        });
        return null;
    }
};

User.getUserPreferences = function() {
    console.log('Getting user preferences');
    const user = this.getCurrentUser();
    if (user) {
        console.log('User preferences found:', user.preferences);
        return user.preferences;
    }
    console.log('No user preferences found');
    return null;
};

User.updateUserPreferences = function(preferences) {
    console.log('Updating user preferences:', preferences);
    const username = sessionStorage.getItem('username');
    if (!username) {
        console.warn('Cannot update preferences: no username in session');
        return false;
    }

    const users = this.loadUsersFromCSV();
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex !== -1) {
        users[userIndex].preferences = {
            ...users[userIndex].preferences,
            ...preferences
        };
        
        console.log('Saving updated preferences to storage');
        this.saveUsers(users);
        
        // Update current user in session
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            currentUser.preferences = {
                ...currentUser.preferences,
                ...preferences
            };
            console.log('Updating current user in session storage with new preferences');
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return true;
    }
    console.warn('User not found for preference update:', username);
    return false;
};

User.parseCSVLine = function(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                // Handle escaped quotes
                currentValue += '"';
                i++;
            } else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of field
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    return values;
};

User.loadUsersFromCSV = function() {
    try {
        console.log('Loading users from storage...');
        const csvContent = localStorage.getItem('users_csv');
        const jsonContent = localStorage.getItem('users_json');
        
        // Try to load from JSON first for consistency
        if (jsonContent) {
            try {
                const users = JSON.parse(jsonContent);
                console.log('Loaded users from JSON storage');
                return users;
            } catch (error) {
                console.warn('Failed to parse JSON content, falling back to CSV');
            }
        }
        
        // If no CSV data exists, initialize with default users
        if (!csvContent) {
            console.log('No CSV data found, initializing with default users');
            const defaultUsers = this.getDefaultUsers();
            this.saveUsers(defaultUsers);
            return defaultUsers;
        }

        // Parse CSV content
        console.log('Parsing CSV content...');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            console.warn('Invalid CSV format: missing header or data');
            return this.getDefaultUsers();
        }

        // Parse headers
        const headers = this.parseCSVLine(lines[0]);
        console.log('CSV Headers:', headers);

        if (!this.validateCSVHeaders(headers)) {
            console.warn('Invalid CSV format: missing required headers');
            return this.getDefaultUsers();
        }

        // Parse user data
        const users = lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            if (values.length !== headers.length) {
                console.warn('Malformed CSV row:', line);
                return null;
            }

            const user = {};
            headers.forEach((header, index) => {
                user[header.trim()] = values[index];
            });

            // Add default preferences if not present
            if (!user.preferences) {
                user.preferences = {
                    theme: 'light',
                    fontFamily: 'Arial',
                    notifications: false,
                    emailNotifications: false,
                    language: 'en',
                    showEmail: false,
                    showPhone: false
                };
            }

            return user;
        }).filter(user => user !== null);

        // Ensure Genesis Admin exists
        const hasGenesisAdmin = users.some(user => 
            user.role === 'Genesis Admin' && 
            user.status === 'active'
        );

        if (!hasGenesisAdmin) {
            console.log('No active Genesis Admin found, adding default Genesis Admin');
            users.push(this.getDefaultGenesisAdmin());
        }

        // Save in both formats for consistency
        this.saveUsers(users);

        console.log('Successfully loaded users:', users.length);
        return users;
    } catch (error) {
        console.error('Error loading users:', error);
        return this.getDefaultUsers();
    }
};

User.validateCSVHeaders = function(headers) {
    const requiredHeaders = ['username', 'fullName', 'email', 'role', 'status', 'created', 'password'];
    const hasAllRequired = requiredHeaders.every(header => headers.includes(header));
    console.log('CSV headers validation:', { headers, hasAllRequired });
    return hasAllRequired;
};

User.getDefaultGenesisAdmin = function() {
    return {
        username: 'genesis',
        fullName: 'Genesis Administrator',
        email: 'genesis.admin@system.local',
        phoneNumber: '',
        role: 'Genesis Admin',
        status: 'active',
        created: new Date().toISOString(),
        password: 'changeme_immediately',
        preferences: {
            theme: 'light',
            fontFamily: 'Arial',
            notifications: true,
            emailNotifications: true,
            language: 'en',
            showEmail: false,
            showPhone: false
        }
    };
};

User.getDefaultUsers = function() {
    return [this.getDefaultGenesisAdmin()];
};

User.saveUsers = function(users) {
    try {
        console.log('Saving users to storage...');
        
        // Save as JSON for consistent data structure
        localStorage.setItem('users_json', JSON.stringify(users));
        
        // Also save as CSV for compatibility
        const headers = ['username', 'fullName', 'email', 'phoneNumber', 'role', 'status', 'created', 'password'];
        const rows = users.map(user => 
            headers.map(header => {
                const value = (user[header] || '').toString();
                // Escape quotes and wrap in quotes if contains comma or quote
                return value.includes(',') || value.includes('"') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : value;
            }).join(',')
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        localStorage.setItem('users_csv', csvContent);
        
        console.log('Users saved successfully in both JSON and CSV formats');

        // Dispatch event to notify of user data change
        document.dispatchEvent(new CustomEvent('userDataUpdated', {
            detail: { users }
        }));
    } catch (error) {
        console.error('Error saving users:', error);
        throw error;
    }
};

User.login = function(username, password) {
    try {
        console.log('Starting login process for:', username);
        console.log('Initial session state:', {
            isAuthenticated: sessionStorage.getItem('isAuthenticated'),
            hasCurrentUser: !!sessionStorage.getItem('currentUser'),
            userRole: sessionStorage.getItem('userRole')
        });
        
        // Clear any existing session data
        sessionStorage.clear();
        console.log('Session storage cleared');
        
        // Load and validate users
        const users = this.loadUsersFromCSV();
        if (!users || users.length === 0) {
            console.error('No users found in system');
            return null;
        }
        console.log('Users loaded from storage, count:', users.length);

        // Find matching user with strict status check
        const userData = users.find(user => 
            user.username === username && 
            user.password === password && 
            user.status === 'active' // Only active users can log in
        );

        if (!userData) {
            console.log('Login failed: Invalid credentials or inactive account');
            return null;
        }

        console.log('User found:', {
            username: userData.username,
            role: userData.role,
            status: userData.status
        });

        try {
            // Create user instance to validate data
            const user = new User(userData);
            console.log('User instance created successfully');

            // Validate critical fields
            if (!user.username || !user.role) {
                console.error('Invalid user data: missing required fields');
                return null;
            }

            // Set session data atomically
            const sessionData = {
                isAuthenticated: 'true',
                userRole: user.role,
                username: user.username,
                fullName: user.fullName,
                currentUser: JSON.stringify(user)
            };

            console.log('Setting session data:', sessionData);

            // Update session storage
            Object.entries(sessionData).forEach(([key, value]) => {
                sessionStorage.setItem(key, value);
                console.log(`Session storage set: ${key}`);
            });

            // Verify session data was set correctly
            const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
            const storedUsername = sessionStorage.getItem('username') === user.username;
            const storedRole = sessionStorage.getItem('userRole') === user.role;

            console.log('Session verification:', {
                isAuthenticated,
                storedUsername,
                storedRole,
                sessionKeys: Object.keys(sessionStorage)
            });

            if (!isAuthenticated || !storedUsername || !storedRole) {
                console.error('Session data verification failed');
                sessionStorage.clear();
                return null;
            }

            console.log('Login successful, session established');
            return user;
        } catch (error) {
            console.error('Error creating user instance:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            sessionStorage.clear();
            return null;
        }
    } catch (error) {
        console.error('Error during login:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        sessionStorage.clear();
        return null;
    }
};

User.createUser = function(userData) {
    try {
        const users = this.loadUsersFromCSV();
        
        if (users.some(user => user.username === userData.username)) {
            throw new Error('Username already exists');
        }

        if (users.some(user => user.email === userData.email)) {
            throw new Error('Email already exists');
        }

        const newUser = new User({
            ...userData,
            created: new Date().toISOString(),
            status: 'active'
        });

        users.push(newUser);
        this.saveUsers(users);

        return newUser;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

User.updateUser = function(username, updates) {
    try {
        const users = this.loadUsersFromCSV();
        const userIndex = users.findIndex(user => user.username === username);
        
        if (userIndex !== -1) {
            // Prevent modification of critical fields
            const protectedFields = ['username', 'role', 'created'];
            const sanitizedUpdates = { ...updates };
            protectedFields.forEach(field => delete sanitizedUpdates[field]);

            users[userIndex] = {
                ...users[userIndex],
                ...sanitizedUpdates
            };

            this.saveUsers(users);

            if (username === sessionStorage.getItem('username')) {
                if (updates.fullName) sessionStorage.setItem('fullName', updates.fullName);
                sessionStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
};

User.isAuthenticated = function() {
    const isAuth = sessionStorage.getItem('isAuthenticated') === 'true';
    console.log('Checking authentication:', {
        isAuthenticated: isAuth,
        sessionKeys: Object.keys(sessionStorage)
    });
    return isAuth;
};

User.getCurrentUserRole = function() {
    const role = sessionStorage.getItem('userRole');
    console.log('Getting current user role:', role);
    return role;
};

User.logout = function() {
    console.log('Logging out user');
    console.log('Session state before logout:', {
        isAuthenticated: sessionStorage.getItem('isAuthenticated'),
        username: sessionStorage.getItem('username'),
        userRole: sessionStorage.getItem('userRole')
    });
    sessionStorage.clear();
    console.log('Session cleared, redirecting to login');
    window.location.href = '/src/views/pages/login.html';
};

User.exitApplication = function() {
    console.log('Exiting application');
    sessionStorage.clear();
    localStorage.removeItem('users_csv');
    localStorage.removeItem('users_json');
    window.location.href = '/src/views/pages/login.html';
};

// Export the User class
export { User };
