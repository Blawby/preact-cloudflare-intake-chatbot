// Tool definitions with structured schemas
export const collectContactInfo = {
  name: 'collect_contact_info',
  description: 'Collect and validate client contact information including location for jurisdiction verification',
  parameters: {
    type: 'object',
    properties: {
      name: { 
        type: 'string', 
        description: 'Client full name',
        minLength: 2,
        maxLength: 100
      },
      phone: { 
        type: 'string', 
        description: 'Client phone number',
        pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,20}$' // International format
      },
      email: { 
        type: 'string', 
        description: 'Client email address',
        format: 'email'
      },
      location: { 
        type: 'string', 
        description: 'Client location (city, state, or country)',
        examples: ['Charlotte, NC', 'North Carolina', 'NC', 'United States', 'US'],
        minLength: 2,
        maxLength: 100
      }
    },
    required: ['name', 'location'],
    anyOf: [
      { required: ['email'] },
      { required: ['phone'] }
    ],
    additionalProperties: false
  }
};

export const createMatter = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string', 
        description: 'Type of legal matter',
        enum: ['Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury', 'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review', 'Property Law', 'Administrative Law', 'General Consultation']
      },
      description: { type: 'string', description: 'Brief description of the legal issue' },
      name: { type: 'string', description: 'Client full name' },
      phone: { 
        type: 'string', 
        description: 'Client phone number',
        pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,20}$' // International format
      },
      email: { 
        type: 'string', 
        description: 'Client email address',
        format: 'email'
      },
      location: { type: 'string', description: 'Client location (city and state)' },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable' }
    },
    required: ['matter_type', 'description', 'name', 'location'],
    anyOf: [
      { required: ['phone'] },
      { required: ['email'] }
    ]
  }
};

export const requestLawyerReview = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for urgent or complex matters',
  parameters: {
    type: 'object',
    properties: {
      complexity: { type: 'string', description: 'Matter complexity level' },
      matter_type: { type: 'string', description: 'Type of legal matter' }
    },
    required: ['matter_type']
  }
};

export const analyzeDocument = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { 
        type: 'string', 
        description: 'The file ID of the uploaded document to analyze',
        pattern: '^[a-zA-Z0-9\\-_]+$'
      },
      analysis_type: { 
        type: 'string', 
        description: 'Type of analysis to perform',
        enum: ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'],
        default: 'general'
      },
      specific_question: { 
        type: 'string', 
        description: 'Optional specific question to ask about the document',
        maxLength: 500
      }
    },
    required: ['file_id']
  }
};