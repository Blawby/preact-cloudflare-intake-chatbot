// Minimal KV roundtrip test for Blawby API secret
import fetch from 'node-fetch';

const TEAM_ID = '01jq70jnstyfzevc6423czh50e';
const KV_KEY = `team:${TEAM_ID}:blawby_api`;
const SECRET = {
  apiKey: 'Bearer direct_kv_test_key_001',
  teamUlid: TEAM_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function storeSecret() {
  // Use the API endpoint to store the secret (mimics app logic)
  const res = await fetch(`https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/${TEAM_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: SECRET.apiKey, teamUlid: SECRET.teamUlid })
  });
  const data = await res.json();
  console.log('✅ Store API response:', data);
}

async function retrieveSecret() {
  // Use the API endpoint to retrieve the secret (mimics app logic)
  const res = await fetch(`https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/${TEAM_ID}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log('✅ Retrieve API response:', data);
}

async function main() {
  console.log('🔄 Storing secret...');
  await storeSecret();
  console.log('\n🔄 Retrieving secret...');
  await retrieveSecret();
}

main().catch(console.error); 