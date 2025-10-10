# Blawby AI Chatbot - Coding Standards

## Core Principles
- **Use npm** (not pnpm/yarn)
- **No `any` types** - use proper TypeScript
- **Legal compliance first** - PII protection, attorney-client privilege
- **Error handling everywhere** - never let errors bubble up unhandled
- **Structured logging** - correlation IDs, PII sanitization
- **Iterate on existing patterns** - don't create new patterns without good reason

## Project Architecture

### Frontend (Preact)
```typescript
// Component structure
interface ComponentProps {
  // Required props first
  requiredProp: string;
  // Optional props with defaults
  optionalProp?: boolean;
  // Event handlers
  onSubmit?: (data: any) => void | Promise<void>;
  // Children last
  children?: preact.ComponentChildren;
}

// Always use FunctionComponent with explicit return type
const MyComponent: FunctionComponent<ComponentProps> = ({ requiredProp, optionalProp = false, onSubmit, children }) => {
  // State management
  const [state, setState] = useState<StateType>(initialValue);
  
  // Event handlers with proper typing
  const handleSubmit = useCallback(async (data: FormData) => {
    if (!onSubmit) return;
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Submit error:', error);
    }
  }, [onSubmit]);

  return (
    <div class="component-wrapper">
      {children}
    </div>
  );
};
```

### Backend (Cloudflare Workers)
```typescript
// Route handler pattern
export async function handleRoute(request: Request, env: Env): Promise<Response> {
  try {
    // Input validation first
    const body = await parseJsonBody(request);
    if (!isValidInput(body)) {
      throw HttpErrors.badRequest('Invalid input');
    }

    // Business logic
    const result = await processRequest(body, env);
    
    // Success response
    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

// Service class pattern
export class MyService {
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }

  async processData(data: InputType): Promise<ServiceResult> {
    try {
      // Validation
      this.validateInput(data);
      
      // Processing
      const result = await this.performOperation(data);
      
      // Logging
      Logger.info('Operation completed', { resultId: result.id });
      
      return result;
    } catch (error) {
      Logger.error('Operation failed', { error: error.message });
      throw error;
    }
  }
}
```

## Error Handling

### Frontend Error Boundaries
```typescript
// Always wrap components in ErrorBoundary
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Component error handling
const handleError = (error: Error) => {
  console.error('Component error:', error);
  // Show user-friendly message
  setError('Something went wrong. Please try again.');
};
```

### Backend Error Handling
```typescript
// Use existing error types
throw HttpErrors.badRequest('Invalid input');
throw HttpErrors.notFound('Resource not found');
throw HttpErrors.internalServerError('Processing failed');

// Custom errors with context
throw new LegalIntakeError('Invalid matter type', { matterType, sessionId }, false);

// Always use handleError for responses
return handleError(error);
```

## Logging Standards

### Structured Logging
```typescript
// Use LegalIntakeLogger for business operations
LegalIntakeLogger.logBusinessOperation(
  correlationId,
  sessionId,
  organizationId,
  'matter_created',
  { matterType, matterId }
);

// Use Logger for technical operations
Logger.info('API request received', { 
  endpoint: '/api/chat',
  method: 'POST',
  correlationId 
});

// Always sanitize PII
const sanitizedData = sanitizeForLogging(userData);
Logger.info('User action', sanitizedData);
```

### Log Levels
- **ERROR**: Exceptions, failures that affect functionality
- **WARN**: Unexpected but recoverable situations
- **INFO**: Business operations, state changes
- **DEBUG**: Detailed troubleshooting (development only)

## Type Safety

### Domain Types
```typescript
// Use existing domain types
type MatterType = 'personal_injury' | 'family_law' | 'criminal_defense';
type MessageRole = 'user' | 'assistant' | 'system';
type PaymentStatus = 'pending' | 'completed' | 'failed';

// Component prop interfaces
interface MessageProps {
  content: string;
  isUser: boolean;
  files?: FileAttachment[];
  matterCanvas?: MatterCanvas;
  paymentEmbed?: PaymentEmbed;
  // ... other specific props
}
```

