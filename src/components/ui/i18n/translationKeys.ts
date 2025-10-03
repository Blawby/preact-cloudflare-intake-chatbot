// Translation key constants for form components
export const FORM_KEYS = {
  // Labels
  LABELS: {
    NAME: 'forms.labels.name',
    EMAIL: 'forms.labels.email',
    PHONE: 'forms.labels.phone',
    PASSWORD: 'forms.labels.password',
    CONFIRM_PASSWORD: 'forms.labels.confirmPassword',
    BIRTHDAY: 'forms.labels.birthday',
    TERMS: 'forms.labels.terms',
    PRIVACY: 'forms.labels.privacy',
    SEARCH: 'forms.labels.search',
    SELECT: 'forms.labels.select',
    UPLOAD: 'forms.labels.upload',
    MESSAGE: 'forms.labels.message',
    SUBJECT: 'forms.labels.subject',
  },
  
  // Placeholders
  PLACEHOLDERS: {
    NAME: 'forms.placeholders.name',
    EMAIL: 'forms.placeholders.email',
    PHONE: 'forms.placeholders.phone',
    PASSWORD: 'forms.placeholders.password',
    CONFIRM_PASSWORD: 'forms.placeholders.confirmPassword',
    BIRTHDAY: 'forms.placeholders.birthday',
    SEARCH: 'forms.placeholders.search',
    SELECT: 'forms.placeholders.select',
    MESSAGE: 'forms.placeholders.message',
    SUBJECT: 'forms.placeholders.subject',
  },
  
  // Descriptions
  DESCRIPTIONS: {
    OPTIONAL: 'forms.descriptions.optional',
    REQUIRED: 'forms.descriptions.required',
    PASSWORD_HELP: 'forms.descriptions.passwordHelp',
    PHONE_HELP: 'forms.descriptions.phoneHelp',
    FILE_HELP: 'forms.descriptions.fileHelp',
  },
  
  // Validation errors
  VALIDATION: {
    REQUIRED: 'forms.validation.required',
    EMAIL: 'forms.validation.email',
    PHONE: 'forms.validation.phone',
    PASSWORD: 'forms.validation.password',
    CONFIRM_PASSWORD: 'forms.validation.confirmPassword',
    DATE: 'forms.validation.date',
    FUTURE_DATE: 'forms.validation.futureDate',
    FILE_TYPE: 'forms.validation.fileType',
    FILE_SIZE: 'forms.validation.fileSize',
    TERMS_REQUIRED: 'forms.validation.termsRequired',
  },
  
  // Accessibility
  ACCESSIBILITY: {
    TOGGLE_PASSWORD: 'forms.accessibility.togglePassword',
    CLEAR_SEARCH: 'forms.accessibility.clearSearch',
    SELECT_OPTION: 'forms.accessibility.selectOption',
    REMOVE_OPTION: 'forms.accessibility.removeOption',
    UPLOAD_FILE: 'forms.accessibility.uploadFile',
    REMOVE_FILE: 'forms.accessibility.removeFile',
    CALENDAR_OPEN: 'forms.accessibility.calendarOpen',
    CALENDAR_CLOSE: 'forms.accessibility.calendarClose',
  },
} as const;

// Namespace constants
export const NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  SETTINGS: 'settings',
  ONBOARDING: 'onboarding',
  FORMS: 'forms',
} as const;
