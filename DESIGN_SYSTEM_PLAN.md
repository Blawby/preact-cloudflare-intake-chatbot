# Blawby AI Form & Input Components Plan

## Overview
This document outlines a focused plan for building reusable form and input components in our Preact application, inspired by shadcn/ui patterns but tailored for our specific needs and existing architecture.

## Current State Audit

### Existing Input Patterns
Based on the codebase audit, we currently have:

1. **CSS Classes**: 
   - `.input-base` - Standard input styling with dark mode support
   - `.input-with-icon` - Input with left padding for icons
   - `.error` - Error state styling

2. **Current Input Types**:
   - Text inputs (name, email, password, birthday)
   - Textarea (message composer, additional info)
   - Select dropdowns (settings, jurisdiction selection)
   - Checkboxes (terms agreement, settings toggles)
   - File inputs (message composer, file uploads)

3. **Validation Patterns**:
   - Manual field validation with error state management
   - Form-level error handling with submission states
   - Real-time error clearing on input change
   - Custom validation rules (email, phone, date formats)

4. **Styling Approach**:
   - Tailwind CSS with custom CSS classes
   - Dark mode support via CSS variables
   - Consistent focus states and transitions
   - Icon integration with Heroicons

### Existing Reusable Components (Settings)
We have several well-built components in settings that can be extracted and renamed:

1. **SettingsToggle.tsx** → **Switch.tsx**
   - Full toggle switch with accessibility
   - Boolean value handling, disabled states
   - Dark mode support, focus management
   - Ready to move to `src/components/ui/input/Switch.tsx`

2. **SettingsDropdown.tsx** → **Select.tsx**
   - Complete dropdown/select component
   - Keyboard navigation, accessibility (ARIA)
   - Mobile/desktop responsive layouts
   - Ready to move to `src/components/ui/input/Select.tsx`

3. **SettingsItem.tsx** → **FormItem.tsx** (partial)
   - Multi-purpose form item with input types
   - Built-in: text, password, email, select, textarea
   - Toggle functionality, icon support, loading states
   - Can extract input logic for form components

4. **SettingsDropdownWithToggles.tsx** → **MultiSelect.tsx** (partial)
   - Dropdown with multiple toggle options
   - Keyboard navigation, accessibility
   - Can extract toggle functionality for MultiSelect

## Form & Input Architecture

### Directory Structure
```
src/components/ui/
├── form/
│   ├── Form.tsx                 # Root form provider
│   ├── FormField.tsx           # Field wrapper with validation
│   ├── FormItem.tsx            # Field container
│   ├── FormLabel.tsx           # Accessible label
│   ├── FormControl.tsx         # Input wrapper
│   ├── FormMessage.tsx         # Error/success messages
│   ├── FormDescription.tsx     # Helper text
│   └── index.ts                # Form exports
├── input/
│   ├── Input.tsx               # Base text input
│   ├── Textarea.tsx            # Multi-line text input
│   ├── Select.tsx              # Dropdown selection
│   ├── Checkbox.tsx            # Checkbox input
│   ├── RadioGroup.tsx          # Radio button group
│   ├── Switch.tsx              # Toggle switch
│   ├── FileInput.tsx           # File upload input
│   ├── DatePicker.tsx          # Date selection
│   ├── SearchInput.tsx         # Search with autocomplete
│   ├── PasswordInput.tsx       # Password with visibility toggle
│   ├── NumberInput.tsx         # Numeric input with controls
│   ├── PhoneInput.tsx          # Phone number with formatting
│   ├── EmailInput.tsx          # Email with validation
│   ├── URLInput.tsx            # URL with validation
│   ├── Combobox.tsx            # Searchable dropdown
│   ├── MultiSelect.tsx         # Multiple selection
│   └── index.ts                # Input exports
└── index.ts                    # Form & input exports
```

## Core Components to Build

### 1. Form System (`src/components/ui/form/`)

