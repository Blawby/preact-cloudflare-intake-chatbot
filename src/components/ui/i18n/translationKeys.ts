// Translation key constants for form components
export const FORM_KEYS = {
  // Labels
  LABELS: {
    NAME: 'common:forms.labels.name',
    EMAIL: 'common:forms.labels.email',
    PHONE: 'common:forms.labels.phone',
    PASSWORD: 'common:forms.labels.password',
    CONFIRM_PASSWORD: 'common:forms.labels.confirmPassword',
    BIRTHDAY: 'common:forms.labels.birthday',
    TERMS: 'common:forms.labels.terms',
    PRIVACY: 'common:forms.labels.privacy',
    SEARCH: 'common:forms.labels.search',
    SELECT: 'common:forms.labels.select',
    UPLOAD: 'common:forms.labels.upload',
    MESSAGE: 'common:forms.labels.message',
    SUBJECT: 'common:forms.labels.subject',
  },
  
  // Placeholders
  PLACEHOLDERS: {
    NAME: 'common:forms.placeholders.name',
    EMAIL: 'common:forms.placeholders.email',
    PHONE: 'common:forms.placeholders.phone',
    PASSWORD: 'common:forms.placeholders.password',
    CONFIRM_PASSWORD: 'common:forms.placeholders.confirmPassword',
    BIRTHDAY: 'common:forms.placeholders.birthday',
    SEARCH: 'common:forms.placeholders.search',
    SELECT: 'common:forms.placeholders.select',
    MESSAGE: 'common:forms.placeholders.message',
    SUBJECT: 'common:forms.placeholders.subject',
  },
  
  // Descriptions
  DESCRIPTIONS: {
    OPTIONAL: 'common:forms.descriptions.optional',
    REQUIRED: 'common:forms.descriptions.required',
    PASSWORD_HELP: 'common:forms.descriptions.passwordHelp',
    PHONE_HELP: 'common:forms.descriptions.phoneHelp',
    FILE_HELP: 'common:forms.descriptions.fileHelp',
  },
  
  // Validation errors
  VALIDATION: {
    REQUIRED: 'common:forms.validation.required',
    EMAIL: 'common:forms.validation.email',
    PHONE: 'common:forms.validation.phone',
    PASSWORD: 'common:forms.validation.password',
    CONFIRM_PASSWORD: 'common:forms.validation.confirmPassword',
    DATE: 'common:forms.validation.date',
    FUTURE_DATE: 'common:forms.validation.futureDate',
    FILE_TYPE: 'common:forms.validation.fileType',
    FILE_SIZE: 'common:forms.validation.fileSize',
    TERMS_REQUIRED: 'common:forms.validation.termsRequired',
  },
  
  // Accessibility
  ACCESSIBILITY: {
    TOGGLE_PASSWORD: 'common:forms.accessibility.togglePassword',
    CLEAR_SEARCH: 'common:forms.accessibility.clearSearch',
    SELECT_OPTION: 'common:forms.accessibility.selectOption',
    REMOVE_OPTION: 'common:forms.accessibility.removeOption',
    UPLOAD_FILE: 'common:forms.accessibility.uploadFile',
    REMOVE_FILE: 'common:forms.accessibility.removeFile',
    CALENDAR_OPEN: 'common:forms.accessibility.calendarOpen',
    CALENDAR_CLOSE: 'common:forms.accessibility.calendarClose',
  },
} as const;

// Namespace constants
export const NAMESPACES = {
  COMMON: 'common',
  AUTH: 'auth',
  SETTINGS: 'settings',
  ONBOARDING: 'onboarding',
} as const;
