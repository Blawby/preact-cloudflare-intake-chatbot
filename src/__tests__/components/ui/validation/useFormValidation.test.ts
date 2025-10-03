import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('useFormValidation schema type detection', () => {
  describe('ZodObject schema type detection', () => {
    it('should be detected as ZodObject and have pick method', () => {
      const zodObjectSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
      });

      // Test schema type detection logic used by useFormValidation
      expect(zodObjectSchema instanceof z.ZodObject).toBe(true);
      expect('pick' in zodObjectSchema).toBe(true);
    });

    it('should allow field-specific validation using pick method', () => {
      const zodObjectSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
      });

      // Test that pick method works for field-specific validation
      const nameSchema = zodObjectSchema.pick({ name: true });
      expect(nameSchema instanceof z.ZodObject).toBe(true);
      
      // Test validation with picked schema
      expect(() => nameSchema.parse({ name: 'John' })).not.toThrow();
      expect(() => nameSchema.parse({ name: 'J' })).toThrow();
    });

    it('should validate individual fields correctly', () => {
      const zodObjectSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
      });

      // Test name validation
      const nameSchema = zodObjectSchema.pick({ name: true });
      expect(() => nameSchema.parse({ name: 'John' })).not.toThrow();
      expect(() => nameSchema.parse({ name: 'J' })).toThrow();

      // Test email validation
      const emailSchema = zodObjectSchema.pick({ email: true });
      expect(() => emailSchema.parse({ email: 'john@example.com' })).not.toThrow();
      expect(() => emailSchema.parse({ email: 'invalid-email' })).toThrow();
    });
  });

  describe('Union schema type detection', () => {
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

      // Test schema type detection logic used by useFormValidation
      expect(unionSchema instanceof z.ZodObject).toBe(false);
      expect(unionSchema instanceof z.ZodUnion).toBe(true);
      expect('pick' in unionSchema).toBe(false);
    });

    it('should require full object validation (no pick method available)', () => {
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

      // Test that full object validation is required for union schemas
      expect(() => unionSchema.parse({
        type: 'person',
        name: 'John',
        email: 'john@example.com'
      })).not.toThrow();

      expect(() => unionSchema.parse({
        type: 'person',
        name: 'J',
        email: 'john@example.com'
      })).toThrow();
    });

    it('should validate different union types correctly', () => {
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

  describe('Intersection schema type detection', () => {
    it('should be detected as ZodIntersection, not ZodObject', () => {
      const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
      });

      const contactSchema = z.object({
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
      });

      const intersectionSchema = baseSchema.and(contactSchema);

      // Test schema type detection logic used by useFormValidation
      expect(intersectionSchema instanceof z.ZodObject).toBe(false);
      expect(intersectionSchema instanceof z.ZodIntersection).toBe(true);
      expect('pick' in intersectionSchema).toBe(false);
    });

    it('should require full object validation (no pick method available)', () => {
      const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
      });

      const contactSchema = z.object({
        email: z.string().email('Invalid email format'),
        phone: z.string().optional(),
      });

      const intersectionSchema = baseSchema.and(contactSchema);

      // Test that full object validation is required for intersection schemas
      expect(() => intersectionSchema.parse({
        name: 'John',
        email: 'john@example.com'
      })).not.toThrow();

      expect(() => intersectionSchema.parse({
        name: 'J',
        email: 'john@example.com'
      })).toThrow();
    });

    it('should validate all fields in intersection correctly', () => {
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

      expect(() => {
        schema.parse({
          name: 'J',
          email: 'invalid-email',
          age: 16
        });
      }).toThrow(z.ZodError);

      // Test error extraction logic used by useFormValidation
      try {
        schema.parse({
          name: 'J',
          email: 'invalid-email',
          age: 16
        });
        expect.fail('Expected ZodError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        
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

      expect(() => {
        unionSchema.parse({
          type: 'person',
          name: 'J',
          email: 'invalid-email'
        });
      }).toThrow(z.ZodError);

      // Test error extraction logic for union schemas used by useFormValidation
      try {
        unionSchema.parse({
          type: 'person',
          name: 'J',
          email: 'invalid-email'
        });
        expect.fail('Expected ZodError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        
        const nameError = error.issues.find(e => e.path[0] === 'name');
        const emailError = error.issues.find(e => e.path[0] === 'email');

        expect(nameError).toBeDefined();
        expect(nameError?.message).toBe('Name must be at least 2 characters');

        expect(emailError).toBeDefined();
        expect(emailError?.message).toBe('Invalid email format');
      }
    });

    it('should handle successful validation without errors', () => {
      const schema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18 years old'),
      });

      // Test successful validation
      expect(() => schema.parse({
        name: 'John',
        email: 'john@example.com',
        age: 25
      })).not.toThrow();
    });
  });

  describe('Runtime type checking for useFormValidation logic', () => {
    it('should correctly identify schema types at runtime', () => {
      const zodObjectSchema = z.object({ name: z.string() });
      const unionSchema = z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]);
      const intersectionSchema = z.object({ a: z.string() }).and(z.object({ b: z.string() }));

      // Test instanceof checks used by useFormValidation
      expect(zodObjectSchema instanceof z.ZodObject).toBe(true);
      expect(unionSchema instanceof z.ZodObject).toBe(false);
      expect(intersectionSchema instanceof z.ZodObject).toBe(false);

      // Test method availability used by useFormValidation
      expect('pick' in zodObjectSchema).toBe(true);
      expect('pick' in unionSchema).toBe(false);
      expect('pick' in intersectionSchema).toBe(false);
    });

    it('should demonstrate the validation strategy for different schema types', () => {
      // ZodObject: Can use pick method for field-specific validation
      const zodObjectSchema = z.object({ 
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format')
      });

      // This is how useFormValidation would validate a single field for ZodObject
      const fieldSchema = zodObjectSchema.pick({ name: true });
      expect(() => fieldSchema.parse({ name: 'John' })).not.toThrow();
      expect(() => fieldSchema.parse({ name: 'J' })).toThrow();

      // Union: Must validate full object (no pick method)
      const unionSchema = z.union([
        z.object({
          type: z.literal('person'),
          name: z.string().min(2, 'Name must be at least 2 characters'),
        }),
        z.object({
          type: z.literal('company'),
          name: z.string().min(2, 'Company name must be at least 2 characters'),
        }),
      ]);

      // This is how useFormValidation would validate for Union (full object)
      expect(() => unionSchema.parse({
        type: 'person',
        name: 'John'
      })).not.toThrow();
      expect(() => unionSchema.parse({
        type: 'person',
        name: 'J'
      })).toThrow();

      // Intersection: Must validate full object (no pick method)
      const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
      });
      const contactSchema = z.object({
        email: z.string().email('Invalid email format'),
      });
      const intersectionSchema = baseSchema.and(contactSchema);

      // This is how useFormValidation would validate for Intersection (full object)
      expect(() => intersectionSchema.parse({
        name: 'John',
        email: 'john@example.com'
      })).not.toThrow();
      expect(() => intersectionSchema.parse({
        name: 'J',
        email: 'john@example.com'
      })).toThrow();
    });
  });
});