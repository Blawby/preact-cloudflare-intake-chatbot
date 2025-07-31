# Payment Integration with Blawby

This document describes the payment integration between the legal intake chatbot and the Blawby payment system.

## Overview

The payment integration allows the legal intake agent to automatically create invoices and payment links when a matter requires payment. The system integrates with the Blawby payment service via MCP (Model Context Protocol) filesystem server.

## Architecture

```
Legal Intake Agent → Payment Service → Blawby Payment API → MCP Filesystem Server
```

## API Endpoints

### 1. Create Payment Invoice
**POST** `/api/payment/create-invoice`

Creates a payment invoice for a legal matter.

**Request Body:**
```json
{
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com", 
    "phone": "555-123-4567",
    "location": "Charlotte, NC"
  },
  "matterInfo": {
    "type": "Employment Law",
    "description": "Terminated for downloading porn on work laptop",
    "urgency": "high",
    "opposingParty": "ABC Company"
  },
  "teamId": "team-123",
  "sessionId": "session-456"
}
```

**Response:**
```json
{
  "success": true,
  "invoiceUrl": "https://app.blawby.com/pay/inv_123456",
  "paymentId": "pay_123456789"
}
```

### 2. Get Payment Status
**GET** `/api/payment/status/:paymentId`

Retrieves the status of a payment.

**Response:**
```json
{
  "success": true,
  "invoiceUrl": "https://app.blawby.com/pay/inv_123456",
  "paymentId": "pay_123456789",
  "status": "completed"
}
```

### 3. Payment Webhook
**POST** `/api/payment/webhook`

Receives webhook notifications from the Blawby payment system.

**Webhook Events:**
- `payment.completed` - Payment was successful
- `payment.failed` - Payment failed
- `payment.refunded` - Payment was refunded

## Environment Variables

Add these to your Cloudflare Worker environment:

```bash
PAYMENT_API_KEY=your_blawby_api_key
WEBHOOK_SECRET=your_webhook_secret
```

## Integration Flow

1. **Matter Creation**: When a client completes the intake process and payment is required
2. **Invoice Generation**: The PaymentService creates an invoice via the Blawby API
3. **Payment Link**: Client receives a payment link to complete payment
4. **Webhook Notification**: Blawby sends webhook when payment is completed
5. **Matter Activation**: Matter status is updated to 'active' when payment is confirmed

## Error Handling

The payment service includes comprehensive error handling:

- **API Errors**: Network failures, invalid responses
- **Validation Errors**: Missing required fields
- **Webhook Errors**: Invalid signatures, processing failures

## Testing

Run the payment integration tests:

```bash
npm test tests/integration/api/payment.test.ts
```

## Security

- All API calls are authenticated with `PAYMENT_API_KEY`
- Webhook signatures can be validated (commented out in current implementation)
- Sensitive data is logged minimally
- HTTPS is required for all payment communications

## Configuration

### Team Configuration

Teams can configure payment settings:

```json
{
  "requiresPayment": true,
  "consultationFee": 5000, // $50.00 in cents
  "paymentLink": "https://app.blawby.com/pay/default"
}
```

### MCP Filesystem Server

The Blawby payment system runs as an MCP filesystem server:

```bash
npx -y @modelcontextprotocol/server-filesystem /Users/paulchrisluke/Repos/blawby-pay-2
```

This server handles:
- Customer data storage
- Invoice generation
- Payment processing
- Webhook delivery

## Troubleshooting

### Common Issues

1. **Payment API Unavailable**
   - Check `PAYMENT_API_KEY` environment variable
   - Verify Blawby API endpoint is accessible
   - Check network connectivity

2. **Webhook Failures**
   - Verify webhook URL is correct
   - Check webhook signature validation
   - Review webhook payload format

3. **Invoice Creation Fails**
   - Validate customer information
   - Check matter information completeness
   - Verify team configuration

### Logs

Payment service logs include:
- Invoice creation attempts
- API responses
- Webhook processing
- Error details

Look for logs with `💰` emoji for payment-related activities.

## Future Enhancements

- [ ] Webhook signature validation
- [ ] Payment retry logic
- [ ] Multiple payment methods
- [ ] Subscription billing
- [ ] Payment analytics 