#### Form.tsx
- **Purpose**: Root form provider with validation context and legal compliance
- **Features**: 
  - **Primary Validation Library**: Zod (TypeScript-first schema validation)
  - **Schema Sharing Strategy**: 
    - Shared schemas package (`@company/schemas`) or mono-repo folder (`packages/schemas/`)
    - Buildable TypeScript types exported for client/server reuse
    - Version-controlled schema definitions with semantic versioning
  - **Standardized Error Payload**:
    ```typescript
    interface ValidationError {
      code: string;           // Error type identifier (e.g., 'required', 'invalid_email')
      field: string;          // Field path (e.g., 'user.profile.email')
      message: string;        // Human-readable error message
      hint?: string;          // Optional guidance for fixing the error
    }
    ```
  - **Message Localization**: 
    - Error messages keyed by `code` in i18n files
    - Field-specific overrides supported
    - Fallback to generic messages for unknown codes
  - **Server-Side Enforcement**:
    - All form submissions MUST re-validate using shared schemas
    - No client-side validation bypassing allowed
    - API endpoints enforce schema validation before processing
  - **PII/Legal Compliance Checklist**:
    ```typescript
    interface FieldCompliance {
      field: string;
      required: boolean;
      storage: 'encrypted' | 'plain' | 'none';
      retention: number; // days
      consentRequired: boolean;
      gdprCategory: 'personal' | 'sensitive' | 'public';
      ccpaCategory: 'personal' | 'sensitive' | 'public';
    }
    ```
  - Form state management with compliance validation
  - Submission handling with legal requirement enforcement
  - Error aggregation with localized messages
- **Usage**: Wrap entire forms, provide validation context and legal compliance

#### FormField.tsx
- **Purpose**: Individual field wrapper with validation
- **Features**:
  - Field-level validation
  - Error state management
  - Accessibility attributes
  - Field registration
- **Usage**: Wrap individual form inputs

#### FormItem.tsx
- **Purpose**: Field container with consistent spacing
- **Features**:
  - Consistent field layout
  - Error state styling
  - Label/input/error grouping
- **Usage**: Container for form field elements

#### FormLabel.tsx
- **Purpose**: Accessible form labels
- **Features**:
  - Proper label association
  - Required field indicators
  - Error state styling
- **Usage**: Labels for all form inputs

#### FormControl.tsx
- **Purpose**: Input wrapper with form integration
- **Features**:
  - Form field connection
  - Validation state passing
  - Focus management
- **Usage**: Wrap actual input components

#### FormMessage.tsx
- **Purpose**: Error and success message display
- **Features**:
  - Error message display
  - Success message display
  - Validation feedback
- **Usage**: Show field-level validation messages

#### FormDescription.tsx
- **Purpose**: Helper text for form fields
- **Features**:
  - Contextual help text
  - Field guidance
  - Accessibility support
- **Usage**: Provide additional field context

### 2. Input Components (`src/components/ui/input/`)

#### Input.tsx
- **Purpose**: Base text input component
- **Features**:
  - Text input with validation
  - Icon support (left/right)
  - Size variants (sm, md, lg)
  - Error states
  - Disabled states
- **Usage**: Basic text input fields

#### Textarea.tsx
- **Purpose**: Multi-line text input
- **Features**:
  - Auto-resize functionality
  - Character count
  - Size variants
  - Validation states
- **Usage**: Long text input, message composition

#### Select.tsx
- **Purpose**: Dropdown selection
- **Features**:
  - Single/multiple selection
  - Search functionality
  - Custom option rendering
  - Keyboard navigation
- **Usage**: Dropdown selections, settings

#### Checkbox.tsx
- **Purpose**: Checkbox input
- **Features**:
  - Single checkbox
  - Checkbox groups
  - Indeterminate state
  - Custom styling
- **Usage**: Terms agreement, settings toggles

#### RadioGroup.tsx
- **Purpose**: Radio button group
- **Features**:
  - Single selection from options
  - Horizontal/vertical layouts
  - Custom styling
  - Accessibility
