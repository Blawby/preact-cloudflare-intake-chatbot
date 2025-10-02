# Settings Page Implementation Plan

## Overview
Implement a comprehensive settings page following modern mobile app patterns (ChatGPT-style) with responsive behavior for both desktop and mobile platforms.

**Current Status**: Core settings components have been created and integrated with the UserProfile component. The settings page now displays as a full-width slide-up overlay on both mobile and desktop, with proper animations and scrollbar handling. Team Management and Notifications features have been removed from the current scope as they are not supported today. Legal and Support items now link to external Blawby website pages.

**Scope Note**: Team Management and Notifications features have been removed from the current implementation scope as they are not supported today. The focus is on core account management, preferences, and security features.

## Design Approach

### Desktop Behavior
- **Location**: Full-width modal overlay with backdrop
- **Trigger**: Click on user profile/account area in sidebar
- **Layout**: Centered modal with space around edges, backdrop click to close
- **Width**: Max-width with margins, content behind visible
- **Animation**: Slide up from bottom with framer-motion

### Mobile Behavior  
- **Location**: Full-screen drawer that slides up from bottom
- **Trigger**: Tap account/profile button in top navigation
- **Layout**: Full-screen modal with drawer animation
- **Navigation**: X button in top right, backdrop click to close

## Technical Implementation

### Component Structure

#### Frontend Components (Preact) - **COMPLETED**
```text
src/components/settings/
├── SettingsPage.tsx           # ✅ Main settings container (COMPLETED)
├── SettingsSection.tsx        # ✅ Reusable section component (COMPLETED)
├── SettingsItem.tsx           # ✅ Individual setting row with external links (COMPLETED)
├── pages/
│   ├── AccountPage.tsx        # ✅ Account/profile settings page (COMPLETED)
│   ├── SecurityPage.tsx       # ❌ Security settings page (PENDING)
│   ├── PreferencesPage.tsx    # ❌ App preferences page (PENDING)
│   ├── LegalPage.tsx          # ❌ Legal/terms page (PENDING)
│   └── SupportPage.tsx        # ❌ Help/support page (PENDING)
└── hooks/
    ├── useSettingsData.ts     # ✅ Settings data management (COMPLETED)
    ├── useSettingsNavigation.ts # ✅ Navigation logic (COMPLETED)
    └── useUserProfile.ts      # ✅ User profile API calls (COMPLETED)

# REMOVED: NotificationsPage.tsx, TeamPage.tsx (not supported today)
# UPDATED: Legal and Support now use external links to blawby.com
```

#### Worker API Routes
```text
worker/routes/
├── teams.ts                   # Team management (existing)
└── files.ts                   # File uploads (extend existing)

# Note: User profile, preferences, and security are handled by Better Auth
# No custom API routes needed for user data management
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

- **Security**
  - Change Password (if email/password auth)
  - Connected Accounts (Google OAuth status)
  - Account Deletion (danger action)

#### PREFERENCES Section
- **Appearance**
  - Theme (radio: Light/Dark/System)
  - Accent Color (color picker with presets)
  - Font Size (slider: Small/Medium/Large)

- **Localization**
  - Language (dropdown with common options)
  - Time Zone (dropdown with search)
  - Date Format (radio: MM/DD/YYYY, DD/MM/YYYY)
  - Time Format (radio: 12-hour, 24-hour)

- **Chat Preferences**
  - Default Chat Mode (dropdown)
  - Auto-save Conversations (toggle)
  - Typing Indicators (toggle)

#### LEGAL & SUPPORT Section
- **Privacy Policy** (external link to https://blawby.com/privacy)
- **Help & Support** (external link to https://blawby.com/help)

#### ACCOUNT ACTIONS Section
- **Sign Out** (with loading state and danger styling)

**REMOVED SECTIONS:**
- **Team & Organization** - Not supported today
- **Notifications** - Not supported today
- **Legal/Support Pages** - Now external links to blawby.com

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
// User profile management - Handled by Better Auth
// All user data (profile + preferences) managed via authClient.updateUser()
// User data accessed via authClient.user or authClient.getSession()

// Team management (existing endpoints)
GET /api/teams/:id             # Get team details - Auth: Session token, RBAC: Team member
PUT /api/teams/:id             # Update team config - Auth: Session token, RBAC: Team admin/owner

// File uploads (if needed)
POST /api/user/upload-avatar   # Upload profile image - Auth: Session token, RBAC: Owner only
DELETE /api/user/avatar        # Delete profile image - Auth: Session token, RBAC: Owner only

// Note: Security endpoints (sessions, 2FA, etc.) are handled by Better Auth built-in endpoints
// Note: User preferences are stored in user.preferences JSON field, updated via authClient.updateUser()
```

#### Preact Frontend Routes (`/settings/*`)
**UI Pages - Handled by Preact Router:**

```typescript
// Settings pages
/settings                      # Main settings page (overlay)
/settings/security             # Security settings
/settings/account              # Account details
/settings/preferences          # App preferences

// REMOVED ROUTES (not supported today):
// /settings/notifications        # Notification preferences
// /settings/team                 # Team management
// /settings/legal                # Legal/terms (now external link)
// /settings/support              # Help/support (now external link)
```

