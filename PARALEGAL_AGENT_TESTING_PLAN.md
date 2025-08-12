# Paralegal Agent Testing Plan

## Overview

This document outlines a comprehensive testing strategy for the Paralegal Agent feature, following the existing testing patterns in the codebase. The Paralegal Agent is implemented as a Durable Object with a state machine for matter formation workflows.

## Testing Architecture

### 1. Unit Tests (`tests/unit/`)

#### Worker Functions (`tests/unit/worker/`)

**File: `tests/unit/worker/paralegal-agent.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ParalegalAgent } from '../../../worker/agents/ParalegalAgent';

describe('ParalegalAgent Durable Object', () => {
  let mockEnv: any;
  let mockState: any;
  
  beforeEach(() => {
    mockState = {
      storage: new Map(),
      waitUntil: vi.fn(),
      id: { toString: () => 'test-do-id' }
    };
    
    mockEnv = {
      DB: mockDB,
      PARALEGAL_TASKS: mockQueue
    };
  });

  describe('State Machine', () => {
    it('should initialize with collect_parties stage', async () => {
      const agent = new ParalegalAgent(mockState, mockEnv);
      const response = await agent.fetch(statusRequest);
      const data = await response.json();
      
      expect(data.stage).toBe('collect_parties');
      expect(data.checklist).toHaveLength(3);
    });

    it('should advance from collect_parties to conflicts_check', async () => {
      const agent = new ParalegalAgent(mockState, mockEnv);
      const advanceRequest = new Request('http://test/advance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user_input',
          data: { clientInfo: { name: 'John Doe' }, opposingParty: 'ACME' }
        })
      });
      
      const response = await agent.fetch(advanceRequest);
      const data = await response.json();
      
      expect(data.stage).toBe('conflicts_check');
    });

    it('should handle idempotency correctly', async () => {
      const agent = new ParalegalAgent(mockState, mockEnv);
      const idempotencyKey = 'test-key-123';
      
      // First request
      const request1 = createAdvanceRequest({ idempotencyKey });
      const response1 = await agent.fetch(request1);
      const data1 = await response1.json();
      
      // Second request with same key
      const request2 = createAdvanceRequest({ idempotencyKey });
      const response2 = await agent.fetch(request2);
      const data2 = await response2.json();
      
      expect(data2.idempotent).toBe(true);
      expect(data1.stage).toBe(data2.stage);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const agent = new ParalegalAgent(mockState, mockEnv);
      const badRequest = new Request('http://test/advance', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await agent.fetch(badRequest);
      expect(response.status).toBe(500);
    });
  });
});
```

#### Services (`tests/unit/services/`)

**File: `tests/unit/services/ConflictCheckService.test.ts`**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ConflictCheckService } from '../../../worker/services/ConflictCheckService';

