const config = {
  development: {
    features: {
      enableAnalytics: false,
      enableNotifications: true,
      darkModeDefault: false,
      debugMode: true
    },
    storage: {
      type: 'session',
      keys: {
        userData: 'appData',
        auth: 'isAuthenticated',
        userRole: 'userRole',
        username: 'username'
      }
    },
    csv: {
      path: 'src/models/data/users.csv',
      headers: ['username', 'email', 'password', 'role', 'created']
    },
    ui: {
      maxItemsPerPage: 20,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      defaultTheme: 'light',
      toastDuration: 3000
    },
    cache: {
      maxAge: 3600, // 1 hour
      enabled: true
    }
  },
  production: {
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      darkModeDefault: false,
      debugMode: false
    },
    storage: {
      type: 'session',
      keys: {
        userData: 'appData',
        auth: 'isAuthenticated',
        userRole: 'userRole',
        username: 'username'
      }
    },
    csv: {
      path: 'src/models/data/users.csv',
      headers: ['username', 'email', 'password', 'role', 'created']
    },
    ui: {
      maxItemsPerPage: 20,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      defaultTheme: 'light',
      toastDuration: 3000
    },
    cache: {
      maxAge: 3600,
      enabled: true
    }
  }
};

// Export the configuration based on environment
const env = process.env.NODE_ENV || 'development';
export default config[env];