# QE-Demo Configuration System

This demo webapp demonstrates the Trusted Client-centric Application (TCA) Architecture using Small Data principles. It serves as a learning tool for exploring user needs and data engineering through a simplified interface.

## About Small Data & TCA

QE-Demo implements key concepts from Small Data architecture:
- Client-centric data management
- Simplified data engineering
- AI-ready architecture
- Enhanced user empowerment
- Streamlined development processes

The system uses four core primitives:
1. **Identity (KYC)**: NFT-based user profiles
2. **Attribution**: Relationship management across transactions
3. **Access**: Token-gated asset control
4. **Transactions**: System interactions and data flow

## Documentation

- [Coding Guidelines](documents/coding-guidelines.md)
- [Naming Conventions](documents/naming-conventions.md)
- [Architecture](documents/architecture-doc.md)
- [Project Structure](documents/tree.txt)

## Configuration Files

### 1. Environment Configuration (`config/env.json`)
Contains environment-specific application settings:
- SITE_STATE (dev/prod)
- Base URLs
- Path configurations
- Storage settings
- User templates

### 2. Client Configuration (`config/client.js`)
Frontend-specific settings:
- Feature flags
- Session storage configuration
- UI configurations
- Cache settings

## Core Components

### 1. Genesis Admin Flow
```
Genesis Admin → Platform Admin → User Admin
     ↓              ↓               ↓
  Creates       Manages Teams    Manages Users
```

### 2. Workspace Management
- Team organization
- User attribution
- Access control
- Transaction tracking

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

## Environment Variables

The following environment variables can be used to override configuration settings:

- `SITE_STATE`: Set the environment ('dev', 'prod')
- `AWS_URL`: Production deployment URL
- `DEV_URL`: Development server URL

## Use Cases

QE-Demo supports exploration of various scenarios:
- Team collaboration workflows
- Data access patterns
- User role management
- Administrative processes
- Workspace organization

## Important Notice

QE-Demo is a learning tool designed to explore:
- Small Data principles in practice
- TCA architecture implementation
- User interaction patterns
- Data engineering concepts
- Administrative workflows

**WARNING: This is NOT for production use. Do not use real data in this WebApp.**

The purpose is to:
- Learn about user requirements
- Understand Small Data architecture
- Practice implementing basic primitives
- Test interface design ideas
- Explore data engineering patterns

## Best Practices

1. Focus on learning and exploration
2. Use sample data only
3. Document user interaction patterns
4. Test different administrative flows
5. Experiment with workspace organization
6. Practice role-based access patterns
7. Explore data attribution methods
8. Test various team structures
9. Document successful patterns
10. Share learning outcomes

## Patent Information
TCA Architecture: Patent No.: US 9,069,626 B2

## Additional Information
For more details about Small Data and Unster platform capabilities, refer to the documentation directory.