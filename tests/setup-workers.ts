import { env, applyD1Migrations, fetchMock } from "cloudflare:test";
import { readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import { beforeAll, afterAll } from "vitest";
import path from "node:path";
import type { Env } from "../worker/types";

// Type augmentation for cloudflare:test
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

export async function setupDB() {
  console.log('Setting up database migrations...');
  
  try {
    // Read and apply D1 migrations
    const migrations = await readD1Migrations(path.join(process.cwd(), "migrations"));
    await applyD1Migrations(env.DB, migrations);
    console.log(`Applied ${migrations.length} database migrations`);
    
    // Create test teams for testing
    await env.DB.prepare(`
      INSERT OR IGNORE INTO teams (id, slug, name, config) 
      VALUES (?, ?, ?, ?)
    `).bind(
      'test-team-1',
      'test-team',
      'Test Team',
      JSON.stringify({
        features: { enableParalegalAgent: true },
        aiModel: 'llama',
        consultationFee: 0,
        requiresPayment: false
      })
    ).run();

    await env.DB.prepare(`
      INSERT OR IGNORE INTO teams (id, slug, name, config) 
      VALUES (?, ?, ?, ?)
    `).bind(
      'test-team-disabled',
      'test-team-disabled',
      'Test Team (Paralegal Disabled)',
      JSON.stringify({
        features: { enableParalegalAgent: false },
        aiModel: 'llama',
        consultationFee: 0,
        requiresPayment: false
      })
    ).run();

    console.log('Created test teams');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

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
