# WebApp Coding Guidelines and Standards

## Core Architecture Principles

### MVC Architecture
1. **View Layer**
   - Must be minimal and component-based
   - Use modular components exclusively
   - Focus on presentation logic only
   - Follow BEM methodology for CSS structure
   - Implement simple, intuitive UX

2. **Controller Layer**
   - Contains all business logic
   - Manages interactions between View and Model
   - Handles user input validation
   - Implements application flow control
   - Maintains separation of concerns

3. **Model Layer**
   - Responsible for all data handling
   - Manages data validation and transformation
   - Implements data access patterns
   - Handles state management
   - Contains business entities and data structures

## Path Management

### paths.js Configuration
1. **Environment Configuration**
   ```javascript
   const SITE_STATE = {
       dev: 'dev',
       prod: 'prod'
   };
   ```

2. **Usage Requirements**
   - Must be the first import in any module
   - All path resolutions must use paths.js
   - Environment-specific paths must respect SITE_STATUS
   - Development environment uses port 5500 (Go Live server)
   - Production environment targets AWS deployment

## Development Standards

### Code Organization
1. **Modularity**
   - Each module must have a single responsibility
   - Components must be self-contained
   - Avoid circular dependencies
   - Maintain clear module boundaries
   - Use explicit imports/exports

2. **Variable Usage**
   - Always use meaningful variable names
   - Implement proper scoping
   - Use constants for fixed values
   - Follow established naming conventions
   - Document complex variable relationships

### Design Patterns
1. **Established Patterns**
   - Maintain existing design patterns
   - No modifications to working patterns
   - Document pattern usage
   - Ensure pattern consistency
   - Follow singleton pattern for paths.js

2. **BEM Methodology**
   - Block: Meaningful standalone entity
   - Element: Parts of a block (block__element)
   - Modifier: Flags on blocks or elements (block--modifier)
   - Maintain consistent naming
   - Document CSS structure

## File Management

### Structure Requirements
1. **Organization**
   - Maintain clear directory structure
   - Group related files together
   - Use consistent file naming
   - Document file relationships
   - Keep shallow directory nesting

2. **File Modifications**
   - No changes to working files
   - Document any necessary updates
   - Version control all changes
   - Maintain file history
   - Test before modification

## Best Practices

### Code Quality
1. **Simplicity**
   - Reduce complexity
   - Write self-documenting code
   - Implement clear logic flows
   - Avoid premature optimization
   - Keep functions focused

2. **Reusability**
   - Create reusable components
   - Implement shared utilities
   - Use consistent patterns
   - Document component usage
   - Maintain component independence

### Documentation
1. **Requirements**
   - Document all modules
   - Include usage examples
   - Maintain API documentation
   - Document dependencies
   - Keep documentation current

## Testing Standards
1. **Development Testing**
   - Test in development environment
   - Use Go Live server (port 5500)
   - Implement unit tests
   - Document test cases
   - Maintain test coverage

2. **Production Deployment**
   - Verify AWS compatibility
   - Test production builds
   - Document deployment process
   - Maintain deployment scripts
   - Version production releases

## Change Management
1. **Process**
   - Document proposed changes
   - Review impact analysis
   - Test modifications
   - Update documentation
   - Maintain change log

2. **Conventions**
   - Follow established naming
   - Maintain coding style
   - Use consistent formatting
   - Document deviations
   - Review regularly