- **Usage**: Single choice selections

#### Switch.tsx
- **Purpose**: Toggle switch
- **Features**:
  - On/off toggle
  - Size variants
  - Custom styling
  - Accessibility
- **Usage**: Settings toggles, feature flags

#### FileInput.tsx
- **Purpose**: File upload input
- **Features**:
  - Drag and drop
  - File type validation
  - Multiple file support
  - Preview functionality
- **Usage**: Document uploads, media files

#### DatePicker.tsx
- **Purpose**: Date selection
- **Features**:
  - Calendar popup
  - Date range selection
  - Format customization
  - Validation
- **Usage**: Birthday, appointment dates

#### SearchInput.tsx
- **Purpose**: Search with autocomplete
- **Features**:
  - Real-time search
  - Autocomplete suggestions
  - Keyboard navigation
  - Custom result rendering
- **Usage**: Search functionality, autocomplete

#### PasswordInput.tsx
- **Purpose**: Password input with visibility toggle
- **Features**:
  - Show/hide password
  - Strength indicator
  - Validation
  - Security features
- **Usage**: Authentication forms

#### NumberInput.tsx
- **Purpose**: Numeric input with controls
- **Features**:
  - Increment/decrement buttons
  - Min/max validation
  - Step controls
  - Formatting
- **Usage**: Quantity inputs, numeric settings

#### PhoneInput.tsx
- **Purpose**: Phone number input with formatting
- **Features**:
  - International formatting
  - Country code selection
  - Validation
  - Auto-formatting
- **Usage**: Contact forms, user profiles

#### EmailInput.tsx
- **Purpose**: Email input with validation
- **Features**:
  - Email format validation
  - Domain suggestions
  - Real-time validation
  - Error messages
- **Usage**: Authentication, contact forms

#### URLInput.tsx
- **Purpose**: URL input with validation
- **Features**:
  - URL format validation
  - Protocol handling
  - Preview functionality
  - Error states
- **Usage**: Website links, API endpoints

#### ColorInput.tsx
- **Purpose**: Color picker input
- **Features**:
  - Color picker popup
  - Hex/RGB/HSL support
  - Preset colors
  - Custom colors
- **Usage**: Theme customization, branding

#### Slider.tsx
- **Purpose**: Range slider input
- **Features**:
  - Single/dual range
  - Step controls
  - Value display
  - Custom styling
- **Usage**: Range selections, volume controls

#### Combobox.tsx
- **Purpose**: Searchable dropdown
- **Features**:
  - Search functionality
  - Custom filtering
  - Keyboard navigation
  - Multi-selection
- **Usage**: Advanced selections, search

#### MultiSelect.tsx
- **Purpose**: Multiple selection input
- **Features**:
  - Multiple selection
  - Tag display
  - Search functionality
  - Custom options
- **Usage**: Tag selection, multiple choices

#### TagsInput.tsx
- **Purpose**: Tag input with autocomplete
- **Features**:
  - Tag creation
  - Autocomplete suggestions
  - Tag removal
  - Validation
- **Usage**: Tagging, categorization

#### RichTextEditor.tsx
- **Purpose**: WYSIWYG text editor
- **Features**:
  - Rich text formatting
  - Toolbar controls
  - HTML output
  - Custom plugins
- **Usage**: Content creation, descriptions

#### CodeEditor.tsx
- **Purpose**: Code input with syntax highlighting
- **Features**:
  - Syntax highlighting
  - Language detection
  - Line numbers
  - Code completion
- **Usage**: Code input, configuration

### External Dependencies & Compliance Considerations

#### DatePicker.tsx
- **Preferred Library**: `react-datepicker` (alternative: `@mantine/dates`)
- **Bundle Impact**: ~45KB gzipped (react-datepicker + dependencies)
- **Accessibility**: Full ARIA support, keyboard navigation, screen reader compatible
- **License**: MIT (compatible with commercial use)

