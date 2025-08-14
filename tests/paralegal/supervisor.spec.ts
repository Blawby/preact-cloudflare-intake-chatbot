import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { enableParalegalForTeam, disableParalegalForTeam, createTestMatter } from '../setup-workers';
import '../../worker/index'; // Ensure main worker is loaded

describe('Supervisor Router Integration', () => {
  let testTeamId: string;
  let disabledTeamId: string;

  beforeEach(async () => {
    testTeamId = 'test-team-1';
    disabledTeamId = 'test-team-disabled';
    
    // Ensure feature flags are set correctly
    await enableParalegalForTeam(testTeamId);
    await disableParalegalForTeam(disabledTeamId);
  });

  describe('Intent-based Routing', () => {
    it('should route paralegal keywords to Paralegal Agent', async () => {
      const paralegalMessages = [
        'I need help with my engagement letter',
        'Can you help me with matter formation?',
        'I need to check for conflicts',
        'What documents do I need for my case?',
        'Help me with the fee scope',
        'I need to prepare for filing'
      ];

      for (const message of paralegalMessages) {
        const response = await SELF.fetch('https://worker.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            teamId: testTeamId,
            sessionId: `supervisor-test-${Date.now()}`
          })
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.data.workflow).toBe('PARALEGAL_AGENT');
        expect(data.data.metadata.paralegalAgent).toBe(true);
      }
    });

    it('should route non-paralegal messages to intake agent', async () => {
      const intakeMessages = [
        'What is the weather like today?',
        'Tell me about your services',
        'I have a general legal question',
        'How much do you charge?',
        'What are your office hours?'
      ];

      for (const message of intakeMessages) {
        const response = await SELF.fetch('https://worker.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            teamId: testTeamId,
            sessionId: `intake-test-${Date.now()}`
          })
        });

        expect(response.status).toBe(200);
        
        const data = await response.json();
        // Should not have paralegal workflow
        expect(data.data.workflow).not.toBe('PARALEGAL_AGENT');
        expect(data.data.metadata?.paralegalAgent).not.toBe(true);
      }
    });

    it('should route document analysis to analysis path', async () => {
      const analysisMessages = [
        'Please analyze this document',
        'Can you review this PDF?',
        'I need document extraction'
      ];

      for (const message of analysisMessages) {
        const response = await SELF.fetch('https://worker.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            teamId: testTeamId,
            sessionId: `analysis-test-${Date.now()}`,
            attachments: [
              {
                name: 'test.pdf',
                type: 'application/pdf',
                size: 1024,
                url: '/api/files/test.pdf'
              }
            ]
          })
        });

        expect(response.status).toBe(200);
        
        // Should route to intake agent which handles analysis
        const data = await response.json();
        expect(data.data.workflow).not.toBe('PARALEGAL_AGENT');
      }
    });
  });

  describe('Feature Flag Control', () => {
    it('should route to intake when paralegal agent is disabled', async () => {
      const paralegalMessage = 'I need help with my engagement letter';
      
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: paralegalMessage }],
          teamId: disabledTeamId, // Team with paralegal disabled
          sessionId: `disabled-test-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      // Should not route to paralegal agent
      expect(data.data.workflow).not.toBe('PARALEGAL_AGENT');
      expect(data.data.metadata?.paralegalAgent).not.toBe(true);
    });

    it('should respect team-level feature flag changes', async () => {
      const paralegalMessage = 'Help me with matter formation';
      
      // Initially disabled team
      let response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: paralegalMessage }],
          teamId: disabledTeamId,
          sessionId: `flag-test-1-${Date.now()}`
        })
      });

      let data = await response.json();
      expect(data.data.workflow).not.toBe('PARALEGAL_AGENT');

      // Enable paralegal for the team
      await enableParalegalForTeam(disabledTeamId);

      // Now should route to paralegal
      response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: paralegalMessage }],
          teamId: disabledTeamId,
          sessionId: `flag-test-2-${Date.now()}`
        })
      });

      data = await response.json();
      expect(data.data.workflow).toBe('PARALEGAL_AGENT');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to intake agent when paralegal agent fails', async () => {
      // Create a team that doesn't exist in the database but has valid format
      const nonExistentTeam = 'non-existent-team-id';
      
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Help with engagement letter' }],
          teamId: nonExistentTeam,
          sessionId: `fallback-test-${Date.now()}`
        })
      });

      // Should still get a response (fallback to intake)
      expect(response.status).toBe(200);
      
      const data = await response.json();
      // Should not be paralegal workflow due to fallback
      expect(data.data.workflow).not.toBe('PARALEGAL_AGENT');
    });

    it('should handle DO errors gracefully', async () => {
      // This test would require more sophisticated mocking to simulate DO failures
      // For now, we test that the system remains stable
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Help with matter formation' }],
          teamId: testTeamId,
          sessionId: `error-test-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      // Should get some response, even if fallback
      const data = await response.json();
      expect(data.data).toBeDefined();
    });
  });

  describe('Session and Context Handling', () => {
    it('should maintain session context in paralegal routing', async () => {
      const sessionId = `context-test-${Date.now()}`;
      
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi! How can I help?' },
            { role: 'user', content: 'I need help with my engagement letter' }
          ],
          teamId: testTeamId,
          sessionId
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data.workflow).toBe('PARALEGAL_AGENT');
      expect(data.data.metadata.sessionId).toBe(sessionId);
      expect(data.data.metadata.teamId).toBe(testTeamId);
    });

    it('should handle multiple messages in conversation', async () => {
      const conversationMessages = [
        { role: 'user', content: 'I need legal help' },
        { role: 'assistant', content: 'I can help you with that' },
        { role: 'user', content: 'Specifically with matter formation and engagement letters' }
      ];

      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationMessages,
          teamId: testTeamId,
          sessionId: `conversation-test-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      // Should route to paralegal based on latest message
      expect(data.data.workflow).toBe('PARALEGAL_AGENT');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent response format for paralegal routing', async () => {
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Help with engagement letter' }],
          teamId: testTeamId,
          sessionId: `format-test-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('workflow', 'PARALEGAL_AGENT');
      expect(data.data).toHaveProperty('metadata');
      expect(data.data.metadata).toHaveProperty('paralegalAgent', true);
      expect(data.data.metadata).toHaveProperty('teamId', testTeamId);
    });

    it('should include matter progress information in paralegal responses', async () => {
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Show me my matter checklist' }],
          teamId: testTeamId,
          sessionId: `progress-test-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data.workflow).toBe('PARALEGAL_AGENT');
      expect(data.data.metadata).toHaveProperty('stage');
      expect(data.data.metadata).toHaveProperty('checklist');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent routing requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        SELF.fetch('https://worker.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Help with engagement letter ${i}` }],
            teamId: testTeamId,
            sessionId: `concurrent-test-${i}-${Date.now()}`
          })
        })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // All should route to paralegal
      const data = await Promise.all(responses.map(r => r.json()));
      expect(data.every(d => d.data.workflow === 'PARALEGAL_AGENT')).toBe(true);
    });

    it('should handle routing with minimal latency', async () => {
      const startTime = Date.now();
      
      const response = await SELF.fetch('https://worker.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Help with matter formation' }],
          teamId: testTeamId,
          sessionId: `latency-test-${Date.now()}`
        })
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status).toBe(200);
      // Routing should be fast (under 5 seconds in test environment)
      expect(latency).toBeLessThan(5000);
    });
  });
});
