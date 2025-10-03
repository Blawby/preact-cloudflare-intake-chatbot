# Blawby AI Design System Plan

## Overview
This document outlines a comprehensive design system for reusable input components in our Preact application, inspired by shadcn/ui patterns but tailored for our specific needs and existing architecture.

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

## Design System Architecture

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
│   ├── ColorInput.tsx          # Color picker
│   ├── Slider.tsx              # Range slider
│   ├── Combobox.tsx            # Searchable dropdown
│   ├── MultiSelect.tsx         # Multiple selection
│   ├── TagsInput.tsx           # Tag input with autocomplete
│   ├── RichTextEditor.tsx      # WYSIWYG editor
│   ├── CodeEditor.tsx          # Code input with syntax highlighting
│   └── index.ts                # Input exports
├── button/
│   ├── Button.tsx              # Already exists - enhance
│   ├── ButtonGroup.tsx         # Button groups
│   ├── IconButton.tsx          # Icon-only buttons
│   ├── LoadingButton.tsx       # Button with loading state
│   ├── ToggleButton.tsx        # Toggle state button
│   └── index.ts                # Button exports
├── feedback/
│   ├── Alert.tsx               # Alert messages
│   ├── Toast.tsx               # Already exists - enhance
│   ├── Badge.tsx               # Status badges
│   ├── Progress.tsx            # Progress indicators
│   ├── Spinner.tsx             # Loading spinners
│   ├── Skeleton.tsx            # Loading placeholders
│   └── index.ts                # Feedback exports
├── layout/
│   ├── Card.tsx                # Card container
│   ├── Modal.tsx               # Already exists - enhance
│   ├── Drawer.tsx              # Slide-out drawer
│   ├── Popover.tsx             # Floating content
│   ├── Tooltip.tsx             # Hover tooltips
│   ├── Accordion.tsx           # Already exists - enhance
│   ├── Tabs.tsx                # Tab navigation
│   ├── Separator.tsx           # Visual separators
│   └── index.ts                # Layout exports
├── navigation/
│   ├── Menu.tsx                # Dropdown menus
│   ├── Breadcrumb.tsx          # Breadcrumb navigation
│   ├── Pagination.tsx          # Page navigation
│   ├── Stepper.tsx             # Step-by-step process
│   └── index.ts                # Navigation exports
├── data/
│   ├── Table.tsx               # Data tables
│   ├── List.tsx                # List components
│   ├── Grid.tsx                # Grid layouts
│   ├── DataTable.tsx           # Advanced data table
│   └── index.ts                # Data exports
└── index.ts                    # Main design system exports
```

## Core Components to Build

### 1. Form System (`src/components/ui/form/`)

#### Form.tsx
- **Purpose**: Root form provider with validation context
- **Features**: 
  - Integration with validation libraries (Zod/joi)
  - Form state management
  - Submission handling
  - Error aggregation
- **Usage**: Wrap entire forms, provide validation context

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

### 3. Enhanced Button System (`src/components/ui/button/`)

#### Button.tsx (Enhance Existing)
- **Current**: Basic button with variants
- **Enhancements**:
  - Loading states
  - Icon positioning
  - Size variants
  - Accessibility improvements
  - Animation support

#### ButtonGroup.tsx
- **Purpose**: Grouped buttons
- **Features**:
  - Horizontal/vertical layouts
  - Connected styling
  - Shared state
  - Keyboard navigation
- **Usage**: Action groups, toolbar buttons

#### IconButton.tsx
- **Purpose**: Icon-only buttons
- **Features**:
  - Icon-only display
  - Size variants
  - Tooltip support
  - Accessibility
- **Usage**: Toolbar actions, compact buttons

#### LoadingButton.tsx
- **Purpose**: Button with loading state
- **Features**:
  - Loading spinner
  - Disabled state
  - Progress indication
  - Async handling
- **Usage**: Form submissions, async actions

#### ToggleButton.tsx
- **Purpose**: Toggle state button
- **Features**:
  - Toggle states
  - Visual feedback
  - Group support
  - Accessibility
- **Usage**: Toggle actions, mode switches

### 4. Feedback Components (`src/components/ui/feedback/`)

#### Alert.tsx
- **Purpose**: Alert messages
- **Features**:
  - Success/error/warning/info variants
  - Dismissible alerts
  - Icon support
  - Action buttons
- **Usage**: Form feedback, notifications

#### Toast.tsx (Enhance Existing)
- **Current**: Basic toast notifications
- **Enhancements**:
  - Multiple toast support
  - Auto-dismiss
  - Action buttons
  - Positioning options
  - Animation improvements

#### Badge.tsx
- **Purpose**: Status badges
- **Features**:
  - Status variants
  - Size options
  - Custom colors
  - Icon support
- **Usage**: Status indicators, counts

#### Progress.tsx
- **Purpose**: Progress indicators
- **Features**:
  - Linear/circular progress
  - Percentage display
  - Indeterminate state
  - Custom styling
- **Usage**: Loading states, progress tracking

#### Spinner.tsx
- **Purpose**: Loading spinners
- **Features**:
  - Size variants
  - Color options
  - Animation controls
  - Accessibility
- **Usage**: Loading states, async operations

#### Skeleton.tsx
- **Purpose**: Loading placeholders
- **Features**:
  - Content placeholders
  - Animation effects
  - Custom shapes
  - Responsive design
- **Usage**: Loading states, content placeholders

### 5. Layout Components (`src/components/ui/layout/`)

#### Card.tsx
- **Purpose**: Card container
- **Features**:
  - Header/content/footer sections
  - Variants (elevated, outlined)
  - Interactive states
  - Custom styling
- **Usage**: Content containers, feature cards

#### Modal.tsx (Enhance Existing)
- **Current**: Basic modal functionality
- **Enhancements**:
  - Size variants
  - Animation improvements
  - Accessibility enhancements
  - Nested modal support
  - Custom positioning

#### Drawer.tsx
- **Purpose**: Slide-out drawer
- **Features**:
  - Slide directions
  - Overlay support
  - Size variants
  - Animation controls
- **Usage**: Mobile navigation, side panels

#### Popover.tsx
- **Purpose**: Floating content
- **Features**:
  - Positioning options
  - Trigger controls
  - Custom content
  - Animation support
- **Usage**: Context menus, tooltips

#### Tooltip.tsx
- **Purpose**: Hover tooltips
- **Features**:
  - Positioning options
  - Delay controls
  - Rich content
  - Accessibility
- **Usage**: Help text, additional information

#### Accordion.tsx (Enhance Existing)
- **Current**: Basic accordion functionality
- **Enhancements**:
  - Multiple open items
  - Custom styling
  - Animation improvements
  - Accessibility enhancements

#### Tabs.tsx
- **Purpose**: Tab navigation
- **Features**:
  - Horizontal/vertical tabs
  - Custom styling
  - Keyboard navigation
  - Lazy loading
- **Usage**: Content organization, navigation

#### Separator.tsx
- **Purpose**: Visual separators
- **Features**:
  - Horizontal/vertical orientation
  - Custom styling
  - Spacing options
  - Accessibility
- **Usage**: Content separation, visual hierarchy

### 6. Navigation Components (`src/components/ui/navigation/`)

#### Menu.tsx
- **Purpose**: Dropdown menus
- **Features**:
  - Nested menus
  - Keyboard navigation
  - Custom styling
  - Accessibility
- **Usage**: Context menus, navigation

#### Breadcrumb.tsx
- **Purpose**: Breadcrumb navigation
- **Features**:
  - Hierarchical navigation
  - Custom separators
  - Link support
  - Responsive design
- **Usage**: Page navigation, hierarchy

#### Pagination.tsx
- **Purpose**: Page navigation
- **Features**:
  - Page controls
  - Size options
  - Custom styling
  - Accessibility
- **Usage**: Data pagination, navigation

#### Stepper.tsx
- **Purpose**: Step-by-step process
- **Features**:
  - Step indicators
  - Progress tracking
  - Custom styling
  - Navigation controls
- **Usage**: Onboarding flows, multi-step forms

### 7. Data Components (`src/components/ui/data/`)

#### Table.tsx
- **Purpose**: Basic data tables
- **Features**:
  - Column definitions
  - Sorting functionality
  - Custom styling
  - Responsive design
- **Usage**: Data display, simple tables

#### List.tsx
- **Purpose**: List components
- **Features**:
  - Item rendering
  - Selection support
  - Custom styling
  - Virtualization
- **Usage**: Item lists, data display

#### Grid.tsx
- **Purpose**: Grid layouts
- **Features**:
  - Responsive columns
  - Gap controls
  - Custom styling
  - Item alignment
- **Usage**: Layout grids, card grids

#### DataTable.tsx
- **Purpose**: Advanced data table
- **Features**:
  - Sorting/filtering
  - Pagination
  - Column resizing
  - Row selection
  - Export functionality
- **Usage**: Complex data display, admin interfaces

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

### Phase 1: Core Form System
1. Build Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription
2. Create base Input, Textarea, Select, Checkbox components
3. Implement validation integration
4. Update existing forms to use new system

### Phase 2: Enhanced Inputs
1. Build specialized inputs (PasswordInput, EmailInput, PhoneInput, etc.)
2. Create advanced inputs (DatePicker, FileInput, SearchInput)
3. Implement input validation patterns
4. Update authentication and onboarding flows

### Phase 3: Feedback and Layout
1. Build feedback components (Alert, Badge, Progress, Spinner)
2. Create layout components (Card, Drawer, Popover, Tooltip)
3. Enhance existing Modal and Accordion components
4. Update settings and data display pages

### Phase 4: Navigation and Data
1. Build navigation components (Menu, Breadcrumb, Pagination, Stepper)
2. Create data components (Table, List, Grid, DataTable)
3. Implement advanced data handling
4. Update complex data display areas

### Phase 5: Advanced Features
1. Build advanced inputs (RichTextEditor, CodeEditor, MultiSelect)
2. Create specialized components for legal use cases
3. Implement accessibility enhancements
4. Add animation and interaction improvements

## Design Principles

### 1. Consistency
- Unified styling approach using Tailwind CSS
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
- Lazy loading for complex components
- Optimized animations

### 4. Flexibility
- Composable component architecture
- Customizable styling options
- Extensible validation system
- Theme support

### 5. Developer Experience
- TypeScript support throughout
- Clear component APIs
- Comprehensive documentation
- Easy integration patterns

### 6. Legal Compliance
- PII protection in form handling
- Attorney-client privilege considerations
- Data validation and sanitization
- Audit trail support

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
- Faster component development
- Consistent patterns across the app
- Reduced code duplication
- Better maintainability

### 2. User Experience
- Consistent interface behavior
- Better accessibility
- Improved performance
- Enhanced visual design

### 3. Legal Compliance
- Standardized data handling
- Consistent validation patterns
- Better audit capabilities
- Enhanced security

### 4. Scalability
- Easy addition of new components
- Consistent architecture
- Better testing capabilities
- Future-proof design

This design system will provide a solid foundation for building consistent, accessible, and maintainable user interfaces throughout the Blawby AI application while maintaining the existing patterns and improving upon them systematically.
