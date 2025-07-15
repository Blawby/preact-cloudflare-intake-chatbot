import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature using Node.js crypto
 * @param {string} message - The message to sign
 * @param {string} key - The signing key
 * @returns {string} - Hex-encoded signature
 */
function generateHMACSHA256(message, key) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

/**
 * Generate a webhook signature for client-side use (Stripe-like format)
 * @param {string} payload - The webhook payload (JSON string)
 * @param {string} signingKey - The webhook secret
 * @param {number} timestamp - Optional timestamp (defaults to current time)
 * @returns {string} - Signature in format "t=timestamp,v1=signature"
 */
function generateWebhookSignature(payload, signingKey, timestamp = null) {
  // Use current timestamp if not provided
  if (timestamp === null || timestamp === undefined) {
    timestamp = Math.floor(Date.now() / 1000);
  }

  // Create signed payload (timestamp.payload)
  const signedPayload = `${timestamp}.${payload}`;

  // Generate HMAC-SHA256 signature
  const signature = generateHMACSHA256(signedPayload, signingKey);

  // Return in Stripe-like format
  return `t=${timestamp},v1=${signature}`;
}

// Test payload for North Carolina Legal Services
const testPayload = JSON.stringify({
  event: 'matter_creation',
  timestamp: new Date().toISOString(),
  teamId: 'north-carolina-legal-services',
  sessionId: 'test-session-123',
  matter: {
    service: 'Family Law',
    qualityScore: {
      score: 85,
      readyForLawyer: true
    },
    step: 'service-selected',
    totalQuestions: 5,
    hasQuestions: true
  }
});

// Use the secret we configured for North Carolina Legal Services
const secret = '967cedd7beccff1739eb70831f04b849f869a0c9d906e1ff6029825d8bd907a1';

// Generate signature
const signature = generateWebhookSignature(testPayload, secret);

console.log('Webhook Test Data');
console.log('================');
console.log('URL: https://app.blawby.com/api/webhooks/blawby');
console.log('Secret:', secret);
console.log('Payload:', testPayload);
console.log('Signature:', signature);
console.log('');

// Generate curl command
const curlCommand = `curl -X POST https://app.blawby.com/api/webhooks/blawby \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: ${signature}" \\
  -H "X-Webhook-Event: matter_creation" \\
  -H "X-Webhook-ID: test-${Date.now()}" \\
  -H "X-Webhook-Timestamp: ${new Date().toISOString()}" \\
  -d '${testPayload}'`;

console.log('Curl Command:');
console.log('=============');
console.log(curlCommand); 