#### RichTextEditor.tsx
- **Preferred Library**: `@tiptap/react` (alternative: `react-quill`)
- **Bundle Impact**: ~120KB gzipped (Tiptap core + extensions)
- **Accessibility**: ARIA-compliant toolbar, keyboard shortcuts, screen reader support
- **License**: MIT (compatible with commercial use)

#### CodeEditor.tsx
- **Preferred Library**: `@monaco-editor/react` (alternative: `react-codemirror`)
- **Bundle Impact**: ~2.5MB gzipped (Monaco Editor full bundle)
- **Accessibility**: Limited ARIA support, requires custom keyboard navigation implementation
- **License**: MIT (compatible with commercial use)

#### ColorInput.tsx
- **Preferred Library**: `react-colorful` (alternative: `react-color`)
- **Bundle Impact**: ~8KB gzipped (minimal footprint)
- **Accessibility**: ARIA-compliant, keyboard navigation, color contrast indicators
- **License**: MIT (compatible with commercial use)

**Bundling Strategy**: Implement lazy-loading for complex components (DatePicker, RichTextEditor, CodeEditor) using dynamic imports to reduce initial bundle size. Create wrapper abstractions that handle loading states and provide consistent APIs. Consider code-splitting at the route level for pages that heavily use these components. For CodeEditor specifically, implement a lightweight fallback for basic text editing when full syntax highlighting isn't required.

### 3. Form Validation & Error Handling

#### Validation Patterns
- **Field-level validation**: Real-time validation with error clearing
- **Form-level validation**: Submission validation with error aggregation
- **Custom validation rules**: Email, phone, date formats, legal data
- **Error state management**: Consistent error display and clearing

#### Error Display Components
- **FormMessage**: Field-level error and success messages
- **FormDescription**: Helper text and field guidance
- **Alert**: Form-level error messages and notifications

### 4. Internationalization (i18n) Support

#### Current i18n Setup
- **Supported locales**: English (en), Spanish (es)
- **Namespaces**: `common`, `settings`, `auth`
- **Hook**: `useTranslation` from `react-i18next`
- **Pattern**: `const { t } = useTranslation('namespace')`

#### i18n Integration Requirements
All form and input components must support:

1. **Translation Keys**: All text content via translation keys
2. **Namespace Support**: Use appropriate namespaces (`common`, `settings`, `auth`)
3. **Placeholder Text**: Translatable placeholder text
4. **Error Messages**: Translatable validation error messages
5. **Helper Text**: Translatable descriptions and guidance
6. **Accessibility Labels**: Translatable ARIA labels and descriptions

#### Translation Key Structure
```json
{
  "forms": {
    "validation": {
      "required": "This field is required",
      "email": "Please enter a valid email address",
      "phone": "Please enter a valid phone number",
      "password": "Password must be at least 8 characters",
      "confirmPassword": "Passwords do not match",
      "date": "Please enter a valid date (MM/DD/YYYY)"
    },
    "placeholders": {
      "name": "Enter your full name",
      "email": "Enter your email address",
      "phone": "Enter your phone number",
      "password": "Enter your password",
      "confirmPassword": "Confirm your password",
      "birthday": "MM/DD/YYYY",
      "search": "Search...",
      "select": "Select an option"
    },
    "labels": {
      "name": "Full Name",
      "email": "Email Address",
      "phone": "Phone Number",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "birthday": "Birthday",
      "terms": "Terms and Conditions",
      "privacy": "Privacy Policy"
    },
    "descriptions": {
      "optional": "Optional",
      "required": "Required",
      "passwordHelp": "Must be at least 8 characters long",
      "phoneHelp": "Include country code for international numbers"
    }
  }
}
```

## Usage Patterns Throughout the App

### 1. Authentication Forms
- **Components**: Input, PasswordInput, EmailInput, Button, Form
- **Usage**: Sign-in, sign-up, password reset
- **Validation**: Email format, password strength, required fields

