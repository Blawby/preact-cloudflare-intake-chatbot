// Test the deployed intake flow for question/answer quality
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const testIntakeFlow = async () => {
  const sessionId = 'test-session-' + Date.now();
  const teamId = 'north-carolina-legal-services';
  const service = 'Family Law';
  const api = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/matter-creation';

  // Step 1: Service selection
  let res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, service, sessionId, description: `I'm looking for legal help with my ${service} issue.` })
  });
  let data = await res.json();
  console.log('Bot:', data.message);

  // Step 2: Name
  res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, service, sessionId, description: 'Steve Jobs', answers: data.answers })
  });
  data = await res.json();
  console.log('Bot:', data.message);

  // Step 3: Email
  res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, service, sessionId, description: 'steve@apple.com', answers: data.answers })
  });
  data = await res.json();
  console.log('Bot:', data.message);

  // Step 4: Phone
  res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, service, sessionId, description: '555-123-4567', answers: data.answers })
  });
  data = await res.json();
  console.log('Bot:', data.message);

  // Step 5: Matter details
  res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, service, sessionId, description: 'Divorce, custody of my kids.', answers: data.answers })
  });
  data = await res.json();
  console.log('Bot:', data.message);
  if (data.matterCanvas) {
    console.log('\n--- Matter Summary ---\n' + data.matterCanvas.matterSummary);
  }
};

testIntakeFlow().catch(console.error); 