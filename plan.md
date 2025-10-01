# Settings Page Implementation Plan

## Overview
Implement a comprehensive settings page following modern mobile app patterns (ChatGPT-style) with responsive behavior for both desktop and mobile platforms.

**Scope Note**: Team Management features are included in the current implementation scope, not deferred to future enhancements.

## Design Approach

### Desktop Behavior
- **Location**: Expandable section in left sidebar (similar to ChatGPT desktop)
- **Trigger**: Click on user profile/account area in sidebar
- **Layout**: Inline expansion within sidebar with scrollable content
- **Width**: Constrained to sidebar width with proper overflow handling

### Mobile Behavior  
- **Location**: Full-screen drawer that slides up from bottom
- **Trigger**: Tap account/profile button in bottom navigation
- **Layout**: Full-screen modal with drawer animation
- **Navigation**: Native mobile patterns with back button

## Technical Implementation

### Component Structure

#### Frontend Components (Preact)
```
src/components/settings/
├── SettingsPage.tsx           # Main settings container
├── SettingsSection.tsx        # Reusable section component  
├── SettingsItem.tsx           # Individual setting row
├── pages/
│   ├── AccountPage.tsx        # Account/profile settings page
│   ├── NotificationsPage.tsx  # Notification preferences page
│   ├── SecurityPage.tsx       # Security settings page
│   ├── TeamPage.tsx           # Team management page
│   ├── PreferencesPage.tsx    # App preferences page
│   ├── LegalPage.tsx          # Legal/terms page
│   └── SupportPage.tsx        # Help/support page
└── hooks/
    ├── useSettingsData.ts     # Settings data management
    ├── useSettingsNavigation.ts # Navigation logic
    └── useUserProfile.ts      # User profile API calls
```

#### Worker API Routes
```
worker/routes/
├── user.ts                    # User profile management
├── preferences.ts             # User preferences
├── security.ts                # Security settings
└── files.ts                   # File uploads (extend existing)
```

### Settings Sections

#### ACCOUNT Section
- **Profile Information**
  - Name (editable text input)
  - Email (display only, read-only if OAuth)
  - Profile Image (upload/change with preview)
  - Bio/Description (optional textarea)

- **Contact Information** 
  - Primary Phone (text input with validation)
  - Secondary Phone (optional text input)
  - Address (structured form):
    - Street Address
    - City  
    - State/Province
    - ZIP/Postal Code
    - Country
  - Preferred Contact Method (radio: email/phone/sms)

- **Team & Organization**
  - Current Team (display with change option)
  - Role (display with change option)
  - Team Settings (navigation to team management)

- **Security**
  - Change Password (if email/password auth)
  - Two-Factor Authentication (toggle)
  - Connected Accounts (Google OAuth status)
  - Active Sessions (list with revoke option)
  - Account Deletion (danger action)

#### PREFERENCES Section
- **Appearance**
  - Theme (radio: Light/Dark/System)
  - Accent Color (color picker with presets)
  - Font Size (slider: Small/Medium/Large)

- **Notifications**
  - Email Notifications (toggle)
  - Push Notifications (toggle)
  - SMS Notifications (toggle)
  - Notification Frequency (dropdown)

- **Localization**
  - Language (dropdown with common options)
  - Time Zone (dropdown with search)
  - Date Format (radio: MM/DD/YYYY, DD/MM/YYYY)
  - Time Format (radio: 12-hour, 24-hour)

- **Chat Preferences**
  - Default Chat Mode (dropdown)
  - Auto-save Conversations (toggle)
  - Typing Indicators (toggle)

#### LEGAL Section
- **Privacy & Data**
  - Privacy Policy (navigation link)
  - Terms of Service (navigation link)
  - Data Export (action button)
  - Data Deletion (action button)
  - Cookie Preferences (navigation)

- **Compliance**
  - GDPR Settings (if applicable)
  - Data Retention (display current policy)

#### SUPPORT Section
- **Help & Resources**
  - Help Center (navigation link)
  - FAQ (navigation link)
  - Contact Support (action button)
  - Feature Requests (navigation link)

- **About**
  - App Version (display)
  - Build Number (display)
  - Release Notes (navigation link)
  - Open Source Licenses (navigation link)

### Database Schema Updates

