import { env, applyD1Migrations, fetchMock } from "cloudflare:test";
import { getTestTeamConfigForDB } from './fixtures/agent-test-data';

// Type augmentation for cloudflare:test
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

// Apply migrations to the test database
await applyD1Migrations(env.DB, { migrationsFolder: "./migrations" });

// Set up test data in the database
const testTeams = [
  'test-team-1',
  'test-team-disabled', 
  'blawby-ai'
];

for (const teamId of testTeams) {
  const teamConfig = getTestTeamConfigForDB(teamId);
  
  // Insert test team into database
  await env.DB.prepare(`
    INSERT OR REPLACE INTO teams (id, slug, name, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    teamConfig.id,
    teamConfig.slug,
    teamConfig.name,
    teamConfig.config,
    teamConfig.created_at,
    teamConfig.updated_at
  ).run();
  
  console.log(`✅ Created test team: ${teamConfig.name} (${teamConfig.id})`);
}

// Set up mock fetch for external API calls
fetchMock.activate();
fetchMock.disableNetConnect();

// Mock external API responses
fetchMock
  .post('https://api.resend.com/emails', { id: 'test-email-id' })
  .post('https://staging.blawby.com/api/matters', { 
    success: true, 
    matter: { id: 'test-matter-id' } 
  })
  .get('https://staging.blawby.com/api/teams/*', { 
    success: true, 
    team: { id: 'test-team-1' } 
  });

console.log('🚀 Test environment setup complete!');

export async function seedTestData() {
  // Create test matter for conflict checking
  await env.DB.prepare(`
    INSERT OR IGNORE INTO matters (
      id, team_id, client_name, matter_type, title, opposing_party, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'conflict-test-matter',
    'test-team-1',
    'Existing Client',
    'family_law',
    'Existing Matter',
    'ACME Corporation',
    'active'
  ).run();

  console.log('Seeded test data');
}

// Global setup
beforeAll(async () => {
  console.log('🧪 Setting up Workers test environment...');
  
  // Setup database
  await setupDB();
  await seedTestData();
  
  // Setup fetch mocking for external HTTP calls
  fetchMock.activate();
  fetchMock.disableNetConnect();
  
  // Mock external AI calls if needed
  fetchMock.get('https://api.cloudflare.com/client/v4/accounts/*/ai/run/*').intercept({
    path: '**',
    method: 'POST'
  }).reply(200, {
    result: { response: JSON.stringify({ riskLevel: 'low', notes: [] }) }
  });
  
  console.log('✅ Workers test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up Workers test environment...');
  
  // Assert no pending interceptors
  try {
    fetchMock.assertNoPendingInterceptors();
  } catch (error) {
    console.warn('Pending fetch interceptors:', error);
  }
  
  fetchMock.deactivate();
  console.log('✅ Workers test cleanup complete');
});

// Test utilities
export async function createTestMatter(teamId: string = 'test-team-1', overrides: Record<string, any> = {}) {
  const matterId = `test-matter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const defaults = {
    team_id: teamId,
    client_name: 'Test Client',
    matter_type: 'family_law',
    title: 'Test Matter',
    opposing_party: 'Test Opposing Party',
    status: 'active'
  };
  
  const data = { ...defaults, ...overrides };
  
  await env.DB.prepare(`
    INSERT INTO matters (
      id, team_id, client_name, matter_type, title, opposing_party, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    matterId,
    data.team_id,
    data.client_name,
    data.matter_type,
    data.title,
    data.opposing_party,
    data.status
  ).run();
  
  return matterId;
}

export async function enableParalegalForTeam(teamId: string) {
  await env.DB.prepare(`
    UPDATE teams 
    SET config = json_patch(config, '{"features": {"enableParalegalAgent": true}}')
    WHERE id = ?
  `).bind(teamId).run();
}

export async function disableParalegalForTeam(teamId: string) {
  await env.DB.prepare(`
    UPDATE teams 
    SET config = json_patch(config, '{"features": {"enableParalegalAgent": false}}')
    WHERE id = ?
  `).bind(teamId).run();
}

export function createAdvanceRequest(data: {
  teamId?: string;
  matterId?: string;
  type?: string;
  eventData?: any;
  idempotencyKey?: string;
} = {}) {
  const {
    teamId = 'test-team-1',
    matterId = 'test-matter-1',
    type = 'user_input',
    eventData = { clientInfo: { name: 'John Doe' }, opposingParty: 'Test Corp' },
    idempotencyKey = `test-key-${Date.now()}`
  } = data;

  return new Request(`https://do.local/paralegal/${teamId}/${matterId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      data: eventData,
      idempotencyKey,
      teamId,
      matterId
    })
  });
}

export function createStatusRequest(teamId: string = 'test-team-1', matterId: string = 'test-matter-1') {
  return new Request(`https://do.local/paralegal/${teamId}/${matterId}/status`, {
    method: 'GET'
  });
}

// Mock AI service for consistent testing
export function mockAIService(responses: Record<string, any> = {}) {
  const defaultResponse = { response: JSON.stringify({ riskLevel: 'low', recommendations: [] }) };
  
  return {
    run: async (model: string, options: any) => {
      const key = `${model}:${JSON.stringify(options.messages?.[0]?.content || '')}`;
      return responses[key] || defaultResponse;
    }
  };
}
