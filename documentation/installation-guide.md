# QE-Demo Installation Guide

## Prerequisites

1. Visual Studio Code (recommended)
2. Live Server extension for VS Code
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Live Server"
   - Install "Live Server" by Ritwick Dey

## Installation Steps

1. **Clone or Download Repository**
   ```bash
   git clone [repository-url]
   # or download and extract the ZIP file
   ```

2. **Configure Environment**
   - Navigate to `config/env.json`
   - Set your environment variables:
   ```json
   {
       "SITE_STATE": "dev",
       "AWS_URL": "${AWS_URL}", 
       "DEV_URL": "http://127.0.0.1:5500"
   }
   ```

3. **File Structure Verification**
   Ensure you have all required directories:
   ```
   QE-Demo/
   ├── config/
   │   ├── env.json
   │   ├── client.config.js
   │   └── paths.config.js
   ├── src/
   │   ├── views/
   │   ├── styles/
   │   └── models/
   └── assets/
   ```

## Starting the Development Server

1. **Using VS Code Live Server**
   - Open VS Code
   - Open the QE-Demo folder
   - Right-click on `index.html`
   - Select "Open with Live Server"
   - Server will start on port 5500

2. **Verify Installation**
   - Open browser to `http://127.0.0.1:5500`
   - You should see the welcome page
   - Check browser console for any errors

## Initial Setup

1. **First Run**
   - Click "Begin Login Process"
   - System will check for existing users
   - You'll be directed to create a Genesis Admin account

2. **Genesis Admin Account**
   Default credentials are provided in env.json:
   ```json
   {
       "username": "genesis",
       "email": "genesis@quantumeye.com",
       "password": "GenesisAdmin123!"
   }
   ```

## Troubleshooting

1. **Port Conflicts**
   - If port 5500 is in use:
     - Close other Live Server instances
     - Change port in VS Code Live Server settings

2. **Loading Issues**
   - Check browser console for errors
   - Verify file paths in env.json
   - Ensure all files are in correct locations

3. **Common Problems**
   - 404 errors: Check file paths
   - Script errors: Check browser console
   - Loading sequence: Verify `index.html` structure

## Development Notes

1. **Browser Support**
   - Use modern browsers (Chrome, Firefox, Edge)
   - Enable JavaScript
   - Clear cache if experiencing issues

2. **File Watching**
   - Live Server automatically reloads on changes
   - Some changes may require manual refresh

## Important Reminders

1. **Development Only**
   - This is a learning tool
   - Do not use real data
   - For development and testing only

2. **Data Storage**
   - Uses session storage
   - CSV file storage for persistence
   - Clear data regularly

## Next Steps

1. Create Genesis Admin account
2. Explore user management
3. Test team creation
4. Practice workspace organization
5. Document learning outcomes

## Support

For issues or questions:
1. Check documentation
2. Review browser console
3. Verify configuration
4. Start fresh if needed

Remember: QE-Demo is a learning tool focused on understanding user needs and testing interface designs. It is not intended for production use.