describe('ConflictCheckService', () => {
  let service: ConflictCheckService;
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        })
      }
    };
    service = new ConflictCheckService(mockEnv);
  });

  it('should find direct conflicts', async () => {
    mockEnv.DB.prepare().bind().all.mockResolvedValueOnce({
      results: [
        {
          id: 'matter-123',
          title: 'Test Matter',
          opposing_party: 'ACME Corporation',
          client_name: 'John Doe'
        }
      ]
    });

    const result = await service.checkConflicts('team-123', ['ACME Corporation']);
    
    expect(result.cleared).toBe(false);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].conflictType).toBe('direct');
  });

  it('should clear when no conflicts found', async () => {
    const result = await service.checkConflicts('team-123', ['No Conflicts Inc']);
    
    expect(result.cleared).toBe(true);
    expect(result.hits).toHaveLength(0);
  });
});
```

#### Supervisor Router (`tests/unit/worker/supervisor-router.test.ts`)
```typescript
describe('SupervisorRouter', () => {
  it('should route to paralegal for matter keywords', () => {
    const router = new SupervisorRouter(mockEnv);
    const body = {
      messages: [{ content: 'I need help with my engagement letter' }]
    };
    const teamConfig = { features: { enableParalegalAgent: true } };
    
    const route = router.route(body, teamConfig);
    expect(route).toBe('paralegal');
  });

  it('should route to intake when paralegal disabled', () => {
    const router = new SupervisorRouter(mockEnv);
    const body = {
      messages: [{ content: 'I need help with my matter' }]
    };
    const teamConfig = { features: { enableParalegalAgent: false } };
    
    const route = router.route(body, teamConfig);
    expect(route).toBe('intake');
  });
});
```

### 2. Integration Tests (`tests/integration/`)

#### API Integration (`tests/integration/api/`)

**File: `tests/integration/api/paralegal.test.ts`**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { handleParalegal } from '../../../worker/routes/paralegal';
import { setupTestEnvironment, teardownTestEnvironment } from '../../fixtures/test-utils';

describe('Paralegal API Integration', () => {
  let testEnv: any;
  let testTeamId: string;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    testTeamId = await createTestTeam(testEnv);
  });

  afterAll(async () => {
    await teardownTestEnvironment(testEnv);
  });

  describe('POST /api/paralegal/:teamId/:matterId/advance', () => {
    it('should advance matter through all stages', async () => {
      const matterId = 'integration-test-matter-1';
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

      // Stage 1: collect_parties → conflicts_check
      const advance1 = new Request(`http://test/api/paralegal/${testTeamId}/${matterId}/advance`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'user_input',
          data: { clientInfo: { name: 'Jane Doe' }, opposingParty: 'Test Corp' },
          idempotencyKey: 'test-1'
        })
      });

      const response1 = await handleParalegal(advance1, testEnv, corsHeaders);
      const data1 = await response1.json();
      
      expect(response1.status).toBe(200);
      expect(data1.data.stage).toBe('conflicts_check');

      // Stage 2: conflicts_check → documents_needed
      const advance2 = new Request(`http://test/api/paralegal/${testTeamId}/${matterId}/advance`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'conflict_check_complete',
          data: { cleared: true },
          idempotencyKey: 'test-2'
        })
      });

      const response2 = await handleParalegal(advance2, testEnv, corsHeaders);
      const data2 = await response2.json();
      
      expect(data2.data.stage).toBe('documents_needed');
    });

    it('should enforce rate limiting', async () => {
      const matterId = 'rate-limit-test';
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

      // Make 21 requests rapidly
      const requests = Array.from({ length: 21 }, (_, i) => 
        new Request(`http://test/api/paralegal/${testTeamId}/${matterId}/status`, {
          method: 'GET',
          headers: { 'X-Forwarded-For': `192.168.1.${i}` } // Different IPs
        })
      );

      const responses = await Promise.all(
        requests.map(req => handleParalegal(req, testEnv, corsHeaders))
      );

      const statusCodes = responses.map(r => r.status);
      const rateLimitedCount = statusCodes.filter(code => code === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should reject invalid team IDs', async () => {
      const request = new Request('http://test/api/paralegal/invalid-team/matter/status');
      const response = await handleParalegal(request, testEnv, {});
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/paralegal/:teamId/:matterId/status', () => {
    it('should return current matter status', async () => {
      const matterId = 'status-test-matter';
      const request = new Request(`http://test/api/paralegal/${testTeamId}/${matterId}/status`);
      const response = await handleParalegal(request, testEnv, {});
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.data.stage).toBeDefined();
      expect(data.data.checklist).toBeInstanceOf(Array);
    });
  });
});
```

#### Supervisor Integration (`tests/integration/api/supervisor-routing.test.ts`)
```typescript
describe('Supervisor Router Integration', () => {
  it('should route paralegal keywords to Durable Object', async () => {
    const request = new Request('http://test/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Help me with my engagement letter' }],
        teamId: testTeamId,
        sessionId: 'supervisor-test-1'
      })
    });

    const response = await handleAgent(request, testEnv, {});
    const data = await response.json();
    
    expect(data.data.workflow).toBe('PARALEGAL_AGENT');
    expect(data.data.metadata.paralegalAgent).toBe(true);
  });
});
```

### 3. End-to-End Tests (`tests/e2e/`)

**File: `tests/e2e/paralegal-flow.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import { test } from '@playwright/test';

