# QE-Demo Configuration System

This demo webapp uses a structured configuration system to manage different settings across environments. All configuration files are stored in the `config/` directory.

## Configuration Files

### 1. Environment Configuration (`config/env.json`)
Contains environment-specific application settings:
- Server port and environment
- Logging configuration
- CSV file paths
- Session settings
- Storage keys

```json
{
  "development": {
    "PORT": 8080,
    "ENABLE_LOGGING": true,
    "CSV_PATH": "src/models/data/users.csv",
    "STORAGE": {
      "TYPE": "session",
      "KEYS": {
        "USER_DATA": "appData",
        "AUTH": "isAuthenticated"
      }
    }
  }
}
```

### 2. Server Configuration (`config/server.py`)
Python-specific server configuration:
- Debug settings
- Session management
- CSV file handling
- Security configurations
- Testing configurations

```python
class DevelopmentConfig(Config):
    DEBUG = True
    CSV_FILE_PATH = "src/models/data/users.csv"
    CSV_HEADERS = ["username", "email", "password", "role", "created"]
```

### 3. Client Configuration (`config/client.js`)
Frontend-specific settings:
- Feature flags
- Session storage configuration
- CSV data structure
- UI configurations
- Cache settings

```javascript
const config = {
  development: {
    storage: {
      type: 'session',
      keys: {
        userData: 'appData',
        auth: 'isAuthenticated'
      }
    },
    csv: {
      path: 'src/models/data/users.csv',
      headers: ['username', 'email', 'password', 'role', 'created']
    }
  }
}
```

## Storage Architecture

This demo webapp uses a simple but effective storage approach:

1. **Session Storage**
   - Primary storage mechanism for temporary data
   - Handles user authentication state
   - Stores current user information
   - Clears on browser/tab close

2. **CSV File Storage**
   - Persistent storage for user data
   - Located at `src/models/data/users.csv`
   - Simple, readable format for demo purposes
   - Structured with consistent headers

## Usage

### Python Server
```python
from config.server import config

# Get environment-specific config
env = os.getenv('FLASK_ENV', 'development')
app_config = config[env]

# Apply configuration
app.config.from_object(app_config)

# Access CSV path
csv_path = app_config.CSV_FILE_PATH
```

### JavaScript Client
```javascript
import config from '../config/client.js';

// Use storage configuration
const storageType = config.storage.type;
const storage = storageType === 'session' ? sessionStorage : localStorage;

// Access CSV configuration
const csvHeaders = config.csv.headers;
```

## Environment Variables

The following environment variables can be used to override configuration settings:

- `FLASK_ENV`: Set the environment ('development', 'production', 'testing')
- `PORT`: Override the server port
- `SECRET_KEY`: Override session secret key
- `CSV_FILE_PATH`: Override the CSV file location

## Best Practices

1. Keep session storage data temporary and non-sensitive
2. Regularly clear old session data
3. Validate CSV data structure before reading/writing
4. Use appropriate error handling for storage operations
5. Keep CSV headers consistent across environments
6. Document storage key names and purposes
7. Clear session storage on logout
8. Handle storage quota limitations
9. Implement proper data validation
10. Use consistent date formats

## Security Considerations

1. Don't store sensitive data in session storage
2. Clear session data appropriately
3. Validate all data before storage
4. Use secure defaults
5. Implement proper access controls
6. Monitor storage usage
7. Handle storage errors gracefully
8. Protect CSV file access
9. Validate CSV data integrity
10. Implement proper session management

## Adding New Configuration

When adding new configuration options:

1. Add the option to the appropriate configuration file
2. Update storage keys if needed
3. Document the new option in this README
4. Test in all environments
5. Update related components

## Development Setup

1. Ensure proper CSV file permissions
2. Set up development environment variables
3. Initialize session storage structure
4. Test storage operations
5. Verify CSV file access
