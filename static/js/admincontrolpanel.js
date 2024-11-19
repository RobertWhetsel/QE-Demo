// Global error handler
window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', { msg, url, line, col, error });
    return false;
};

// Function to display data from CSV
async function displayData() {
    const dataService = DataService.getInstance();
    const data = await dataService.getData();
    console.log('Current data:', data); // Debug log
    
    const container = document.getElementById('admin-list-container');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-data-message">No data available.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'data-list';
    
    // Create table header
    const thead = document.createElement('thead');
    const headers = ['ID', 'Username', 'Email', 'Type', 'Created'];
    thead.innerHTML = `
        <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.name}</td>
            <td>${row.email}</td>
            <td>${row.type}</td>
            <td>${new Date(row.created).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    container.innerHTML = '';
    container.appendChild(table);
}

// Function to handle form submission
async function handleFormSubmit(event) {
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('Form submission handler called'); // Debug log
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        console.log('Form values:', { username, email, role }); // Debug log
        
        // Validate required fields
        if (!username || !email || !password || !role) {
            throw new Error('All fields are required');
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        const formData = {
            id: Date.now().toString(),
            name: username,
            email: email,
            password: password,
            type: role,
            created: new Date().toISOString()
        };

        console.log('Form data:', { ...formData, password: '***' }); // Debug log
        
        const dataService = DataService.getInstance();
        console.log('DataService instance:', dataService); // Debug log
        
        // Check for existing user
        const existingData = await dataService.getData();
        if (existingData.some(user => user.name === username)) {
            throw new Error('Username already exists');
        }
        
        // Add new record using DataService
        console.log('Attempting to add record'); // Debug log
        if (await dataService.addRecord(formData)) {
            console.log('Record saved successfully'); // Debug log
            
            // Show success message
            showMessage('Admin user created successfully!', 'success');
            
            // Reset form
            document.getElementById('admin-creation-form').reset();
            
            // Refresh data display
            await displayData();
        } else {
            throw new Error('Failed to save record');
        }
        
    } catch (error) {
        console.error('Error creating record:', error); // Debug log
        showMessage(error.message, 'error');
    }
    
    return false;
}

// Helper function to show messages
function showMessage(message, type = 'info') {
    console.log('Showing message:', { message, type }); // Debug log
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 4px;
        animation: slideIn 0.3s ease-out;
        z-index: 1000;
        background-color: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Initialize when page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing...'); // Debug log
    
    try {
        // Verify Genesis Admin authentication
        if (sessionStorage.getItem('userRole') !== 'genesis' || 
            sessionStorage.getItem('isAuthenticated') !== 'true') {
            window.location.href = 'login.html';
            return;
        }

        // Setup form submit handler
        const form = document.getElementById('admin-creation-form');
        console.log('Form element:', form); // Debug log
        
        if (form) {
            // Handle form submit event
            form.onsubmit = handleFormSubmit;
            
            // Also handle submit button click directly
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                console.log('Submit button found:', submitBtn); // Debug log
                submitBtn.addEventListener('click', (e) => {
                    console.log('Submit button clicked'); // Debug log
                    handleFormSubmit(e);
                });
            }
        }

        // Display initial data
        displayData();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