```sql
-- Add new user profile fields
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN address_street TEXT;
ALTER TABLE users ADD COLUMN address_city TEXT;
ALTER TABLE users ADD COLUMN address_state TEXT;
ALTER TABLE users ADD COLUMN address_zip TEXT;
ALTER TABLE users ADD COLUMN address_country TEXT;
ALTER TABLE users ADD COLUMN secondary_phone TEXT;
ALTER TABLE users ADD COLUMN preferred_contact_method TEXT;

-- Add user preferences table
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  accent_color TEXT DEFAULT 'default',
  font_size TEXT DEFAULT 'medium',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12-hour',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  notification_frequency TEXT DEFAULT 'immediate',
  auto_save_conversations BOOLEAN DEFAULT true,
  typing_indicators BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Add index on user_id for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- IMPORTANT: updated_at column handling
-- The updated_at column above only sets a default value on INSERT, not on UPDATE.
-- Since this project uses Cloudflare D1 (SQLite), we'll use a database trigger.

-- Create trigger to auto-update updated_at on row changes
CREATE TRIGGER update_user_preferences_updated_at 
  AFTER UPDATE ON user_preferences
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
  BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
```

### API Architecture

#### Worker API Endpoints (`/api/*`)
**Data Operations - Handled by Cloudflare Worker:**

**Authentication & Authorization:**
- **Token Format**: Bearer token in Authorization header (`Authorization: Bearer <session_token>`)
- **Token Renewal**: Session tokens auto-renew on activity, expire after 30 days of inactivity
- **Error Responses**: 
  - `401 Unauthorized` - Invalid/missing token
  - `403 Forbidden` - Valid token but insufficient permissions
  - `429 Too Many Requests` - Rate limit exceeded

```typescript
// User profile management
PUT /api/user/profile          # Update user profile data - Auth: Session token, RBAC: Owner only
GET /api/user/profile          # Get user profile data - Auth: Session token, RBAC: Owner only

// User preferences  
PUT /api/user/preferences      # Update user preferences - Auth: Session token, RBAC: Owner only
GET /api/user/preferences      # Get user preferences - Auth: Session token, RBAC: Owner only

// Security settings
PUT /api/user/security         # Update security settings - Auth: Session token, RBAC: Owner only
GET /api/user/security         # Get security settings - Auth: Session token, RBAC: Owner only
DELETE /api/user/sessions/:id  # Revoke specific session - Auth: Session token, RBAC: Owner only

// File uploads
POST /api/user/upload-avatar   # Upload profile image - Auth: Session token, RBAC: Owner only
DELETE /api/user/avatar        # Delete profile image - Auth: Session token, RBAC: Owner only

// Data management
GET /api/user/export-data      # Export user data (GDPR) - Auth: Session token, RBAC: Owner only
DELETE /api/user/data          # Delete user data (GDPR) - Auth: Session token, RBAC: Owner only
```

#### Preact Frontend Routes (`/settings/*`)
**UI Pages - Handled by Preact Router:**

```typescript
// Settings pages
/settings                      # Main settings page
/settings/notifications        # Notification preferences
/settings/security             # Security settings
/settings/team                 # Team management
/settings/account              # Account details
/settings/preferences          # App preferences
/settings/legal                # Legal/terms
/settings/support              # Help/support
```

### Responsive Behavior

#### Desktop (≥768px)
- **Container**: Left sidebar expansion
- **Width**: 320px max-width within sidebar
- **Height**: Full sidebar height with scroll
- **Animation**: Smooth slide-in from left
- **Close**: Click outside, escape key, or back button

#### Mobile (<768px)  
- **Container**: Full-screen drawer
- **Width**: 100% viewport width
- **Height**: 90% viewport height with handle
- **Animation**: Slide up from bottom with spring
- **Close**: Swipe down, tap outside, or back button

### Settings Item Types

#### Display Items
```tsx
<SettingsItem
  icon={<EnvelopeIcon />}
  label="Email"
  value="user@example.com"
  type="display"
/>
```

#### Navigation Items
```tsx
<SettingsItem
  icon={<BellIcon />}
  label="Notifications"
  type="navigation"
  onClick={() => navigate('/settings/notifications')}
/>
```

#### Toggle Items
```tsx
<SettingsItem
  icon={<MoonIcon />}
  label="Dark Mode"
  type="toggle"
  value={isDarkMode}
  onChange={setIsDarkMode}
/>
```

#### Input Items
```tsx
<SettingsItem
  icon={<PhoneIcon />}
  label="Phone Number"
  type="input"
  value={phoneNumber}
  onChange={setPhoneNumber}
  placeholder="+1 (555) 123-4567"
/>
```

#### Action Items
```tsx
<SettingsItem
  icon={<ArrowRightOnRectangleIcon />}
  label="Sign Out"
  type="action"
  onClick={handleSignOut}
  variant="danger"
/>
```

### Integration Points

#### UserProfile Component Updates
```tsx
// Desktop: Expand settings in sidebar
const [showSettings, setShowSettings] = useState(false);

// Mobile: Navigate to full-screen settings
const handleSettingsClick = () => {
  if (isMobile) {
    navigate('/settings');
  } else {
    setShowSettings(!showSettings);
  }
};
```

