import { z } from 'zod';

// Base schemas
export const idSchema = z.string().min(1);
export const emailSchema = z.string().email();
export const phoneSchema = z.string().optional();
export const timestampSchema = z.number().int().positive();

// Organization role schema
export const organizationRoleSchema = z.enum(['owner', 'admin', 'attorney', 'paralegal']);

// Organization membership result schema
export const organizationMembershipSchema = z.object({
  role: organizationRoleSchema
});

// Chat schemas
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: timestampSchema,
  metadata: z.record(z.unknown()).optional()
});

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1)
  })).min(1),
  sessionId: idSchema.optional(),
  organizationId: idSchema.optional(),
  context: z.record(z.any()).optional()
});

export const chatResponseSchema = z.object({
  message: z.string(),
  sessionId: idSchema,
  timestamp: timestampSchema
});

// Matter creation schemas
export const matterCreationSchema = z.object({
  organizationId: idSchema,
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.enum(['draft', 'active', 'closed']).default('draft'),
  metadata: z.record(z.unknown()).optional()
});

export const matterUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Organization schemas
export const organizationConfigSchema = z.object({
  aiModel: z.string().min(1),
  consultationFee: z.number().min(0),
  requiresPayment: z.boolean(),
  ownerEmail: emailSchema,
  availableServices: z.array(z.string().min(1)),
  serviceQuestions: z.record(z.array(z.string().min(1))),
  domain: z.string().min(1),
  description: z.string().min(1),
  paymentLink: z.string().url().optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  introMessage: z.string().min(1),
  profileImage: z.string().url().optional(),
  voice: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['cloudflare', 'elevenlabs', 'custom']).optional(),
    voiceId: z.string().min(1).optional().nullable(),
    displayName: z.string().min(1).optional().nullable(),
    previewUrl: z.string().url().optional().nullable()
  }).optional(),

});

export const organizationSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  config: organizationConfigSchema
});

// Form schemas
export const contactFormSchema = z.object({
  organizationId: idSchema,
  email: emailSchema,
  phoneNumber: z.string().min(1),
  matterDetails: z.string().min(1),
  urgency: z.string().optional()
});



// File upload schemas
export const fileUploadSchema = z.object({
  organizationId: idSchema,
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional()
});

// Feedback schemas
export const feedbackSchema = z.object({
  organizationId: idSchema,
  sessionId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});



// Session schemas
export const sessionSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  messages: z.array(chatMessageSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  metadata: z.record(z.unknown()).optional()
});

// Export schemas
export const exportRequestSchema = z.object({
  organizationId: idSchema,
  sessionId: idSchema.optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default('20')
});

export const organizationIdQuerySchema = z.object({
  organizationId: idSchema
});

// Session request body schema
export const sessionRequestBodySchema = z.object({
  organizationId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  sessionToken: z.string().min(1).optional(),
  retentionHorizonDays: z.number().int().positive().optional()
});

// Headers schemas
export const authHeadersSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+/).optional()
});

export const contentTypeSchema = z.object({
  'content-type': z.string().includes('application/json')
});

// File upload headers schema
export const multipartHeadersSchema = z.object({
  'content-type': z.string().includes('multipart/form-data')
}); 
