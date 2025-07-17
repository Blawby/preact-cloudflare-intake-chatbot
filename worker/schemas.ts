import { z } from 'zod';

// Base schemas
export const idSchema = z.string().min(1);
export const emailSchema = z.string().email();
export const phoneSchema = z.string().optional();
export const timestampSchema = z.number().int().positive();

// Chat schemas
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: timestampSchema,
  metadata: z.record(z.any()).optional()
});

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1)
  })).min(1),
  sessionId: idSchema.optional(),
  teamId: idSchema.optional(),
  context: z.record(z.any()).optional()
});

export const chatResponseSchema = z.object({
  message: z.string(),
  sessionId: idSchema,
  timestamp: timestampSchema
});

// Matter creation schemas
export const matterCreationSchema = z.object({
  teamId: idSchema,
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.enum(['draft', 'active', 'closed']).default('draft'),
  metadata: z.record(z.any()).optional()
});

export const matterUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  metadata: z.record(z.any()).optional()
});

// Team schemas
export const teamConfigSchema = z.object({
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
  webhooks: z.object({
    enabled: z.boolean(),
    url: z.string().url(),
    secret: z.string().min(1),
    events: z.object({
      matterCreation: z.boolean(),
      matterDetails: z.boolean(),
      contactForm: z.boolean(),
      appointment: z.boolean()
    }),
    retryConfig: z.object({
      maxRetries: z.number().int().min(0).max(10),
      retryDelay: z.number().int().min(1).max(3600)
    })
  })
});

export const teamSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  config: teamConfigSchema
});

// Form schemas
export const contactFormSchema = z.object({
  teamId: idSchema,
  email: emailSchema,
  phoneNumber: z.string().min(1),
  matterDetails: z.string().min(1),
  urgency: z.string().optional()
});

// Scheduling schemas
export const appointmentSchema = z.object({
  teamId: idSchema,
  name: z.string().min(1).max(100),
  email: emailSchema,
  phone: phoneSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  service: z.string().min(1),
  notes: z.string().max(500).optional()
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  notes: z.string().max(500).optional()
});

// File upload schemas
export const fileUploadSchema = z.object({
  teamId: idSchema,
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  metadata: z.record(z.any()).optional()
});

// Feedback schemas
export const feedbackSchema = z.object({
  teamId: idSchema,
  sessionId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

// Webhook schemas
export const webhookEventSchema = z.object({
  type: z.enum(['matterCreation', 'matterDetails', 'contactForm', 'appointment']),
  data: z.record(z.any()),
  timestamp: timestampSchema,
  signature: z.string().optional()
});

export const webhookVerificationSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(1)
});

// Session schemas
export const sessionSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  messages: z.array(chatMessageSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  metadata: z.record(z.any()).optional()
});

// Export schemas
export const exportRequestSchema = z.object({
  teamId: idSchema,
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

export const teamIdQuerySchema = z.object({
  teamId: idSchema
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