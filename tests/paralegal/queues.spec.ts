import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestMatter } from '../setup-workers';
import paralegalTasksConsumer, { ParalegalTaskMessage } from '../../worker/consumers/paralegal-tasks';

describe('Paralegal Queue Consumer', () => {
  let testTeamId: string;
  let testMatterId: string;

  beforeEach(async () => {
    testTeamId = 'test-team-1';
    testMatterId = await createTestMatter(testTeamId);
  });

  function createMockMessage(body: ParalegalTaskMessage, shouldRetry = false): any {
    return {
      body,
      retry: vi.fn(),
      ack: vi.fn()
    };
  }

  function createMockBatch(messages: any[]): MessageBatch<ParalegalTaskMessage> {
    return { messages } as MessageBatch<ParalegalTaskMessage>;
  }

  describe('Audit Log Processing', () => {
    it('should process audit log messages', async () => {
      const auditMessage: ParalegalTaskMessage = {
        type: 'audit_log',
        matterId: testMatterId,
        teamId: testTeamId,
        data: {
          actor: 'paralegal.do',
          action: 'stage_advance',
          entityType: 'matter_formation',
          entityId: testMatterId,
          oldValues: { stage: 'collect_parties' },
          newValues: { stage: 'conflicts_check' },
          metadata: { timestamp: Date.now() }
        },
        timestamp: Date.now()
      };

      const mockMessage = createMockMessage(auditMessage);
      const batch = createMockBatch([mockMessage]);

      await paralegalTasksConsumer.queue(batch, env);

      // Verify audit log was created
      const auditRecords = await env.DB.prepare(
        'SELECT * FROM audit_log WHERE matter_id = ? AND action = ?'
      ).bind(testMatterId, 'stage_advance').all();

      expect(auditRecords.results).toHaveLength(1);
      const record = auditRecords.results![0] as any;
      expect(record.actor).toBe('paralegal.do');
      expect(record.team_id).toBe(testTeamId);
      expect(JSON.parse(record.old_values)).toEqual({ stage: 'collect_parties' });
    });
  });

  describe('Risk Assessment Processing', () => {
    it('should process risk assessment messages', async () => {
      const riskMessage: ParalegalTaskMessage = {
        type: 'risk_assessment',
        matterId: testMatterId,
        teamId: testTeamId,
        data: {
          riskLevel: 'high',
          riskFactors: [
            { type: 'legal', level: 'high', description: 'Complex litigation' }
          ],
          recommendations: ['Assign senior attorney'],
          confidenceScore: 0.85,
          assessedBy: 'queue-processor'
        },
        timestamp: Date.now()
      };

      const mockMessage = createMockMessage(riskMessage);
      const batch = createMockBatch([mockMessage]);

      await paralegalTasksConsumer.queue(batch, env);

      // Verify risk assessment was created
      const riskRecords = await env.DB.prepare(
        'SELECT * FROM risk_assessments WHERE matter_id = ?'
      ).bind(testMatterId).all();

      expect(riskRecords.results).toHaveLength(1);
      const record = riskRecords.results![0] as any;
      expect(record.risk_level).toBe('high');
      expect(record.confidence_score).toBe(0.85);
    });
  });

  describe('Document Request Processing', () => {
    it('should process document request messages', async () => {
      // First create a document requirement
      await env.DB.prepare(`
        INSERT INTO document_requirements (
          id, matter_id, document_type, description, required, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'test-doc-req',
        testMatterId,
        'marriage_certificate',
        'Marriage certificate required',
        true,
        'pending'
      ).run();

      const docMessage: ParalegalTaskMessage = {
        type: 'document_request',
        matterId: testMatterId,
        teamId: testTeamId,
        data: {
          documentType: 'marriage_certificate',
          status: 'received'
        },
        timestamp: Date.now()
      };

      const mockMessage = createMockMessage(docMessage);
      const batch = createMockBatch([mockMessage]);

      await paralegalTasksConsumer.queue(batch, env);

      // Verify document requirement was updated
      const docRecords = await env.DB.prepare(
        'SELECT status FROM document_requirements WHERE matter_id = ? AND document_type = ?'
      ).bind(testMatterId, 'marriage_certificate').all();

      expect(docRecords.results).toHaveLength(1);
      const record = docRecords.results![0] as any;
      expect(record.status).toBe('received');
    });
  });

  describe('Conflict Check Processing', () => {
    it('should process conflict check messages', async () => {
      const conflictMessage: ParalegalTaskMessage = {
        type: 'conflict_check',
        matterId: testMatterId,
        teamId: testTeamId,
        data: {
          parties: ['ACME Corporation', 'John Doe'],
          result: {
            cleared: false,
            hits: [{ matterId: 'other-matter', conflictType: 'direct' }]
          },
          cleared: false,
          checkedBy: 'queue-processor',
          notes: 'Found potential conflicts'
        },
        timestamp: Date.now()
      };

      const mockMessage = createMockMessage(conflictMessage);
      const batch = createMockBatch([mockMessage]);

      await paralegalTasksConsumer.queue(batch, env);

      // Verify conflict check was recorded
      const conflictRecords = await env.DB.prepare(
        'SELECT * FROM conflict_checks WHERE matter_id = ?'
      ).bind(testMatterId).all();

      expect(conflictRecords.results).toHaveLength(1);
      const record = conflictRecords.results![0] as any;
      expect(record.cleared).toBe(0); // SQLite boolean as integer
      expect(record.checked_by).toBe('queue-processor');
    });
  });

  describe('Engagement Letter Processing', () => {
    it('should process engagement letter messages', async () => {
      // First create an engagement letter
      const letterId = 'test-letter-id';
      await env.DB.prepare(`
        INSERT INTO engagement_letters (
          id, matter_id, template_id, content, status, r2_key, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        letterId,
        testMatterId,
        'default',
        'Test letter content',
        'draft',
        'test-r2-key',
        1
      ).run();

      const letterMessage: ParalegalTaskMessage = {
        type: 'engagement_letter',
        matterId: testMatterId,
        teamId: testTeamId,
        data: {
          letterId,
          status: 'sent'
        },
        timestamp: Date.now()
      };

      const mockMessage = createMockMessage(letterMessage);
      const batch = createMockBatch([mockMessage]);

      await paralegalTasksConsumer.queue(batch, env);

      // Verify engagement letter status was updated
      const letterRecords = await env.DB.prepare(
        'SELECT status FROM engagement_letters WHERE id = ?'
      ).bind(letterId).all();

      expect(letterRecords.results).toHaveLength(1);
      const record = letterRecords.results![0] as any;
      expect(record.status).toBe('sent');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple messages in a batch', async () => {
      const messages = [
        createMockMessage({
          type: 'audit_log',
          matterId: testMatterId,
          teamId: testTeamId,
          data: { action: 'test_action_1' },
          timestamp: Date.now()
        }),
        createMockMessage({
          type: 'audit_log',
          matterId: testMatterId,
          teamId: testTeamId,
          data: { action: 'test_action_2' },
          timestamp: Date.now()
        }),
        createMockMessage({
          type: 'risk_assessment',
          matterId: testMatterId,
          teamId: testTeamId,
          data: { riskLevel: 'low' },
          timestamp: Date.now()
        })
      ];

      const batch = createMockBatch(messages);
      await paralegalTasksConsumer.queue(batch, env);

      // Verify all messages were processed
      const auditRecords = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM audit_log WHERE matter_id = ?'
      ).bind(testMatterId).all();

      const riskRecords = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM risk_assessments WHERE matter_id = ?'
      ).bind(testMatterId).all();

      expect((auditRecords.results![0] as any).count).toBe(2);
      expect((riskRecords.results![0] as any).count).toBe(1);
    });

    it('should handle mixed success and failure in batch', async () => {
      const goodMessage = createMockMessage({
        type: 'audit_log',
        matterId: testMatterId,
        teamId: testTeamId,
        data: { action: 'good_action' },
        timestamp: Date.now()
      });

      const badMessage = createMockMessage({
        type: 'unknown_type' as any,
        matterId: testMatterId,
        teamId: testTeamId,
        data: {},
        timestamp: Date.now()
      });

      const batch = createMockBatch([goodMessage, badMessage]);
      
      // Should not throw, but handle errors gracefully
      await expect(paralegalTasksConsumer.queue(batch, env)).resolves.not.toThrow();

      // Good message should have been processed
      const auditRecords = await env.DB.prepare(
        'SELECT * FROM audit_log WHERE matter_id = ? AND action = ?'
      ).bind(testMatterId, 'good_action').all();

      expect(auditRecords.results).toHaveLength(1);
      
      // Bad message should have been retried
      expect(badMessage.retry).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should retry messages on database errors', async () => {
      // Mock DB to fail
      const originalPrepare = env.DB.prepare;
      vi.spyOn(env.DB, 'prepare').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const message = createMockMessage({
        type: 'audit_log',
        matterId: testMatterId,
        teamId: testTeamId,
        data: { action: 'failing_action' },
        timestamp: Date.now()
      });

      const batch = createMockBatch([message]);
      
      await paralegalTasksConsumer.queue(batch, env);

      expect(message.retry).toHaveBeenCalled();

      // Restore original method
      env.DB.prepare = originalPrepare;
    });

    it('should handle unknown message types gracefully', async () => {
      const unknownMessage = createMockMessage({
        type: 'unknown_type' as any,
        matterId: testMatterId,
        teamId: testTeamId,
        data: {},
        timestamp: Date.now()
      });

      const batch = createMockBatch([unknownMessage]);
      
      // Should not throw
      await expect(paralegalTasksConsumer.queue(batch, env)).resolves.not.toThrow();
      
      // Should retry unknown message types
      expect(unknownMessage.retry).toHaveBeenCalled();
    });

    it('should handle malformed message data', async () => {
      const malformedMessage = createMockMessage({
        type: 'audit_log',
        matterId: testMatterId,
        teamId: testTeamId,
        data: null, // Malformed data
        timestamp: Date.now()
      });

      const batch = createMockBatch([malformedMessage]);
      
      await expect(paralegalTasksConsumer.queue(batch, env)).resolves.not.toThrow();
      expect(malformedMessage.retry).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should process large batches efficiently', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => 
        createMockMessage({
          type: 'audit_log',
          matterId: testMatterId,
          teamId: testTeamId,
          data: { action: `batch_action_${i}` },
          timestamp: Date.now()
        })
      );

      const batch = createMockBatch(messages);
      const startTime = Date.now();
      
      await paralegalTasksConsumer.queue(batch, env);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 50 messages in under 5 seconds
      expect(processingTime).toBeLessThan(5000);

      // Verify all were processed
      const auditRecords = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM audit_log WHERE matter_id = ?'
      ).bind(testMatterId).all();

      expect((auditRecords.results![0] as any).count).toBe(50);
    });
  });
});
