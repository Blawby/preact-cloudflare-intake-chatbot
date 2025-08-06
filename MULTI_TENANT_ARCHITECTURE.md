# Multi-Tenant Team Management Architecture

## Overview

This application has been refactored to support a true multi-tenant architecture where teams are managed dynamically through a database rather than static configuration files.

## Architecture Components

### 1. TeamService (`worker/services/TeamService.ts`)
- **Purpose**: Central service for team management operations
- **Features**:
  - CRUD operations for teams
  - Caching with 5-minute TTL
  - Database persistence
  - Team configuration management

### 2. Team API (`worker/routes/teams.ts`)
- **Endpoints**:
  - `GET /api/teams` - List all teams
  - `GET /api/teams/{id}` - Get specific team
  - `POST /api/teams` - Create new team
  - `PUT /api/teams/{id}` - Update team
  - `DELETE /api/teams/{id}` - Delete team

### 3. Database Schema
Teams are stored in the `teams` table with the following structure:
```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  config JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Team Configuration Structure

Each team has a comprehensive configuration:

```typescript
interface TeamConfig {
  aiModel?: string;                    // AI model to use
  consultationFee?: number;            // Consultation fee in dollars
  requiresPayment?: boolean;           // Whether payment is required
  ownerEmail?: string;                 // Team owner email
  availableServices?: string[];        // Available legal services
  serviceQuestions?: Record<string, string[]>; // Service-specific questions
  jurisdiction?: {
    type: 'state' | 'national';
    description: string;
    supportedStates: string[];
    supportedCountries: string[];
    primaryState?: string;
  };
  domain?: string;                     // Custom domain
  description?: string;                // Team description
  paymentLink?: string;                // Fallback payment link
  brandColor?: string;                 // Brand color
  accentColor?: string;                // Accent color
  introMessage?: string;               // Welcome message
  profileImage?: string;               // Team profile image
  webhooks?: {
    enabled: boolean;
    url: string;
    secret: string;
    events: {
      matterCreation: boolean;
      matterDetails: boolean;
      contactForm: boolean;
      appointment: boolean;
    };
    retryConfig: {
      maxRetries: number;
      retryDelay: number;
    };
  };
}
```

## Migration from Static Configuration

### Step 1: Seed Teams from teams.json
```bash
# Call the debug endpoint to seed teams
curl -X POST https://your-worker.workers.dev/api/debug/seed-teams
```

### Step 2: Verify Teams
```bash
# List all teams
curl https://your-worker.workers.dev/api/debug/teams
```

### Step 3: Update Application Code
The application now uses `TeamService` instead of static file loading:

```typescript
// Old way (static)
import teams from './teams.json';

// New way (dynamic)
const teamService = new TeamService(env);
const team = await teamService.getTeam(teamId);
const config = await teamService.getTeamConfig(teamId);
```

## API Usage Examples

### Create a New Team
```bash
curl -X POST https://your-worker.workers.dev/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "new-law-firm",
    "name": "New Law Firm",
    "config": {
      "aiModel": "llama",
      "consultationFee": 100,
      "requiresPayment": true,
      "ownerEmail": "lawyer@newlawfirm.com",
      "availableServices": ["Family Law", "Criminal Law"],
      "domain": "newlawfirm.blawby.com",
      "description": "Expert legal services",
      "brandColor": "#2563eb",
      "accentColor": "#3b82f6",
      "introMessage": "Welcome to New Law Firm!"
    }
  }'
```

### Update Team Configuration
```bash
curl -X PUT https://your-worker.workers.dev/api/teams/01jq70jnstyfzevc6423czh50e \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "consultationFee": 150,
      "availableServices": ["Family Law", "Criminal Law", "Employment Law"]
    }
  }'
```

### Get Team Information
```bash
curl https://your-worker.workers.dev/api/teams/01jq70jnstyfzevc6423czh50e
```

## Benefits of Multi-Tenant Architecture

### 1. **Scalability**
- Teams can be created dynamically without code changes
- No need to redeploy for new teams
- Database-driven configuration

### 2. **Flexibility**
- Each team can have unique configurations
- Real-time configuration updates
- Custom domains and branding

### 3. **Maintainability**
- Centralized team management
- Consistent API for all team operations
- Caching for performance

### 4. **Security**
- Team isolation through database queries
- Proper access control per team
- Secure configuration storage

## Security Considerations

### 1. **Team Isolation**
- Each team's data is isolated in the database
- API tokens are validated per team
- No cross-team data leakage

### 2. **Access Control**
- Team-specific API tokens
- Role-based access control
- Audit logging for team operations

### 3. **Configuration Security**
- Sensitive configuration stored as secrets
- Webhook secrets properly managed
- Environment-specific configurations

## Deployment Checklist

1. ✅ **Database Migration**: Ensure teams table exists
2. ✅ **Seed Teams**: Run team seeding from teams.json
3. ✅ **Verify Teams**: Check that all teams are accessible
4. ✅ **Update Environment**: Set proper API tokens
5. ✅ **Test Multi-Tenant**: Verify team isolation works
6. ✅ **Monitor Performance**: Check caching and database performance

## Future Enhancements

### 1. **Team Management UI**
- Web interface for team management
- Real-time configuration updates
- Team analytics dashboard

### 2. **Advanced Features**
- Team-specific AI models
- Custom payment processing
- Advanced webhook configurations

### 3. **Scaling Features**
- Team-specific rate limiting
- Advanced caching strategies
- Database sharding for large deployments

## Troubleshooting

### Common Issues

1. **Team Not Found**
   - Check if team exists in database
   - Verify team ID/slug is correct
   - Run team seeding if needed

2. **Configuration Issues**
   - Validate team configuration structure
   - Check required fields are present
   - Verify JSON format

3. **Performance Issues**
   - Check cache hit rates
   - Monitor database query performance
   - Consider increasing cache TTL

### Debug Endpoints

- `GET /api/debug` - Environment information
- `GET /api/debug/teams` - List all teams
- `POST /api/debug/seed-teams` - Seed teams from teams.json 