### Responsive Behavior

#### Desktop (≥768px)
- **Container**: Full-width modal overlay with backdrop
- **Width**: Max-width with margins (top-8 left-8 right-8 bottom-8 max-w-4xl mx-auto)
- **Height**: Full height with margins, content behind visible
- **Animation**: Slide up from bottom with framer-motion
- **Close**: Click outside backdrop, escape key, or X button

#### Mobile (<768px)  
- **Container**: Full-screen drawer
- **Width**: 100% viewport width (inset-x-0 bottom-0 top-0)
- **Height**: Full viewport height
- **Animation**: Slide up from bottom with framer-motion
- **Close**: Click outside backdrop, escape key, or X button

### Settings Item Types

#### Display Items
- **Purpose**: Show read-only information (email, app version, etc.)
- **Implementation**: ✅ Completed in SettingsItem component

#### Navigation Items
- **Purpose**: Navigate to other settings pages
- **Implementation**: ✅ Completed with proper arrow alignment

#### Toggle Items
- **Purpose**: Boolean settings (dark mode, notifications, etc.)
- **Implementation**: ✅ Completed in SettingsItem component

#### Input Items
- **Purpose**: Text input fields (phone, address, etc.)
- **Implementation**: ✅ Completed in SettingsItem component

#### Action Items
- **Purpose**: Perform actions (sign out, delete account, etc.)
- **Implementation**: ✅ Completed with loading states and danger variants

#### External Link Items
- **Purpose**: Link to external websites (privacy policy, help, etc.)
- **Implementation**: ✅ Completed with external link icon and proper attributes

### Integration Points

#### UserProfile Component Updates
- **Implementation**: ✅ Completed - Settings overlay with framer-motion animations
- **Features**: Backdrop click to close, escape key support, proper z-index layering
- **Responsive**: Full-screen on mobile, centered modal on desktop

#### Navigation Integration

**Preact Router Setup:**
- **Implementation**: ✅ Completed - Settings routes added to existing router
- **Active Routes**: `/settings`, `/settings/security`, `/settings/account`, `/settings/preferences`
- **Removed Routes**: Notifications, Team, Legal, Support (not supported today)

**Worker API Integration:**
- **Implementation**: ✅ Completed - Using Better Auth's built-in user update methods
- **Profile Updates**: `authClient.updateUser()` for all user data including preferences
- **Security**: PII sanitization in error logs, proper error handling
- **Preferences**: Stored in user.preferences JSON field via Better Auth

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
- [x] Implement SettingsSection and SettingsItem components with external link support
- [x] Add settings routes to preact-iso router
- [x] Create useSettingsData and useUserProfile hooks
- [x] Integrate with existing UserProfile component as overlay
- [x] Implement framer-motion animations for slide-up behavior
- [x] Add proper scrollbar handling and backdrop functionality
- [x] Remove unsupported Team and Notifications features
- [x] Convert Legal and Support to external links to blawby.com

**Backend (Worker API):**
- [ ] Extend Better Auth user model with additionalFields in worker/auth/index.ts
- [ ] Add preferences JSON field to user model (Better Auth recommended approach)
- [ ] Manually update worker/db/auth.schema.ts to include new user fields
- [ ] Update useUserProfile hook to use Better Auth's updateUser method for all data

**Test Credentials (Development):**
- [x] Configure test user credentials in dev.vars.example
- [x] Set up TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME for frontend testing

**Testing & Quality Assurance:**
- [ ] Manual testing using test credentials (TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME)
- [ ] Browser testing for responsive behavior and user interactions
- [ ] cURL testing for Better Auth user update functionality
- [ ] Manual accessibility testing with keyboard navigation and screen readers

### Phase 2: Account Settings (Week 2) - **IN PROGRESS**
**Frontend (Preact):**
- [x] Create AccountPage component
- [ ] Profile information editing form
- [ ] Contact information form with validation
- [ ] Address form component
- [ ] Profile image upload UI

**Backend (Worker API):**
- [ ] Use Better Auth's built-in user update functionality (no custom endpoints needed)
- [ ] Add profile image upload to files.ts (if needed)
- [ ] Update useUserProfile hook to handle preferences JSON field properly
- [ ] Add input validation and sanitization for user data

**Testing & Quality Assurance:**
- [ ] Manual testing of AccountPage component with test credentials
- [ ] cURL testing for Better Auth user update functionality
- [ ] Browser testing for form validation with various input scenarios
- [ ] Manual testing of profile image upload functionality
- [ ] Browser testing for responsive behavior on mobile and desktop
- [ ] Manual validation of input sanitization and XSS prevention

### Phase 3: Preferences (Week 3)
**Frontend (Preact):**
- [ ] Create PreferencesPage component
- [ ] Theme and appearance settings UI
- [ ] Notification preferences form
- [ ] Localization settings dropdowns
- [ ] Chat preferences toggles