### 2. Onboarding Flows
- **Components**: Stepper, Input, Select, Checkbox, Button, Form
- **Usage**: Personal info collection, use case selection
- **Validation**: Required fields, format validation, terms agreement

### 3. Contact Forms
- **Components**: Input, Textarea, PhoneInput, EmailInput, Button, Form
- **Usage**: Contact information collection, legal intake
- **Validation**: Contact info validation, required fields

### 4. Settings Pages
- **Components**: Input, Select, Switch, Checkbox, Button, Form
- **Usage**: User preferences, account settings, team configuration
- **Validation**: Settings validation, confirmation dialogs

### 5. Message Composition
- **Components**: Textarea, FileInput, Button, Form
- **Usage**: Chat input, file uploads, media capture
- **Validation**: Message length, file type validation

### 6. Search and Filtering
- **Components**: SearchInput, Select, Checkbox, Button
- **Usage**: Content search, filtering options
- **Validation**: Search term validation, filter state

### 7. Data Display
- **Components**: Table, List, Grid, Pagination, Badge
- **Usage**: Data visualization, status display
- **Validation**: Data formatting, display logic

### 8. File Management
- **Components**: FileInput, Button, Progress, Alert
- **Usage**: File uploads, document management
- **Validation**: File type, size, format validation

### 9. Legal Intake Forms
- **Components**: Input, Textarea, Select, Checkbox, DatePicker, Form
- **Usage**: Case information collection, legal forms
- **Validation**: Legal data validation, required fields

### 10. Payment Forms
- **Components**: Input, Select, Checkbox, Button, Form
- **Usage**: Payment information, billing details
- **Validation**: Payment validation, security requirements

## Implementation Strategy

### Phase 1: Extract Existing Components (Week 1)
1. **Move SettingsToggle → Switch.tsx**
   - Move `src/components/settings/components/SettingsToggle.tsx` → `src/components/ui/input/Switch.tsx`
   - Add size variants and enhanced styling options
   - **Add i18n support**: Translation keys for labels and descriptions
   - Update imports in settings pages

2. **Move SettingsDropdown → Select.tsx**
   - Move `src/components/settings/components/SettingsDropdown.tsx` → `src/components/ui/input/Select.tsx`
   - Add multi-select support and search functionality
   - **Add i18n support**: Translation keys for options, labels, and descriptions
   - Update imports in settings pages

3. **Extract from SettingsItem → Input.tsx, Textarea.tsx**
   - Extract text input logic from `SettingsItem.tsx`
   - Create `Input.tsx` and `Textarea.tsx` components
   - **Add i18n support**: Translation keys for placeholders, labels, and error messages
   - Maintain existing functionality

### Phase 2: Build Form System (Week 2)
1. Build Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription
2. Extract form logic from SettingsItem for FormItem components
3. **Add comprehensive i18n support**: Translation keys for all form elements
4. Implement validation integration with existing patterns
5. Test with authentication and onboarding forms

### Phase 3: Build Remaining Inputs (Week 3)
1. Build Checkbox, RadioGroup, FileInput, DatePicker
2. Build specialized inputs (PasswordInput, EmailInput, PhoneInput)
3. Extract toggle functionality from SettingsDropdownWithToggles → MultiSelect
4. **Add i18n support**: Translation keys for all input types
5. Update all forms to use new system

### Phase 4: Advanced Features (Week 4)
1. Build Combobox, SearchInput, NumberInput, URLInput
2. Add advanced validation patterns
3. **Complete i18n integration**: Spanish translations for all components
4. Implement consistent error handling
5. Polish and optimize all components

## Design Principles

### 1. Consistency
- Unified styling approach using existing `.input-base` classes
- Consistent spacing, typography, and color usage
- Standardized component APIs and prop patterns

### 2. Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### 3. Performance
- Minimal bundle size impact
- Efficient re-rendering
- Optimized validation patterns

