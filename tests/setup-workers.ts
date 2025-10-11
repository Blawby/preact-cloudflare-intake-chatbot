import { env, applyD1Migrations, fetchMock } from "cloudflare:test";
import type { Env } from '../worker/types';
import { Currency } from '../worker/agents/legal-intake/index.js';

// TypeScript interfaces for organization configuration
interface FeatureFlags {
  enablePaymentProcessing: boolean;
  enableMatterCreation: boolean;
  enableParalegalAgent?: boolean;
}

interface Pricing {
  consultationFee: number;
  currency: string;
}

interface ContactInfo {
  phone: string;
  email: string;
}

interface MatterType {
  name: string;
  description: string;
}

interface OrganizationConfig {
  features: FeatureFlags;
  legalAreas: string[];
  pricing: Pricing;
  contactInfo: ContactInfo;
  introMessage: string;
  systemPrompt: string;
  matterTypes: Record<string, MatterType>;
}

interface OrganizationRecord {
  id: string;
  slug: string;
  name: string;
  config: string;
  created_at: string;
  updated_at: string;
}

// Base configuration constant
const baseConfig: OrganizationConfig = {
  features: {
    enablePaymentProcessing: true,
    enableMatterCreation: true
  },
  legalAreas: ['family_law', 'personal_injury', 'business_law'],
  pricing: {
    consultationFee: 75,
    currency: Currency.USD
  },
  contactInfo: {
    phone: '+1-555-0123',
    email: 'test@example.com'
  },
  introMessage: 'Hello! I\'m here to help you with your legal needs.',
  systemPrompt: 'You are a helpful legal assistant.',
  matterTypes: {
    family_law: {
      name: 'Family Law',
      description: 'Divorce, custody, and family matters'
    },
    personal_injury: {
      name: 'Personal Injury',
      description: 'Accidents and injury claims'
    }
  }
};

// Organization configurations constant
const organizationConfigs: Record<string, OrganizationRecord> = {
  'test-organization-1': {
    id: 'test-organization-1',
    slug: 'test-organization-1',
    name: 'Test Organization 1',
    config: JSON.stringify(baseConfig),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'test-organization-disabled': {
    id: 'test-organization-disabled',
    slug: 'test-organization-disabled',
    name: 'Test Organization Disabled',
    config: JSON.stringify({
      ...baseConfig,
      features: {
        ...baseConfig.features,
        enableParalegalAgent: false
      }
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  'blawby-ai': {
    id: 'blawby-ai',
    slug: 'blawby-ai',
    name: 'Blawby AI',
    config: JSON.stringify(baseConfig),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

// Test organization configuration function
export function getTestOrganizationConfigForDB(organizationId: string): OrganizationRecord {
  return organizationConfigs[organizationId] ?? organizationConfigs['test-organization-1'];
}

// Type augmentation for cloudflare:test
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

// Apply migrations to the test database
await applyD1Migrations(env.DB, { migrationsFolder: "./migrations" });

// Test organization IDs for reuse across test setup
const testOrganizations = [
  'test-organization-1',
  'test-organization-disabled', 
  'blawby-ai'
];

console.log('🚀 Test environment setup complete!');

// biome-disable-line noExportsInTest
export async function seedTestData() {
  // Create test matter for conflict checking
  await env.DB.prepare(`
    INSERT OR IGNORE INTO matters (
      id, organization_id, client_name, matter_type, title, opposing_party, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'conflict-test-matter',
    'test-organization-1',
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
  
  // Ensure test organizations are created
  for (const organizationId of testOrganizations) {
    const organizationConfig = getTestOrganizationConfigForDB(organizationId);
    
    // Insert test organization into database
    await env.DB.prepare(`
      INSERT OR REPLACE INTO organizations (id, slug, name, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      organizationConfig.id,
      organizationConfig.slug,
      organizationConfig.name,
      organizationConfig.config,
      organizationConfig.created_at,
      organizationConfig.updated_at
    ).run();
    
    console.log(`✅ Created test organization in beforeAll: ${organizationConfig.name} (${organizationConfig.id})`);
  }
  
  await seedTestData();
  
  // Setup fetch mocking for external HTTP calls
  fetchMock.activate();
  fetchMock.disableNetConnect();
  
  // Mock external API responses
  fetchMock
    .post('https://api.resend.com/emails', { id: 'test-email-id' })
    .post('https://staging.blawby.com/api/matters', { 
      success: true, 
      matter: { id: 'test-matter-id' } 
    })
    .get('https://staging.blawby.com/api/organizations/*', { 
      success: true, 
      organization: { id: 'test-organization-1' } 
    });
  
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
  
  fetchMock.restore();
  console.log('✅ Workers test cleanup complete');
});

// Test utilities
// biome-disable-line noExportsInTest
export async function createTestMatter(organizationId: string = 'test-organization-1', overrides: Record<string, any> = {}) {
  const matterId = `test-matter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const defaults = {
    organization_id: organizationId,
    client_name: 'Test Client',
    matter_type: 'family_law',
    title: 'Test Matter',
    opposing_party: 'Test Opposing Party',
    status: 'active'
  };
  
  const data = { ...defaults, ...overrides };
  
  await env.DB.prepare(`
    INSERT INTO matters (
      id, organization_id, client_name, matter_type, title, opposing_party, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    matterId,
    data.organization_id,
    data.client_name,
    data.matter_type,
    data.title,
    data.opposing_party,
    data.status
  ).run();
  
  return matterId;
}

// biome-disable-line noExportsInTest
export async function enableParalegalForOrganization(organizationId: string) {
  await env.DB.prepare(`
    UPDATE organizations 
    SET config = json_set(config, '$.features.enableParalegalAgent', true)
    WHERE id = ?
  `).bind(organizationId).run();
}

// biome-disable-line noExportsInTest
export async function disableParalegalForOrganization(organizationId: string) {
  await env.DB.prepare(`
    UPDATE organizations 
    SET config = json_set(config, '$.features.enableParalegalAgent', false)
    WHERE id = ?
  `).bind(organizationId).run();
}

// biome-disable-line noExportsInTest
export function createAdvanceRequest(data: {
  organizationId?: string;
  matterId?: string;
  type?: string;
  eventData?: any;
  idempotencyKey?: string;
} = {}) {
  const {
    organizationId = 'test-organization-1',
    matterId = 'test-matter-1',
    type = 'user_input',
    eventData = { clientInfo: { name: 'John Doe' }, opposingParty: 'Test Corp' },
    idempotencyKey = `test-key-${Date.now()}`
  } = data;

  return new Request(`https://do.local/paralegal/${organizationId}/${matterId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      data: eventData,
      idempotencyKey,
      organizationId,
      matterId
    })
  });
}

// biome-disable-line noExportsInTest
export function createStatusRequest(organizationId: string = 'test-organization-1', matterId: string = 'test-matter-1') {
  return new Request(`https://do.local/paralegal/${organizationId}/${matterId}/status`, {
    method: 'GET'
  });
}

// Mock AI service for consistent testing
// biome-disable-line noExportsInTest
export function mockAIService(responses: Record<string, any> = {}) {
  const defaultResponse = { response: JSON.stringify({ riskLevel: 'low', recommendations: [] }) };
  
  return {
    run: async (model: string, options: any) => {
      const key = `${model}:${JSON.stringify(options.messages?.[0]?.content || '')}`;
      return responses[key] || defaultResponse;
    }
  };
}