#### Navigation Integration

**Preact Router Setup:**
```tsx
// In src/index.tsx - Add settings routes to existing router
<Router>
  <Route path="/auth" component={AuthPageWrapper} />
  <Route path="/settings" component={SettingsPage} />
  <Route path="/settings/notifications" component={NotificationsPage} />
  <Route path="/settings/security" component={SecurityPage} />
  <Route path="/settings/team" component={TeamSettingsPage} />
  <Route path="/settings/account" component={AccountPage} />
  <Route path="/settings/preferences" component={PreferencesPage} />
  <Route path="/settings/legal" component={LegalPage} />
  <Route path="/settings/support" component={SupportPage} />
  <Route default component={MainApp} />
</Router>
```

**Worker API Integration:**
```tsx
// In settings components - Call worker API endpoints
const updateProfile = async (profileData) => {
  try {
    // Get auth token from localStorage (or context/cookie as appropriate)
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    // Check if response is successful before parsing JSON
    if (!response.ok) {
      throw new Error(`Profile update failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Log the error with context for debugging
    console.error('Failed to update profile:', {
      error: error.message,
      profileData: profileData,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw the error so callers can handle it appropriately
    throw error;
  }
};
```

### Accessibility Features

- **Keyboard Navigation**: Full keyboard support with tab order
- **Screen Reader**: ARIA labels and descriptions for all interactive elements
- **Focus Management**: Proper focus handling for modals and drawers
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respect user's motion preferences

### Performance Considerations

- **Lazy Loading**: Load settings sections on demand
- **Optimistic Updates**: Update UI immediately, sync with server
- **Caching**: Cache user preferences and profile data
- **Debouncing**: Debounce input changes to reduce API calls
- **Image Optimization**: Compress and resize profile images

### Security Considerations

- **XSS Prevention**: Output encoding/escaping, input sanitization, use frameworks that auto-escape, Content Security Policy (e.g., `default-src 'self'; script-src 'self' 'unsafe-inline'`)
- **SQL Injection Prevention**: Use parameterized queries/prepared statements or ORM, avoid string concatenation for SQL, validate/limit DB-bound inputs
- **Input Validation**: Validate all user inputs on both client and server
- **PII Protection**: Sanitize logs and error messages
- **Rate Limiting**: Implement rate limiting for profile updates
- **CSRF Protection**: Include CSRF tokens for state-changing operations
- **Data Encryption**: Encrypt sensitive data in transit and at rest

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
**Frontend (Preact):**
- [ ] Create SettingsPage component with responsive behavior
- [ ] Implement SettingsSection and SettingsItem components
- [ ] Add settings routes to preact-iso router
- [ ] Create useSettingsData and useUserProfile hooks
- [ ] Integrate with existing UserProfile component

**Backend (Worker API):**
- [ ] Add database schema updates
- [ ] Create user.ts route handler for profile management
- [ ] Create preferences.ts route handler
- [ ] Add authentication middleware for user routes

**Testing & Quality Assurance:**
- [ ] Set up CI/CD pipeline with automated test runs on feature branches and PRs
- [ ] Write unit tests for SettingsPage, SettingsSection, and SettingsItem components
- [ ] Write unit tests for useSettingsData and useUserProfile hooks
- [ ] Create integration tests for new API routes (user.ts, preferences.ts)
- [ ] Set up test coverage targets (minimum 80% for new code)
- [ ] Add database migration tests for schema updates
- [ ] Implement automated accessibility testing for new components

### Phase 2: Account Settings (Week 2)
**Frontend (Preact):**
- [ ] Create AccountPage component
- [ ] Profile information editing form
- [ ] Contact information form with validation
- [ ] Address form component
- [ ] Profile image upload UI

**Backend (Worker API):**
- [ ] Implement PUT /api/user/profile endpoint
- [ ] Add profile image upload to files.ts
- [ ] Add input validation and sanitization
- [ ] Implement error handling and responses

**Testing & Quality Assurance:**
- [ ] Write unit tests for AccountPage component and form validation logic
- [ ] Create integration tests for frontend-backend API contracts (PUT /api/user/profile)
- [ ] Test form validation with various input scenarios (valid/invalid data)
- [ ] Write tests for profile image upload functionality and error handling
- [ ] Add automated UI tests for form interactions and user flows
- [ ] Test responsive behavior of account settings on mobile and desktop
- [ ] Validate input sanitization and XSS prevention measures

### Phase 3: Preferences (Week 3)
**Frontend (Preact):**
- [ ] Create PreferencesPage component
- [ ] Theme and appearance settings UI
- [ ] Notification preferences form
- [ ] Localization settings dropdowns
- [ ] Chat preferences toggles

**Backend (Worker API):**
- [ ] Implement PUT /api/user/preferences endpoint
- [ ] Add preferences validation
- [ ] Implement persistence and synchronization
- [ ] Add caching for preferences

**Testing & Quality Assurance:**
- [ ] Write unit tests for PreferencesPage component and all preference controls
- [ ] Test theme switching functionality and persistence across sessions
- [ ] Create accessibility tests for all preference controls (keyboard navigation, screen readers)
- [ ] Write integration tests for preferences API endpoint and data persistence
- [ ] Test notification preference changes and their real-time effects
- [ ] Add automated UI tests for dropdown interactions and toggle behaviors
- [ ] Validate localization settings and timezone handling
- [ ] Test preference caching and synchronization across devices

### Phase 4: Security & Advanced (Week 4)
**Frontend (Preact):**
- [ ] Create SecurityPage component
- [ ] Session management UI
- [ ] Two-factor authentication setup
- [ ] Data export/deletion interfaces
- [ ] Legal and support pages

**Backend (Worker API):**
- [ ] Create security.ts route handler
- [ ] Implement session management endpoints
- [ ] Add two-factor authentication support
- [ ] Implement data export/deletion (GDPR)
- [ ] Add security audit logging

**Testing & Quality Assurance:**
- [ ] Write unit tests for SecurityPage component and session management UI
- [ ] Conduct security testing and penetration testing for all new endpoints
- [ ] Test two-factor authentication flow and security measures
- [ ] Write integration tests for session management and token handling
- [ ] Test data export/deletion functionality and GDPR compliance
- [ ] Validate security audit logging and monitoring
- [ ] Perform input validation testing for security vulnerabilities
- [ ] Test rate limiting and CSRF protection mechanisms
- [ ] Conduct automated security scanning of API endpoints

### Phase 5: Final Integration & Performance (Week 5)
**Frontend (Preact):**
- [ ] Accessibility improvements and final accessibility audit
- [ ] Mobile UX polish and cross-device testing
- [ ] Error handling refinement and user experience optimization
- [ ] Performance optimization and bundle size analysis

**Backend (Worker API):**
- [ ] End-to-end integration testing across all settings features
- [ ] Performance optimization and load testing
- [ ] Final security validation and penetration testing
- [ ] Documentation completion and API documentation

**Testing & Quality Assurance:**
- [ ] Comprehensive end-to-end testing of complete settings workflow
- [ ] Performance testing and optimization validation
- [ ] Cross-browser and cross-device compatibility testing
- [ ] Final test coverage analysis and gap identification
- [ ] User acceptance testing and feedback incorporation
- [ ] Production readiness assessment and deployment validation

## Continuous Test Automation

### CI/CD Pipeline Integration
**Automated Test Execution:**
- **Feature Branches**: All tests run automatically on every push to feature branches
- **Pull Requests**: Full test suite executes before PR merge approval
- **Main Branch**: Comprehensive testing including integration and performance tests
- **Test Failures**: Block merge/deployment until all tests pass

**Test Coverage Requirements:**
- **Minimum Coverage**: 80% code coverage for all new code
- **Coverage Reporting**: Automated coverage reports generated for each PR
- **Coverage Trends**: Track coverage trends over time to prevent regression
- **Critical Paths**: 100% coverage required for authentication, security, and data handling

**Test Types by Environment:**
- **Unit Tests**: Run on every commit (fast feedback loop)
- **Integration Tests**: Run on PR creation and main branch updates
- **E2E Tests**: Run on main branch and before production deployments
- **Security Tests**: Run on PR creation and scheduled daily scans
- **Performance Tests**: Run on main branch and before major releases

**Quality Gates:**
- **Code Quality**: ESLint, TypeScript compilation, and code formatting checks
- **Security**: Automated vulnerability scanning and dependency checks
- **Accessibility**: Automated accessibility testing with axe-core
- **Performance**: Bundle size analysis and performance regression detection

## Success Metrics

- **User Engagement**: Settings page usage and completion rates
- **Performance**: Page load times and interaction responsiveness  
- **Accessibility**: Screen reader compatibility and keyboard navigation
- **Mobile Experience**: Touch interaction quality and gesture support
- **Data Quality**: Profile completion rates and data accuracy

## Future Enhancements

- **Advanced Profile Customization**: Custom themes, layouts
- **Integration Settings**: Third-party service connections
- **Analytics Dashboard**: User activity and usage insights
- **Bulk Operations**: Mass data import/export capabilities
