# Settings Page Implementation Plan

## Overview
Implement a comprehensive settings page following modern mobile app patterns (ChatGPT-style) with responsive behavior for both desktop and mobile platforms.

**Current Status**: Core settings components have been created and test credentials are configured for frontend testing. The project uses Better Auth with Drizzle schema and extends the user model using Better Auth's `additionalFields` option rather than building custom schema.

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

#### Frontend Components (Preact) - **COMPLETED**
```text
src/components/settings/
├── SettingsPage.tsx           # ✅ Main settings container (COMPLETED)
├── SettingsSection.tsx        # ✅ Reusable section component (COMPLETED)
├── SettingsItem.tsx           # ✅ Individual setting row (COMPLETED)
├── pages/
│   ├── AccountPage.tsx        # ✅ Account/profile settings page (COMPLETED)
│   ├── NotificationsPage.tsx  # ❌ Notification preferences page (PENDING)
│   ├── SecurityPage.tsx       # ❌ Security settings page (PENDING)
│   ├── TeamPage.tsx           # ❌ Team management page (PENDING)
│   ├── PreferencesPage.tsx    # ❌ App preferences page (PENDING)
│   ├── LegalPage.tsx          # ❌ Legal/terms page (PENDING)
│   └── SupportPage.tsx        # ❌ Help/support page (PENDING)
└── hooks/
    ├── useSettingsData.ts     # ✅ Settings data management (COMPLETED)
    ├── useSettingsNavigation.ts # ✅ Navigation logic (COMPLETED)
    └── useUserProfile.ts      # ✅ User profile API calls (COMPLETED)
```