**Backend (Worker API):**
- [ ] Use Better Auth's built-in user update functionality for preferences (no custom endpoint needed)
- [ ] Add preferences validation in useUserProfile hook
- [ ] Implement persistence and synchronization via authClient.updateUser()
- [ ] Add caching for preferences in frontend

**Testing & Quality Assurance:**
- [ ] Manual testing of PreferencesPage component with test credentials
- [ ] Browser testing for theme switching functionality and persistence
- [ ] Manual accessibility testing for preference controls (keyboard navigation, screen readers)
- [ ] cURL testing for Better Auth preferences update functionality
- [ ] Browser testing for notification preference changes and real-time effects
- [ ] Manual testing of dropdown interactions and toggle behaviors
- [ ] Browser testing for localization settings and timezone handling
- [ ] Manual testing of preference caching and synchronization

### Phase 4: Security & Advanced (Week 4)
**Frontend (Preact):**
- [ ] Create SecurityPage component
- [ ] Legal and support pages (simple links to blawby.com)

**Backend (Worker API):**
- [ ] Use Better Auth's built-in security endpoints (password change, account deletion)
- [ ] Add security audit logging if needed

**Testing & Quality Assurance:**
- [ ] Manual testing of SecurityPage component with test credentials
- [ ] cURL testing for Better Auth security endpoints
- [ ] Browser testing for password change and account deletion functionality
- [ ] Manual testing of Better Auth security features
- [ ] Manual validation of security audit logging and monitoring
- [ ] Manual input validation testing for security vulnerabilities
- [ ] cURL testing for rate limiting and CSRF protection mechanisms

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
- [ ] Manual end-to-end testing of complete settings workflow with test credentials
- [ ] Browser performance testing and optimization validation
- [ ] Cross-browser and cross-device compatibility testing
- [ ] Final manual testing and gap identification
- [ ] User acceptance testing and feedback incorporation
- [ ] Production readiness assessment and deployment validation

## Testing Strategy

### Manual Testing Approach
**Test Credentials Usage:**
- **Development Testing**: Use configured test credentials (TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME)
- **Browser Testing**: Manual testing across different browsers and devices
- **cURL Testing**: API endpoint testing using command line tools

**Testing Focus Areas:**
- **User Authentication**: Test login/logout with test credentials
- **Settings Functionality**: Manual testing of all settings pages and features
- **Responsive Design**: Browser testing on mobile and desktop viewports
- **Accessibility**: Manual keyboard navigation and screen reader testing
- **Performance**: Browser dev tools for performance monitoring

**Quality Assurance:**
- **Code Quality**: ESLint, TypeScript compilation, and code formatting checks
- **Security**: Manual security testing and Better Auth endpoint validation
- **Accessibility**: Manual accessibility testing with keyboard and screen readers
- **Performance**: Browser performance monitoring and optimization

## Success Metrics

- **User Engagement**: Settings page usage and completion rates
- **Performance**: Page load times and interaction responsiveness  
- **Accessibility**: Screen reader compatibility and keyboard navigation
- **Mobile Experience**: Touch interaction quality and gesture support
- **Data Quality**: Profile completion rates and data accuracy

## Current Implementation Status

### ✅ **COMPLETED FEATURES**
- **Settings Overlay**: Full-width slide-up overlay on both mobile and desktop
- **Framer Motion Animations**: Smooth slide-up/down animations with custom easing
- **Responsive Design**: Different layouts for mobile (full-screen) and desktop (centered modal)
- **Backdrop Functionality**: Click outside to close, escape key support
- **Scrollbar Handling**: Proper body scroll locking when overlay is open
- **External Links**: Privacy Policy and Help & Support link to blawby.com
- **Sign Out Integration**: Sign out functionality with loading states
- **Icon Alignment**: Consistent navigation arrows and external link icons
- **Z-Index Management**: Proper layering above other UI elements

### ❌ **REMOVED FEATURES (Not Supported Today)**
- **Team Management**: Team settings and member management
- **Notifications**: Email, push, and SMS notification preferences
- **Legal/Support Pages**: Now external links instead of internal pages

### 🔄 **CURRENT SETTINGS STRUCTURE**
1. **Account Section**: Profile (navigates to account settings)
2. **Preferences Section**: App Preferences (navigates to preferences settings)  
3. **Security Section**: Security Settings (navigates to security settings)
4. **Legal & Support Section**: Privacy Policy and Help & Support (external links)
5. **Account Actions Section**: Sign Out (with loading state and danger styling)

### 🚧 **PENDING IMPLEMENTATION**
- Account settings page functionality
- Preferences page functionality  
- Security settings page functionality
- Backend user model extensions
- Profile image upload functionality

## Future Enhancements

- **Advanced Profile Customization**: Custom themes, layouts
- **Integration Settings**: Third-party service connections
- **Analytics Dashboard**: User activity and usage insights
- **Bulk Operations**: Mass data import/export capabilities
- **Team Management**: When team functionality is implemented
- **Notification System**: When notification infrastructure is built