### Validation
```typescript
// Input validation with proper error messages
function validateContactForm(data: unknown): ContactData {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid form data');
  }
  
  const { name, email, phone } = data as any;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Name is required');
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Valid email is required');
  }
  
  return { name: name.trim(), email: email.trim(), phone: phone?.trim() };
}
```

## Security & Legal Compliance

### PII Protection
```typescript
// Always sanitize before logging
const sanitizedContent = await sanitizeForLogging(content);

// Use correlation IDs instead of user identifiers in logs
Logger.info('User action', { 
  correlationId, 
  action: 'file_upload',
  // Never log: userId, email, phone, etc.
});

// Encrypt sensitive data
const encryptedData = await encryptSensitiveData(clientInfo);
```

### Input Validation
```typescript
// Validate all inputs at boundaries
function validateFileUpload(file: File): void {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  if (file.size > maxSize) {
    throw new ValidationError('File too large');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Invalid file type');
  }
}
```

## File Organization

### Component Structure
```
src/components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   └── Modal.tsx
├── AppLayout.tsx          # Main layout
├── ChatContainer.tsx      # Chat functionality
├── Message.tsx           # Message display
└── ContactForm.tsx       # Form components
```

### Worker Structure
```
worker/
├── routes/               # API endpoints
│   ├── agent.ts
│   ├── payment.ts
│   └── analyze.ts
├── services/             # Business logic
│   ├── PaymentService.ts
│   └── LawyerSearchService.ts
├── agents/               # AI agents
│   └── legal-intake/
├── middleware/           # Cross-cutting concerns
└── utils/               # Utilities
```

## Testing Patterns

### Component Testing
```typescript
// Use existing test patterns
describe('ContactForm', () => {
  it('should validate required fields', () => {
    render(<ContactForm onSubmit={mockSubmit} />);
    
    fireEvent.click(screen.getByText('Submit'));
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
```

### Service Testing
```typescript
// Mock external dependencies
describe('PaymentService', () => {
  it('should create invoice successfully', async () => {
    const mockEnv = createMockEnv();
    const service = new PaymentService(mockEnv);
    
    const result = await service.createInvoice(validRequest);
    
    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBeDefined();
  });
});
```

## Common Patterns

### State Management
```typescript
// Use existing hooks
const { messages, addMessage, isLoading } = useMessageHandling();
const { showToast } = useToast();
const { isDark } = useTheme();

// Local state with proper typing
const [formData, setFormData] = useState<FormData>({
  name: '',
  email: '',
  phone: ''
});
```

### API Integration
```typescript
// Use existing service patterns
const result = await PaymentServiceFactory.processPayment(
  env,
  paymentRequest,
  organizationConfig
);

// Handle responses consistently
if (result.success) {
  showToast('Payment created successfully', 'success');
} else {
  showToast(result.error, 'error');
}
```

## Code Quality Rules

1. **Keep files under 500 lines** - split into multiple files if needed
2. **Use existing patterns** - don't reinvent the wheel
3. **Validate all inputs** - especially user-provided data
4. **Handle all errors** - never let them bubble up unhandled
5. **Log with context** - include correlation IDs and relevant metadata
6. **Protect PII** - sanitize before logging, encrypt when storing
7. **Use TypeScript strictly** - no `any` types, explicit return types
8. **Test critical paths** - especially payment and legal data handling
9. **Follow naming conventions** - camelCase for variables, PascalCase for components
10. **Document complex logic** - explain the "why", not the "what"

## Environment-Specific Rules

### Development
- Use mock services for external APIs
- Enable debug logging
- Use localhost URLs for testing

### Production
- Use real services
- Sanitize all logs
- Enable error monitoring
- Use production URLs and keys

---

**Remember**: These standards are based on your existing codebase patterns. When in doubt, look at similar existing code and follow those patterns.
