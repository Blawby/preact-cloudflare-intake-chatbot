import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('useFormValidation schema type detection', () => {
  describe('ZodObject schema', () => {
    it('should be detected as ZodObject', () => {
      const zodObjectSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
      });

      expect(zodObjectSchema instanceof z.ZodObject).toBe(true);
      expect('pick' in zodObjectSchema).toBe(true);
    });

    it('should have pick method available', () => {
      const zodObjectSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
      });

      // Test that pick method works
      const nameSchema = zodObjectSchema.pick({ name: true });
      expect(nameSchema instanceof z.ZodObject).toBe(true);
      
      // Test validation with picked schema
      expect(() => nameSchema.parse({ name: 'John' })).not.toThrow();
      expect(() => nameSchema.parse({ name: 'J' })).toThrow();
    });
  });

  describe('Union schema', () => {
    it('should be detected as ZodUnion, not ZodObject', () => {
      const unionSchema = z.union([
        z.object({
          type: z.literal('person'),
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Invalid email format'),
        }),
        z.object({
          type: z.literal('company'),
          name: z.string().min(2, 'Company name must be at least 2 characters'),
          taxId: z.string().min(5, 'Tax ID must be at least 5 characters'),
        }),
      ]);

      expect(unionSchema instanceof z.ZodObject).toBe(false);
      expect(unionSchema instanceof z.ZodUnion).toBe(true);
      expect('pick' in unionSchema).toBe(false);
    });

    it('should validate correctly without pick method', () => {
      const unionSchema = z.union([
        z.object({
          type: z.literal('person'),
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Invalid email format'),
        }),
        z.object({
          type: z.literal('company'),
          name: z.string().min(2, 'Company name must be at least 2 characters'),
          taxId: z.string().min(5, 'Tax ID must be at least 5 characters'),
        }),
      ]);

      // Test valid person object
      expect(() => unionSchema.parse({
        type: 'person',
        name: 'John',
        email: 'john@example.com'
      })).not.toThrow();

      // Test valid company object
      expect(() => unionSchema.parse({
        type: 'company',
        name: 'Acme Corp',
        taxId: '12345'
      })).not.toThrow();

      // Test invalid person object (short name)
      expect(() => unionSchema.parse({
        type: 'person',
        name: 'J',
        email: 'john@example.com'
      })).toThrow();
    });
  });

  describe('Intersection schema', () => {
    it('should be detected as ZodIntersection, not ZodObject', () => {
      const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
      });

      const contactSchema = z.object({
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
      });

      const intersectionSchema = baseSchema.and(contactSchema);

      expect(intersectionSchema instanceof z.ZodObject).toBe(false);
      expect(intersectionSchema instanceof z.ZodIntersection).toBe(true);
      expect('pick' in intersectionSchema).toBe(false);
    });

    it('should validate correctly without pick method', () => {
      const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
      });

      const contactSchema = z.object({
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
      });

      const intersectionSchema = baseSchema.and(contactSchema);

      // Test valid object
      expect(() => intersectionSchema.parse({
        name: 'John',
        email: 'john@example.com'
      })).not.toThrow();

      // Test invalid object (short name)
      expect(() => intersectionSchema.parse({
        name: 'J',
        email: 'john@example.com'
      })).toThrow();

      // Test invalid object (bad email)
      expect(() => intersectionSchema.parse({
        name: 'John',
        email: 'invalid-email'
      })).toThrow();
    });
  });

  describe('Error extraction from ZodError', () => {
    it('should extract field-specific errors correctly', () => {
      const schema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18 years old'),
      });

      try {
        schema.parse({
          name: 'J',
          email: 'invalid-email',
          age: 16
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Test error extraction logic
          const nameError = error.issues.find(e => e.path[0] === 'name');
          const emailError = error.issues.find(e => e.path[0] === 'email');
          const ageError = error.issues.find(e => e.path[0] === 'age');

          expect(nameError).toBeDefined();
          expect(nameError?.message).toBe('Name must be at least 2 characters');

          expect(emailError).toBeDefined();
          expect(emailError?.message).toBe('Invalid email format');

          expect(ageError).toBeDefined();
          expect(ageError?.message).toBe('Must be at least 18 years old');
        }
      }
    });

    it('should handle union schema error extraction', () => {
      const unionSchema = z.union([
        z.object({
          type: z.literal('person'),
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Invalid email format'),
        }),
        z.object({
          type: z.literal('company'),
          name: z.string().min(2, 'Company name must be at least 2 characters'),
          taxId: z.string().min(5, 'Tax ID must be at least 5 characters'),
        }),
      ]);

      try {
        unionSchema.parse({
          type: 'person',
          name: 'J',
          email: 'invalid-email'
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Test error extraction logic for union schemas
          const nameError = error.issues.find(e => e.path[0] === 'name');
          const emailError = error.issues.find(e => e.path[0] === 'email');

          expect(nameError).toBeDefined();
          expect(nameError?.message).toBe('Name must be at least 2 characters');

          expect(emailError).toBeDefined();
          expect(emailError?.message).toBe('Invalid email format');
        }
      }
    });
  });

  describe('Runtime type checking', () => {
    it('should correctly identify schema types at runtime', () => {
      const zodObjectSchema = z.object({ name: z.string() });
      const unionSchema = z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]);
      const intersectionSchema = z.object({ a: z.string() }).and(z.object({ b: z.string() }));

      // Test instanceof checks
      expect(zodObjectSchema instanceof z.ZodObject).toBe(true);
      expect(unionSchema instanceof z.ZodObject).toBe(false);
      expect(intersectionSchema instanceof z.ZodObject).toBe(false);

      // Test method availability
      expect('pick' in zodObjectSchema).toBe(true);
      expect('pick' in unionSchema).toBe(false);
      expect('pick' in intersectionSchema).toBe(false);
    });
  });
});