// Registration Service implementation
const RegistrationService = {
  saveUserData(userData) {
    const dataService = DataService.getInstance();
    let isGenesisAdmin = false;

    try {
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        throw new Error('Missing required registration fields');
      }

      const data = dataService.getData();
      
      // Check if this is the first user (Genesis Admin)
      if (data.users.length === 0) {
        userData.role = 'Admin';
        isGenesisAdmin = true;
        dataService.addUser(userData);
      } else {
        userData.role = null;
        dataService.addPendingUser(userData);
      }

      return isGenesisAdmin;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  loadRegistrationLog() {
    try {
      const dataService = DataService.getInstance();
      const data = dataService.getData();
      return data.users.map(user => ({
        username: user.username,
        registrationDate: user.registrationDate,
        role: user.role
      }));
    } catch (error) {
      console.error('Error loading registration log:', error);
      return [];
    }
  }
};

// Export as global variable
window.RegistrationService = RegistrationService;
