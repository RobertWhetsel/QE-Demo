document.addEventListener('DOMContentLoaded', () => {
  const stateManager = StateManager.getInstance();
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.getElementById('errorMessage');
  const backBtn = document.getElementById('backBtn');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = ''; // Clear any previous errors

    try {
      const newUser = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        username: document.getElementById('username').value,
        cellPhone: document.getElementById('cellPhone').value,
        registrationDate: new Date().toISOString()
      };

      // Validate passwords match
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Remove confirmPassword as it's not needed in storage
      delete newUser.confirmPassword;

      // Check if this is the first user (Genesis Admin)
      const { users } = stateManager.getState();
      const isGenesisAdmin = users.length === 0;

      if (isGenesisAdmin) {
        newUser.role = 'Admin';
        stateManager.addUser(newUser);
        alert('Welcome! Thank you for Registering! You are the Genesis Admin.');
        window.location.href = 'adminDashboard.html';
      } else {
        newUser.role = null;
        stateManager.addPendingUser(newUser);
        alert('Registration successful! An admin will assign your role. Please check back later to log in.');
        window.location.href = 'index.html';
      }
    } catch (error) {
      errorMessage.textContent = error.message;
      console.error('Registration error:', error);
    }
  });

  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Form validation
  const validateForm = () => {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.querySelector('button[type="submit"]');
    
    if (password && confirmPassword && password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      submitBtn.disabled = true;
    } else {
      errorMessage.textContent = '';
      submitBtn.disabled = false;
    }
  };

  // Add real-time password validation
  document.getElementById('password').addEventListener('input', validateForm);
  document.getElementById('confirmPassword').addEventListener('input', validateForm);
});
