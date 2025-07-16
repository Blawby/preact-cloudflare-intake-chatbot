import crypto from 'crypto';

// Extract signing key from webhook secret (matches Laravel logic)
function extractSigningKeyFromSecret(webhookSecret) {
  // If it's a signed secret (starts with wh_), extract the signature part as signing key
  if (webhookSecret.startsWith('wh_')) {
    const parts = webhookSecret.split('.');
    if (parts.length >= 2) {
      // Use the signature part (first 12 characters of HMAC) as the signing key
      const signature = parts[0].replace('wh_', '');
      return signature;
    }
  }
  
  // If it's a simple secret, return as-is
  return webhookSecret;
}

async function generateHMACSHA256(message, key) {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const keyBytes = encoder.encode(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageBytes,
  );

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateWebhookSignature(payload, signingKey, timestamp = null) {
  // Use current timestamp if not provided
  if (timestamp === null || timestamp === undefined) {
    timestamp = Math.floor(Date.now() / 1000);
  }

  // Create the signed payload (timestamp.payload)
  const signedPayload = `${timestamp}.${payload}`;
  
  // Generate HMAC-SHA256 signature
  const signature = await generateHMACSHA256(signedPayload, signingKey);
  
  // Return in Stripe format: t=timestamp,v1=signature
  return `t=${timestamp},v1=${signature}`;
}

// Test with the actual webhook secret
const webhookSecret = "wh_f1be34ea3bff.eyJ0IjoiMDFqcTcwam5zdHlmemV2YzY0MjNjemg1MGUiLCJwIjoiaW50YWtlLWZvcm0ifQ==";
const extractedKey = extractSigningKeyFromSecret(webhookSecret);

console.log('Webhook Secret:', webhookSecret);
console.log('Extracted Signing Key:', extractedKey);

// Test payload
const testPayload = JSON.stringify({
  event: "contact_form",
  timestamp: "2025-07-16T05:10:09.360Z",
  teamId: "north-carolina-legal-services",
  test: true,
  data: { message: "This is a test webhook payload" }
});

const timestamp = Math.floor(Date.now() / 1000);
const signature = await generateWebhookSignature(testPayload, extractedKey, timestamp);

console.log('\nTest Payload:', testPayload);
console.log('Timestamp:', timestamp);
console.log('Generated Signature:', signature); 