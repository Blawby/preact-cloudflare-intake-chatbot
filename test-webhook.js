// Test script to verify webhook signature generation
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

/**
 * Verify webhook signature
 * @param {string} payload - The webhook payload (JSON string)
 * @param {string} signature - The signature header
 * @param {string} secret - The webhook secret
 * @returns {boolean} - Whether signature is valid
 */
function verifyWebhook(payload, signature, secret) {
  // Parse signature header (format: "t=timestamp,v1=signature")
  const signatureParts = signature.split(',');
  const timestamp = signatureParts[0].split('=')[1];
  const receivedSignature = signatureParts[1].split('=')[1];
  
  // Create signed payload (timestamp.payload)
  const signedPayload = `${timestamp}.${payload}`;
  
  // Generate expected signature
  const expectedSignature = generateHMACSHA256(signedPayload, secret);
  
  return receivedSignature === expectedSignature;
}

// Test the webhook signature generation
const testPayload = JSON.stringify({
  event: 'matter_creation',
  timestamp: new Date().toISOString(),
  teamId: 'blawby-ai',
  sessionId: 'test-session-123',
  matter: {
    service: 'Business Law',
    qualityScore: {
      score: 75,
      readyForLawyer: true
    }
  }
});

const secret = 'blawby-webhook-secret-2025';
const signature = generateWebhookSignature(testPayload, secret);

console.log('Test Webhook Signature Generation');
console.log('================================');
console.log('Payload:', testPayload);
console.log('Secret:', secret);
console.log('Signature:', signature);
console.log('');

// Test verification
const isValid = verifyWebhook(testPayload, signature, secret);
console.log('Verification Test:', isValid ? '✅ PASSED' : '❌ FAILED');

// Test with wrong secret
const isValidWrongSecret = verifyWebhook(testPayload, signature, 'wrong-secret');
console.log('Wrong Secret Test:', isValidWrongSecret ? '❌ FAILED' : '✅ PASSED');

// Test with wrong payload
const wrongPayload = JSON.stringify({ event: 'wrong_event' });
const isValidWrongPayload = verifyWebhook(wrongPayload, signature, secret);
console.log('Wrong Payload Test:', isValidWrongPayload ? '❌ FAILED' : '✅ PASSED'); 