#### Worker API Routes
```text
worker/routes/
├── user.ts                    # User profile management
├── preferences.ts             # User preferences
├── security.ts                # Security settings
├── teams.ts                   # Team management (existing)
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
  - Team Settings (navigation to team management)
  - Team Configuration (view/edit team config if user has permissions)

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

**Current Status**: The project uses Better Auth with Drizzle schema and extends the user model using Better Auth's `additionalFields` option. The existing `users` table already includes `teamId`, `role`, and `phone` fields via `additionalFields`. We need to extend this further for settings.

**Better Auth Recommended Approach:**
Following Better Auth's best practices, we'll use `additionalFields` for user profile data and a JSON field for preferences:

```typescript
// In worker/auth/index.ts - extend user model with additionalFields
user: {
  additionalFields: {
    // Existing fields
    teamId: {
      type: "string",
      required: false,
    },
    role: {
      type: "string", 
      required: false,
      defaultValue: "user",
      input: false, // Prevent users from setting this directly
    },
    phone: {
      type: "string",
      required: false,
    },
    // Profile fields
    bio: {
      type: "string",
      required: false,
    },
    addressStreet: {
      type: "string",
      required: false,
    },
    addressCity: {
      type: "string",
      required: false,
    },
    addressState: {
      type: "string",
      required: false,
    },
    addressZip: {
      type: "string",
      required: false,
    },
    addressCountry: {
      type: "string",
      required: false,
    },
    secondaryPhone: {
      type: "string",
      required: false,
    },
    preferredContactMethod: {
      type: "string",
      required: false,
    },
    // App preferences as JSON field (Better Auth recommended approach)
    preferences: {
      type: "json",
      required: false,
      defaultValue: {
        theme: "system",
        accentColor: "default",
        fontSize: "medium",
        language: "en",
        timezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationFrequency: "immediate",
        autoSaveConversations: true,
        typingIndicators: true,
      },
    },
  },
},
```

**Benefits of This Approach:**
- **Simplified Schema**: All user data in one table, no separate preferences table needed
- **Type Safety**: Better Auth handles type inference automatically
- **Built-in Updates**: Use `authClient.updateUser()` for all user data including preferences
- **JSON Flexibility**: Preferences can be easily extended without schema changes
- **Better Auth Integration**: Follows their recommended patterns for user extensions

**Manual Schema Management:**
Since this project uses manual schema management (not CLI), we'll manually update the existing `worker/db/auth.schema.ts` file to include the new user fields. The current schema already includes the basic Better Auth tables, and we'll extend the `users` table with the new `additionalFields`.

**Current Schema Structure:**
The project already has `worker/db/auth.schema.ts` with the basic Better Auth tables (users, sessions, accounts, passwords, verifications). We need to manually add the new fields to the existing `users` table definition.

**Note**: This approach uses Better Auth's built-in user extension capabilities with Drizzle ORM, following the [Better Auth user configuration documentation](https://www.better-auth.com/docs/reference/options#user) and the [better-auth-cloudflare manual setup documentation](https://github.com/zpg6/better-auth-cloudflare).

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

// Team management (existing endpoints)
GET /api/teams/:id             # Get team details - Auth: Session token, RBAC: Team member
PUT /api/teams/:id             # Update team config - Auth: Session token, RBAC: Team admin/owner

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
// In settings components - Use Better Auth's built-in user update methods
const updateProfile = async (profileData) => {
  try {
    // Use Better Auth's built-in user update functionality
    // Better Auth handles authentication and user updates automatically
    const result = await authClient.updateUser(profileData);
    
    if (result.error) {
      throw new Error(result.error.message || 'Failed to update profile');
    }
    
    return result.data;
  } catch (error) {
    // SECURITY: Sanitize profile data to prevent PII exposure in logs
    const sanitizedLog = createProfileErrorLog(error, profileData, {
      endpoint: 'authClient.updateUser',
      method: 'Better Auth Client'
    });
    
    console.error('Failed to update profile:', sanitizedLog);
    
    // Re-throw the error so callers can handle it appropriately
    throw error;
  }
};

// For user preferences (stored in user.preferences JSON field)
const updatePreferences = async (preferencesData) => {
  try {
    // Update preferences using Better Auth's updateUser method
    // Preferences are stored in the user.preferences JSON field
    const result = await authClient.updateUser({
      preferences: preferencesData
    });
    
    if (result.error) {
      throw new Error(result.error.message || 'Failed to update preferences');
    }
    
    return result.data;
  } catch (error) {
    console.error('Failed to update preferences:', error);
    throw error;
  }
};

// Helper function to sanitize profile data for logging
function createProfileErrorLog(error, profileData, additionalContext = {}) {
  const sensitiveFields = ['email', 'phone', 'secondary_phone', 'address_street', 'address_city', 'address_state', 'address_zip', 'image'];
  
  const sanitized = {};
  const metadata = {
    hasEmail: false,
    hasPhone: false,
    hasAddress: false,
    fieldCount: 0,
    sensitiveFieldCount: 0
  };
  
  if (profileData && typeof profileData === 'object') {
    for (const [key, value] of Object.entries(profileData)) {
      metadata.fieldCount++;
      
      if (sensitiveFields.includes(key)) {
        metadata.sensitiveFieldCount++;
        sanitized[key] = '[REDACTED]';
        
        // Set presence flags
        if (key === 'email' && value) metadata.hasEmail = true;
        if (key === 'phone' && value) metadata.hasPhone = true;
        if (key.startsWith('address_') && value) metadata.hasAddress = true;
      } else {
        // Non-sensitive fields can be included (with length limits)
        sanitized[key] = typeof value === 'string' && value.length > 100 
          ? value.substring(0, 100) + '...' 
          : value;
      }
    }
  }
  
  return {
    error: error.message,
    timestamp: new Date().toISOString(),
    profileMetadata: metadata,
    sanitizedProfile: sanitized,
    ...additionalContext
  };
}
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

### Phase 1: Core Infrastructure (Week 1) - **COMPLETED**
**Frontend (Preact):**
- [x] Create SettingsPage component with responsive behavior
- [x] Implement SettingsSection and SettingsItem components
- [x] Add settings routes to preact-iso router
- [x] Create useSettingsData and useUserProfile hooks
- [x] Integrate with existing UserProfile component

**Backend (Worker API):**
- [ ] Extend Better Auth user model with additionalFields in worker/auth/index.ts
- [ ] Add preferences JSON field to user model (Better Auth recommended approach)
- [ ] Manually update worker/db/auth.schema.ts to include new user fields
- [ ] Update useUserProfile hook to use Better Auth's updateUser method for all data

**Test Credentials (Development):**
- [x] Configure test user credentials in dev.vars.example
- [x] Set up TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME for frontend testing

**Testing & Quality Assurance:**
- [ ] Set up CI/CD pipeline with automated test runs on feature branches and PRs
- [ ] Write unit tests for SettingsPage, SettingsSection, and SettingsItem components
- [ ] Write unit tests for useSettingsData and useUserProfile hooks
- [ ] Create integration tests for new API routes (user.ts, preferences.ts)
- [ ] Set up test coverage targets (minimum 80% for new code)
- [ ] Add database migration tests for schema updates
- [ ] Implement automated accessibility testing for new components

### Phase 2: Account Settings (Week 2) - **IN PROGRESS**
**Frontend (Preact):**
- [x] Create AccountPage component
- [ ] Profile information editing form
- [ ] Contact information form with validation
- [ ] Address form component
- [ ] Profile image upload UI

**Backend (Worker API):**
- [ ] Use Better Auth's built-in user update functionality (no custom endpoint needed)
- [ ] Add profile image upload to files.ts
- [ ] Update useUserProfile hook to handle preferences JSON field properly
- [ ] Add input validation and sanitization for user data

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
