# Intake v2 Implementation Plan
## Enhanced AI-Powered Legal Intake with Guaranteed Data Collection

### 🎯 **Overview**

This plan implements Kimi's suggested approach: **prompt-first intake with hard-coded required fields** while maintaining backward compatibility and webhook reliability.

### 📊 **Current State Analysis**

Your existing system already has:
- ✅ **Robust webhook system** with retry logic and signature verification
- ✅ **Multi-tenant team configuration** with custom questions
- ✅ **AI quality assessment** with comprehensive scoring
- ✅ **Production-ready database schema** with matter tracking
- ✅ **Domain-based team routing** and payment integration

### 🚀 **Implementation Phases**

#### **Phase 0: Enhanced Prompt Wrapper (This Week)**
**Goal**: Wrap existing questions with required field enforcement

**Changes Made:**
1. ✅ **Enhanced matter creation flow** - Added required field validation
2. ✅ **Contact extraction** - Extract structured contact data from answers
3. ✅ **Webhook payload enhancement** - Include contact info in webhooks
4. ✅ **Backward compatibility** - Existing teams continue working

**Key Features:**
- **Required Fields**: `full_name`, `email`, `phone` are now enforced
- **Smart Validation**: Checks for missing fields before proceeding
- **Contact Extraction**: Automatically extracts contact info from answers
- **Enhanced Webhooks**: Include structured contact data in payloads

#### **Phase 1: Prompt-Only Toggle (Next Sprint)**
**Goal**: Add feature flag for prompt-only mode

**Implementation:**
```typescript
// New team configuration option
"promptOnly": {
  "enabled": false, // Feature flag
  "requiredFields": ["full_name", "email", "phone"],
  "empathyPrompts": {
    "Family Law": "I know family situations can be really difficult...",
    "Employment Law": "I'm sorry you're dealing with workplace issues..."
  }
}
```

**Benefits:**
- **Lawyer Control**: Teams can choose between fixed questions or AI prompts
- **Empathy Customization**: Custom empathy prompts per practice area
- **Data Completeness**: Guaranteed collection of required fields
- **Flexibility**: Gradual migration path for existing teams

#### **Phase 2: Full Prompt-Only Mode (Future)**
**Goal**: Complete transition to AI-driven intake

**Features:**
- **Dynamic Question Generation**: AI generates context-aware questions
- **Conversational Flow**: Natural conversation with data validation
- **Quality Assurance**: AI ensures completeness before webhook firing
- **Audit Trail**: Complete transcript logging for compliance

### 🔧 **Technical Implementation**

#### **Enhanced Webhook Payload**
```json
{
  "event": "matter_details",
  "timestamp": "2025-01-17T23:47:26.000Z",
  "teamId": "01K0TNGNKNJEP8EPKHXAQV4S0R",
  "contact": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "matter": {
    "matterId": "01K0TNGNKTM4Q0AG0XF0A8ST0Q",
    "service": "Family Law",
    "summary": "# Family Law Matter Summary...",
    "qualityScore": {
      "score": 85,
      "readyForLawyer": true
    }
  }
}
```

#### **Required Field Validation**
```typescript
function validateRequiredFields(answers: Record<string, any>): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = ['full_name', 'email', 'phone'];
  // Implementation ensures data completeness
}
```

#### **Contact Extraction**
```typescript
function extractContactInfo(answers: Record<string, any>): {
  full_name?: string;
  email?: string;
  phone?: string;
} {
  // Smart extraction from various answer formats
}
```

### 🛡️ **Reliability Guarantees**

#### **Webhook Reliability**
- ✅ **Retry Logic**: 3x exponential backoff (60s, 120s, 240s)
- ✅ **Signature Verification**: HMAC-SHA256 with timestamp
- ✅ **Idempotency**: Webhook ID prevents duplicates
- ✅ **Error Handling**: Graceful degradation on failures
- ✅ **Logging**: Complete audit trail in database

#### **Data Completeness**
- ✅ **Required Field Enforcement**: Cannot proceed without contact info
- ✅ **Validation**: Real-time validation of collected data
- ✅ **Fallback**: Human escalation after 2 failed attempts
- ✅ **Audit Trail**: Complete conversation logging

### 📈 **Migration Strategy**

#### **For Existing Teams**
1. **Phase 0**: Enhanced validation (no breaking changes)
2. **Phase 1**: Opt-in prompt-only mode
3. **Phase 2**: Gradual migration with feature flags

#### **For New Teams**
1. **Default**: Prompt-only mode enabled
2. **Customization**: Empathy prompts per practice area
3. **Required Fields**: Hard-coded data collection

### 🎯 **Success Metrics**

#### **Data Quality**
- **Contact Collection Rate**: Target 95%+ complete contact info
- **Webhook Success Rate**: Target 99%+ successful deliveries
- **Quality Scores**: Target 80%+ matters ready for lawyer

#### **User Experience**
- **Completion Rate**: Target 85%+ matter creation completion
- **Time to Complete**: Target <5 minutes for full intake
- **User Satisfaction**: Measure via feedback ratings

### 🔄 **Next Steps**

1. **Test Phase 0**: Deploy enhanced validation to staging
2. **Monitor Metrics**: Track contact collection and webhook success
3. **Gather Feedback**: Collect lawyer input on prompt-only mode
4. **Plan Phase 1**: Design prompt-only toggle UI
5. **Implement Phase 1**: Add feature flag and empathy prompts

### 💡 **Key Benefits**

- **Guaranteed Data**: Never miss required contact information
- **Lawyer Control**: Choose between fixed questions or AI prompts
- **Webhook Reliability**: 99%+ successful client creation
- **Scalability**: Works for solo practitioners to large firms
- **Compliance**: Complete audit trail for legal requirements

This implementation maintains your existing webhook reliability while adding the enhanced data collection capabilities Kimi suggested. The phased approach ensures smooth migration and minimal disruption to existing teams. 