describe('Paralegal Agent E2E Flow', () => {
  test('complete matter formation workflow', async ({ page }) => {
    // Navigate to chat interface
    await page.goto('http://localhost:3000/?teamId=test-team');
    
    // Send paralegal trigger message
    await page.fill('[data-testid="message-input"]', 'I need help with my matter formation');
    await page.click('[data-testid="send-button"]');
    
    // Wait for paralegal response
    await page.waitForSelector('[data-testid="paralegal-response"]');
    
    // Check for matter progress button
    const progressButton = page.locator('[data-testid="matter-progress-button"]');
    await expect(progressButton).toBeVisible();
    
    // Click progress button and check modal
    await progressButton.click();
    await page.waitForSelector('[data-testid="matter-progress-modal"]');
    
    // Verify initial stage
    const currentStage = page.locator('[data-testid="current-stage"]');
    await expect(currentStage).toContainText('Collecting Party Information');
    
    // Verify checklist items
    const checklistItems = page.locator('[data-testid="checklist-item"]');
    await expect(checklistItems).toHaveCount(3);
  });

  test('matter progress polling updates', async ({ page }) => {
    await page.goto('http://localhost:3000/?teamId=test-team');
    
    // Open matter progress for existing matter
    await page.goto('http://localhost:3000/?teamId=test-team&matterId=test-matter');
    await page.click('[data-testid="matter-progress-button"]');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="progress-percentage"]');
    const initialProgress = await page.textContent('[data-testid="progress-percentage"]');
    
    // Simulate external state change via API
    await fetch('http://localhost:8787/api/paralegal/test-team/test-matter/advance', {
      method: 'POST',
      body: JSON.stringify({ type: 'user_input', data: { complete: true } })
    });
    
    // Wait for polling to update UI
    await page.waitForTimeout(11000); // Wait longer than polling interval
    
    const updatedProgress = await page.textContent('[data-testid="progress-percentage"]');
    expect(updatedProgress).not.toBe(initialProgress);
  });
});
```

### 4. Service Integration Tests

**File: `tests/integration/services/paralegal-services.test.ts`**
```typescript
describe('Paralegal Services Integration', () => {
  describe('ConflictCheckService with real DB', () => {
    it('should detect conflicts in real database', async () => {
      // Create test matter
      await testEnv.DB.prepare(`
        INSERT INTO matters (id, team_id, client_name, matter_type, title, opposing_party)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind('test-matter-1', testTeamId, 'John Doe', 'family_law', 'Test Matter', 'ACME Corp').run();
      
      const service = new ConflictCheckService(testEnv);
      const result = await service.checkConflicts(testTeamId, ['ACME Corp']);
      
      expect(result.cleared).toBe(false);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].matterId).toBe('test-matter-1');
    });
  });

  describe('DocumentRequirementService with real DB', () => {
    it('should create and track document requirements', async () => {
      const service = new DocumentRequirementService(testEnv);
      
      await service.createMatterRequirements('test-matter-2', 'family_law');
      const requirements = await service.getMatterRequirementStatus('test-matter-2');
      
      expect(requirements).toHaveLength(4); // family_law template has 4 requirements
      expect(requirements[0].document_type).toBe('marriage_certificate');
    });
  });
});
```

## Test Data and Fixtures

### Mock Data (`tests/fixtures/paralegal-mock-data.ts`)
```typescript
export const mockMatterFormationStages = {
  collect_parties: {
    stage: 'collect_parties',
    checklist: [
      { id: 'client_info', title: 'Collect client information', status: 'pending', required: true },
      { id: 'opposing_party', title: 'Identify opposing party', status: 'pending', required: true },
      { id: 'matter_type', title: 'Determine matter type', status: 'pending', required: true }
    ]
  },
  conflicts_check: {
    stage: 'conflicts_check',
    checklist: [
      { id: 'run_conflicts', title: 'Run conflict check', status: 'pending', required: true },
      { id: 'review_results', title: 'Review conflict results', status: 'pending', required: true },
      { id: 'clear_conflicts', title: 'Clear any conflicts', status: 'pending', required: true }
    ]
  }
};

export const mockConflictCheckResults = {
  noConflicts: {
    cleared: true,
    hits: [],
    checkedParties: ['Test Client'],
    checkedAt: '2024-01-01T00:00:00Z'
  },
  hasConflicts: {
    cleared: false,
    hits: [
      {
        matterId: 'existing-matter-1',
        matterTitle: 'Existing Matter',
        opposingParty: 'ACME Corporation',
        conflictType: 'direct',
        similarity: 1.0
      }
    ],
    checkedParties: ['ACME Corporation'],
    checkedAt: '2024-01-01T00:00:00Z'
  }
};
```

### Test Utilities (`tests/fixtures/paralegal-test-utils.ts`)
```typescript
export async function createTestMatter(env: any, teamId: string, overrides = {}) {
  const matterId = `test-matter-${Date.now()}`;
  await env.DB.prepare(`
    INSERT INTO matters (id, team_id, client_name, matter_type, title, opposing_party)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    matterId,
    teamId,
    'Test Client',
    'family_law',
    'Test Matter',
    'Test Opposing Party',
    ...Object.values(overrides)
  ).run();
  
  return matterId;
}

export async function enableParalegalForTeam(env: any, teamId: string) {
  await env.DB.prepare(`
    UPDATE teams 
    SET config = json_patch(config, '{"features": {"enableParalegalAgent": true}}')
    WHERE id = ?
  `).bind(teamId).run();
}

export function createDurableObjectStub() {
  return {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (id: any) => ({
      fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({
        stage: 'collect_parties',
        checklist: [],
        nextActions: [],
        missing: [],
        completed: false
      })))
    })
  };
}
```

## Running the Tests

### Local Development
```bash
# Run all paralegal tests
npm test -- --grep "paralegal"

# Run specific test suites
npm run test:unit -- paralegal
npm run test:integration -- paralegal
npm run test:e2e -- paralegal

# Run with coverage
npm run test:coverage -- --grep "paralegal"
```

### CI/CD Pipeline
```bash
# In GitHub Actions or similar
- name: Run Paralegal Tests
  run: |
    npm run test:unit -- paralegal
    npm run test:integration -- paralegal
    npm run test:e2e -- paralegal
```

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage on all service classes and utilities
- **Integration Tests**: Cover all API endpoints and database interactions
- **E2E Tests**: Cover complete user workflows
- **Error Scenarios**: Test all error conditions and edge cases
- **Performance**: Test rate limiting and concurrent access
- **Security**: Test authentication, authorization, and input validation

## Continuous Testing

1. **Pre-commit hooks**: Run unit tests before commits
2. **PR validation**: Run full test suite on pull requests
3. **Deployment testing**: Run integration tests against staging
4. **Production monitoring**: Synthetic tests for critical paths

This testing plan ensures comprehensive coverage of the Paralegal Agent feature while following the established patterns in the codebase.
