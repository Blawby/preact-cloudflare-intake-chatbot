# Blawby API Integration

This document describes the integration with the app.blawby.com API for client creation and invoice generation.

## Overview

The integration replaces the mock payment service with real API calls to app.blawby.com for:
- Creating customers/clients
- Generating invoices
- Managing payment links
- Tracking payment status

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Blawby API Configuration
BLAWBY_API_URL=https://app.blawby.com
BLAWBY_API_TOKEN=your_blawby_api_token_here
BLAWBY_TEAM_ULID=your_team_ulid_here
```

### Configuration Details

- `BLAWBY_API_URL`: The base URL for the Blawby API (defaults to https://app.blawby.com)
- `BLAWBY_API_TOKEN`: Your API token from the Blawby dashboard
- `BLAWBY_TEAM_ULID`: The ULID of your team in the Blawby system

## API Endpoints Used

### Customer Management
- `POST /api/v1/teams/{team}/customer` - Create new customer
- `GET /api/v1/teams/{team}/customers?search={email}` - Find existing customer
- `PUT /api/v1/teams/{team}/customers/{customer_id}` - Update customer status

### Invoice Management
- `POST /api/v1/teams/{team}/invoice` - Create new invoice
- `GET /api/v1/teams/{team}/invoices/{invoice_id}` - Get invoice details

## Services

### BlawbyApiService

The core service that handles all API communication with app.blawby.com.

**Key Methods:**
- `createCustomer(teamUlid, customerInfo)` - Creates a new customer
- `getCustomerByEmail(teamUlid, email)` - Finds existing customer by email
- `createInvoice(teamUlid, customerId, amount, description)` - Creates an invoice
- `getInvoice(teamUlid, invoiceId)` - Gets invoice details
- `updateCustomerStatus(teamUlid, customerId, status)` - Updates customer status
- `createCustomerMemo(teamUlid, customerId, content)` - Creates a memo for a customer

### BlawbyPaymentService

A higher-level service that orchestrates the customer and invoice creation process.

**Key Methods:**
- `createInvoice(paymentRequest)` - Creates customer + invoice in one flow
- `getPaymentStatus(paymentId)` - Checks payment status
- `storePaymentHistory(paymentData)` - Stores payment records

## Integration Flow

1. **Client submits intake form** with contact information and matter details
2. **System checks** if customer already exists by email
3. **If customer exists**, uses existing customer ID
4. **If customer doesn't exist**, creates new customer via API
5. **Creates invoice** for the consultation fee
6. **Returns payment link** to the client
7. **Client completes payment** via the payment link
8. **System tracks payment status** (future enhancement)

## Error Handling

The integration includes comprehensive error handling:

- **API Failures**: Logs errors and falls back to mock service
- **Customer Creation Failures**: Returns error message to user
- **Invoice Creation Failures**: Logs error and provides fallback
- **Network Issues**: Implements retry logic with exponential backoff

## Feature Flags

The system uses environment variables as feature flags:

- **Blawby API Enabled**: When `BLAWBY_API_TOKEN` and `BLAWBY_API_URL` are set
- **Fallback to Mock**: When API is not configured or fails
- **Development Mode**: Uses mock service when API is not available

## Testing

Run the tests to verify the integration:

```bash
npm test worker/services/__tests__/BlawbyApiService.test.ts
```

## Migration from Mock Service

The integration is designed to be backward compatible:

1. **Phase 1**: New services created alongside existing mock service
2. **Phase 2**: Feature flag controls which service to use
3. **Phase 3**: Testing with real API in staging environment
4. **Phase 4**: Production deployment with fallback to mock
5. **Phase 5**: Remove mock service once stable

## API Authentication

All API requests require authentication using the Bearer token:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Rate Limiting

The API includes built-in rate limiting. The service handles rate limit responses gracefully and implements exponential backoff for retries.

## Monitoring

The integration includes comprehensive logging:

- `💰 [BLAWBY]` - Payment-related operations
- `✅ [BLAWBY]` - Successful operations
- `❌ [BLAWBY]` - Error conditions

## Future Enhancements

- Webhook integration for payment confirmations
- Real-time payment status updates
- Customer memo integration for matter details
- Invoice status tracking
- Payment history synchronization 