### 4. Flexibility
- Composable component architecture
- Customizable styling options
- Extensible validation system
- Dark mode support

### 5. Developer Experience
- TypeScript support throughout
- Clear component APIs
- Easy integration with existing patterns
- **i18n-first design**: All components support translation from the start

### 6. Legal Compliance
- PII protection in form handling
- Attorney-client privilege considerations
- Data validation and sanitization
- Audit trail support

### 7. Internationalization
- **Full Spanish support**: All components work in both English and Spanish
- **Translation key structure**: Consistent naming and organization
- **Namespace support**: Proper use of `common`, `settings`, `auth` namespaces
- **Accessibility**: Translatable ARIA labels and descriptions

## Integration with Existing Code

### 1. Gradual Migration
- Start with new components using the design system
- Gradually migrate existing components
- Maintain backward compatibility during transition
- Update CSS classes to use new system

### 2. Validation Integration
- Integrate with existing validation patterns
- Support both client-side and server-side validation
- Maintain existing error handling approaches
- Add new validation capabilities

### 3. Styling Migration
- Migrate from custom CSS classes to component-based styling
- Update dark mode support
- Maintain existing visual design
- Enhance with new design system features

### 4. State Management
- Integrate with existing form state management
- Support both controlled and uncontrolled components
- Maintain existing data flow patterns
- Add new state management capabilities

## Benefits

### 1. Developer Productivity
- **Reuse existing code**: Leverage well-built settings components
- Faster form development with proven components
- Consistent input patterns across the app
- Reduced code duplication
- Better maintainability

### 2. User Experience
- **Preserve existing functionality**: All current features maintained
- Consistent form behavior
- Better accessibility (already implemented)
- Improved validation feedback
- Enhanced visual design

### 3. Legal Compliance
- **Maintain security**: Existing PII protection preserved
- Standardized form data handling
- Consistent validation patterns
- Better audit capabilities
- Enhanced security

### 4. Scalability
- **Build on solid foundation**: Existing components are well-tested
- Easy addition of new input types
- Consistent form architecture
- Better testing capabilities
- Future-proof design

## Key Advantages of This Approach

### 1. **Leverage Existing Work**
- SettingsToggle and SettingsDropdown are already fully-featured
- Accessibility, keyboard navigation, and dark mode already implemented
- No need to rebuild complex functionality from scratch

### 2. **Minimal Risk**
- Components are already in production use
- Well-tested and proven functionality
- Gradual migration approach reduces risk

### 3. **Faster Implementation**
- Phase 1 can be completed in days, not weeks
- Immediate benefits from better organization
- Foundation for remaining components already exists

### 4. **Full i18n Support**
- **Existing i18n integration**: Components already use `useTranslation` hook
- **Spanish translations**: All form components will work in Spanish
- **Consistent patterns**: Follow existing translation key structure
- **Accessibility**: Translatable ARIA labels and descriptions

## Component i18n Examples

### Input Component with i18n
```typescript
interface InputProps {
  labelKey?: string;        // Translation key for label
  placeholderKey?: string;  // Translation key for placeholder
  descriptionKey?: string;  // Translation key for description
  errorKey?: string;        // Translation key for error message
  namespace?: string;       // i18n namespace (default: 'common')
}

// Usage
<Input 
  labelKey="forms.labels.email"
  placeholderKey="forms.placeholders.email"
  descriptionKey="forms.descriptions.optional"
  errorKey="forms.validation.email"
  namespace="auth"
/>
```

### Select Component with i18n
```typescript
interface SelectProps {
  labelKey?: string;
  placeholderKey?: string;
  options: Array<{
    value: string;
    labelKey: string;  // Translation key for option label
  }>;
  namespace?: string;
}
```

This focused form and input system will provide a solid foundation for building consistent, accessible, and maintainable forms throughout the Blawby AI application while leveraging your existing, well-built components, maintaining all current functionality, and providing full Spanish language support.
