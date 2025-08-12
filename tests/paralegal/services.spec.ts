import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { createTestMatter } from '../setup-workers';
import { ConflictCheckService } from '../../worker/services/ConflictCheckService';
import { DocumentRequirementService } from '../../worker/services/DocumentRequirementService';
import { EngagementLetterService } from '../../worker/services/EngagementLetterService';
import { RiskAssessmentService } from '../../worker/services/RiskAssessmentService';

describe('Paralegal Services', () => {
  let testTeamId: string;

  beforeEach(() => {
    testTeamId = 'test-team-1';
  });

  describe('ConflictCheckService', () => {
    let conflictService: ConflictCheckService;

    beforeEach(() => {
      conflictService = new ConflictCheckService(env);
    });

    it('should find direct conflicts with existing matters', async () => {
      // Create a matter with opposing party
      await createTestMatter(testTeamId, {
        opposing_party: 'ACME Corporation',
        title: 'Existing ACME Matter'
      });

      const result = await conflictService.checkConflicts(testTeamId, ['ACME Corporation']);

      expect(result.cleared).toBe(false);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].conflictType).toBe('direct');
      expect(result.hits[0].opposingParty).toBe('ACME Corporation');
      expect(result.hits[0].similarity).toBe(1.0);
    });

    it('should clear when no conflicts exist', async () => {
      const result = await conflictService.checkConflicts(testTeamId, ['Unique Company Inc']);

      expect(result.cleared).toBe(true);
      expect(result.hits).toHaveLength(0);
      expect(result.checkedParties).toEqual(['Unique Company Inc']);
    });

    it('should find fuzzy matches for similar names', async () => {
      // Create matter with specific opposing party
      await createTestMatter(testTeamId, {
        opposing_party: 'ACME Corporation LLC',
        title: 'ACME Matter'
      });

      // Check for similar but not exact name
      const result = await conflictService.checkConflicts(testTeamId, ['ACME Corp']);

      expect(result.hits.length).toBeGreaterThan(0);
      const hit = result.hits[0];
      expect(hit.conflictType).toBe('related');
      expect(hit.similarity).toBeGreaterThan(0.7);
    });

    it('should detect client conflicts', async () => {
      // Create matter where client name matches new opposing party
      await createTestMatter(testTeamId, {
        client_name: 'John Doe Industries',
        title: 'Client Matter'
      });

      const result = await conflictService.checkConflicts(testTeamId, ['John Doe Industries']);

      expect(result.hits.length).toBeGreaterThan(0);
      const clientHit = result.hits.find(hit => hit.conflictType === 'potential');
      expect(clientHit).toBeDefined();
    });

    it('should handle multiple parties', async () => {
      await createTestMatter(testTeamId, { opposing_party: 'Company A' });
      await createTestMatter(testTeamId, { opposing_party: 'Company B' });

      const result = await conflictService.checkConflicts(testTeamId, ['Company A', 'Company B', 'Company C']);

      expect(result.cleared).toBe(false);
      expect(result.hits.length).toBeGreaterThanOrEqual(2);
      expect(result.checkedParties).toEqual(['Company A', 'Company B', 'Company C']);
    });

    it('should record conflict checks in database', async () => {
      const matterId = await createTestMatter(testTeamId);
      const result = await conflictService.checkConflicts(testTeamId, ['Test Company']);

      await conflictService.recordConflictCheck(matterId, result, 'test-user');

      // Verify record was created
      const records = await env.DB.prepare(
        'SELECT * FROM conflict_checks WHERE matter_id = ?'
      ).bind(matterId).all();

      expect(records.results).toHaveLength(1);
      const record = records.results![0] as any;
      expect(record.cleared).toBe(result.cleared ? 1 : 0);
      expect(record.checked_by).toBe('test-user');
    });

    it('should handle database errors gracefully', async () => {
      // Mock DB to throw error
      const originalPrepare = env.DB.prepare;
      vi.spyOn(env.DB, 'prepare').mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await conflictService.checkConflicts(testTeamId, ['Test Company']);

      // Should return safe result
      expect(result.cleared).toBe(false);
      expect(result.notes).toContain('failed');

      // Restore original method
      env.DB.prepare = originalPrepare;
    });
  });

  describe('DocumentRequirementService', () => {
    let docService: DocumentRequirementService;

    beforeEach(() => {
      docService = new DocumentRequirementService(env);
    });

    it('should return requirements for family law matters', async () => {
      const requirements = await docService.getRequirements('family_law');

      expect(requirements.matterType).toBe('family_law');
      expect(requirements.requirements.length).toBeGreaterThan(0);
      expect(requirements.totalRequired).toBeGreaterThan(0);
      expect(requirements.estimatedCompletionTime).toBeDefined();

      // Check specific family law requirements
      const marriageCert = requirements.requirements.find(req => req.documentType === 'marriage_certificate');
      expect(marriageCert).toBeDefined();
      expect(marriageCert!.required).toBe(true);
    });

    it('should return requirements for employment law matters', async () => {
      const requirements = await docService.getRequirements('employment_law');

      expect(requirements.matterType).toBe('employment_law');
      expect(requirements.requirements.length).toBeGreaterThan(0);

      const employmentContract = requirements.requirements.find(req => req.documentType === 'employment_contract');
      expect(employmentContract).toBeDefined();
      expect(employmentContract!.required).toBe(true);
    });

    it('should create matter requirements in database', async () => {
      const matterId = await createTestMatter(testTeamId);

      await docService.createMatterRequirements(matterId, 'family_law');

      // Verify requirements were created
      const requirements = await env.DB.prepare(
        'SELECT * FROM document_requirements WHERE matter_id = ?'
      ).bind(matterId).all();

      expect(requirements.results!.length).toBeGreaterThan(0);
      
      const marriageReq = requirements.results!.find((req: any) => 
        req.document_type === 'marriage_certificate'
      );
      expect(marriageReq).toBeDefined();
    });

    it('should update requirement status', async () => {
      const matterId = await createTestMatter(testTeamId);
      await docService.createMatterRequirements(matterId, 'family_law');

      await docService.updateRequirementStatus(matterId, 'marriage_certificate', 'received', 'file-123');

      const status = await docService.getMatterRequirementStatus(matterId);
      const marriageReq = status.find(req => req.document_type === 'marriage_certificate');
      
      expect(marriageReq.status).toBe('received');
      expect(marriageReq.file_id).toBe('file-123');
    });

    it('should get matter requirement status', async () => {
      const matterId = await createTestMatter(testTeamId);
      await docService.createMatterRequirements(matterId, 'employment_law');

      const status = await docService.getMatterRequirementStatus(matterId);

      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toHaveProperty('document_type');
      expect(status[0]).toHaveProperty('status');
      expect(status[0]).toHaveProperty('required');
    });

    it('should handle unknown matter types gracefully', async () => {
      const requirements = await docService.getRequirements('unknown_matter_type');

      expect(requirements.matterType).toBe('unknown_matter_type');
      expect(requirements.requirements.length).toBeGreaterThan(0); // Should fallback to general
      expect(requirements.notes).toContain('relevant');
    });
  });

  describe('EngagementLetterService', () => {
    let letterService: EngagementLetterService;

    beforeEach(() => {
      letterService = new EngagementLetterService(env);
    });

    it('should generate engagement letter with default template', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        matterType: 'family_law',
        matterDescription: 'Divorce proceedings',
        attorneyName: 'Jane Attorney',
        firmName: 'Test Law Firm',
        scopeOfWork: 'Representation in divorce proceedings',
        hourlyRate: 250,
        retainerAmount: 5000,
        effectiveDate: '2024-01-01'
      };

      const result = await letterService.generateLetter(matterId, 'default', letterData);

      expect(result.id).toBeDefined();
      expect(result.matterId).toBe(matterId);
      expect(result.content).toContain('John Doe');
      expect(result.content).toContain('Jane Attorney');
      expect(result.content).toContain('$250');
      expect(result.r2Key).toContain('engagement');
      expect(result.status).toBe('draft');
    });

    it('should generate family law specific engagement letter', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'Jane Smith',
        matterType: 'family_law',
        matterDescription: 'Child custody matter',
        attorneyName: 'John Lawyer',
        firmName: 'Family Law Associates',
        hourlyRate: 300,
        retainerAmount: 7500,
        effectiveDate: '2024-02-01'
      };

      const result = await letterService.generateLetter(matterId, 'family_law', letterData);

      expect(result.content).toContain('Jane Smith');
      expect(result.content).toContain('Family Law Associates');
      expect(result.content).toContain('emotionally');
    });

    it('should store PDF in R2 bucket', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'Test Client',
        matterType: 'contract_review',
        matterDescription: 'Contract review',
        attorneyName: 'Test Attorney',
        firmName: 'Test Firm',
        effectiveDate: '2024-01-01'
      };

      const result = await letterService.generateLetter(matterId, 'default', letterData);

      // Verify file exists in R2
      const r2Object = await env.FILES_BUCKET!.get(result.r2Key);
      expect(r2Object).toBeTruthy();
      expect(r2Object!.httpMetadata?.contentType).toBe('application/pdf');
    });

    it('should record engagement letter in database', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'Database Test',
        matterType: 'general',
        matterDescription: 'General matter',
        attorneyName: 'Test Attorney',
        firmName: 'Test Firm',
        effectiveDate: '2024-01-01'
      };

      const result = await letterService.generateLetter(matterId, 'default', letterData);

      // Verify database record
      const records = await env.DB.prepare(
        'SELECT * FROM engagement_letters WHERE id = ?'
      ).bind(result.id).all();

      expect(records.results).toHaveLength(1);
      const record = records.results![0] as any;
      expect(record.matter_id).toBe(matterId);
      expect(record.status).toBe('draft');
      expect(record.r2_key).toBe(result.r2Key);
    });

    it('should update engagement letter status', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'Status Test',
        matterType: 'general',
        matterDescription: 'Status test matter',
        attorneyName: 'Test Attorney',
        firmName: 'Test Firm',
        effectiveDate: '2024-01-01'
      };

      const result = await letterService.generateLetter(matterId, 'default', letterData);
      
      await letterService.updateStatus(result.id, 'sent');

      // Verify status update
      const records = await env.DB.prepare(
        'SELECT status FROM engagement_letters WHERE id = ?'
      ).bind(result.id).all();

      const record = records.results![0] as any;
      expect(record.status).toBe('sent');
    });

    it('should get letters for matter', async () => {
      const matterId = await createTestMatter(testTeamId);
      const letterData = {
        clientName: 'Multiple Test',
        matterType: 'general',
        matterDescription: 'Multiple letters test',
        attorneyName: 'Test Attorney',
        firmName: 'Test Firm',
        effectiveDate: '2024-01-01'
      };

      // Generate two letters
      await letterService.generateLetter(matterId, 'default', letterData);
      await letterService.generateLetter(matterId, 'family_law', letterData);

      const letters = await letterService.getLettersForMatter(matterId);

      expect(letters.length).toBe(2);
      expect(letters[0]).toHaveProperty('template_id');
      expect(letters[0]).toHaveProperty('status');
      expect(letters[0]).toHaveProperty('r2_key');
    });
  });

  describe('RiskAssessmentService', () => {
    let riskService: RiskAssessmentService;

    beforeEach(() => {
      riskService = new RiskAssessmentService(env);
      
      // Mock AI service for consistent testing
      vi.spyOn(env.AI as any, 'run').mockResolvedValue({
        response: JSON.stringify({
          riskLevel: 'medium',
          riskFactors: [
            {
              type: 'legal',
              level: 'medium',
              description: 'Complex litigation matter',
              impact: 'Requires careful case management'
            }
          ],
          recommendations: ['Assign experienced attorney', 'Monitor deadlines closely'],
          complexity: 'moderate',
          confidence: 0.8
        })
      });
    });

    it('should assess risk for low-risk matters', async () => {
      const assessment = await riskService.assessRisk(
        'Simple contract review for standard terms',
        'contract_review'
      );

      expect(assessment.overallRiskLevel).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(assessment.overallRiskLevel);
      expect(assessment.riskFactors).toBeInstanceOf(Array);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.confidenceScore).toBeGreaterThan(0);
    });

    it('should assess risk for high-risk matters', async () => {
      const assessment = await riskService.assessRisk(
        'Criminal defense case with felony charges and statute of limitations concerns',
        'criminal_law'
      );

      expect(assessment.overallRiskLevel).toBeDefined();
      expect(assessment.riskFactors.length).toBeGreaterThan(0);
      expect(assessment.flags).toContain('HIGH_STAKES');
    });

    it('should identify time-sensitive matters', async () => {
      const assessment = await riskService.assessRisk(
        'Emergency injunction needed before deadline tomorrow',
        'litigation'
      );

      expect(assessment.flags).toContain('TIME_SENSITIVE');
      expect(assessment.riskFactors.some(factor => 
        factor.type === 'procedural' && factor.level === 'high'
      )).toBe(true);
    });

    it('should assess financial complexity', async () => {
      const assessment = await riskService.assessRisk(
        'Multi-million dollar acquisition with complex regulatory requirements',
        'corporate_law'
      );

      expect(assessment.flags).toContain('HIGH_VALUE');
      expect(assessment.riskFactors.some(factor => 
        factor.type === 'financial'
      )).toBe(true);
    });

    it('should record risk assessment in database', async () => {
      const matterId = await createTestMatter(testTeamId);
      const assessment = await riskService.assessRisk(
        'Standard business matter',
        'business_law'
      );

      await riskService.recordAssessment(matterId, assessment, 'test-user');

      // Verify database record
      const records = await env.DB.prepare(
        'SELECT * FROM risk_assessments WHERE matter_id = ?'
      ).bind(matterId).all();

      expect(records.results).toHaveLength(1);
      const record = records.results![0] as any;
      expect(record.matter_id).toBe(matterId);
      expect(record.assessed_by).toBe('test-user');
      expect(record.risk_level).toBe(assessment.overallRiskLevel);
    });

    it('should handle AI service failures gracefully', async () => {
      // Mock AI service to fail
      vi.spyOn(env.AI as any, 'run').mockRejectedValue(new Error('AI service unavailable'));

      const assessment = await riskService.assessRisk(
        'Test matter with AI failure',
        'general'
      );

      expect(assessment.overallRiskLevel).toBe('medium');
      expect(assessment.flags).toContain('SYSTEM_ERROR');
      expect(assessment.notes).toContain('manual review required');
      expect(assessment.confidenceScore).toBe(0.3);
    });

    it('should combine rule-based and AI assessments', async () => {
      const assessment = await riskService.assessRisk(
        'Employment discrimination case with urgent filing deadline',
        'employment_law'
      );

      // Should have both rule-based (deadline) and AI-based risk factors
      expect(assessment.riskFactors.length).toBeGreaterThan(1);
      expect(assessment.riskFactors.some(factor => 
        factor.description.includes('Time-sensitive') || factor.description.includes('urgent')
      )).toBe(true);
    });

    it('should provide appropriate recommendations by risk level', async () => {
      const highRiskAssessment = await riskService.assessRisk(
        'Class action lawsuit with criminal implications',
        'litigation'
      );

      expect(highRiskAssessment.recommendations.some(rec => 
        rec.includes('senior') || rec.includes('specialist') || rec.includes('partner')
      )).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should work together in matter formation workflow', async () => {
      const matterId = await createTestMatter(testTeamId);
      
      // 1. Run conflict check
      const conflictService = new ConflictCheckService(env);
      const conflictResult = await conflictService.checkConflicts(testTeamId, ['Integration Test Corp']);
      await conflictService.recordConflictCheck(matterId, conflictResult);

      // 2. Create document requirements
      const docService = new DocumentRequirementService(env);
      await docService.createMatterRequirements(matterId, 'family_law');

      // 3. Generate engagement letter
      const letterService = new EngagementLetterService(env);
      const letterResult = await letterService.generateLetter(matterId, 'family_law', {
        clientName: 'Integration Test Client',
        matterType: 'family_law',
        matterDescription: 'Integration test matter',
        attorneyName: 'Test Attorney',
        firmName: 'Integration Test Firm',
        effectiveDate: '2024-01-01'
      });

      // 4. Assess risk
      const riskService = new RiskAssessmentService(env);
      const riskResult = await riskService.assessRisk('Family law matter with standard complexity', 'family_law');
      await riskService.recordAssessment(matterId, riskResult);

      // Verify all services created their records
      const conflictRecords = await env.DB.prepare('SELECT * FROM conflict_checks WHERE matter_id = ?').bind(matterId).all();
      const docRecords = await env.DB.prepare('SELECT * FROM document_requirements WHERE matter_id = ?').bind(matterId).all();
      const letterRecords = await env.DB.prepare('SELECT * FROM engagement_letters WHERE matter_id = ?').bind(matterId).all();
      const riskRecords = await env.DB.prepare('SELECT * FROM risk_assessments WHERE matter_id = ?').bind(matterId).all();

      expect(conflictRecords.results).toHaveLength(1);
      expect(docRecords.results!.length).toBeGreaterThan(0);
      expect(letterRecords.results).toHaveLength(1);
      expect(riskRecords.results).toHaveLength(1);

      // Verify R2 object exists
      const r2Object = await env.FILES_BUCKET!.get(letterResult.r2Key);
      expect(r2Object).toBeTruthy();
    });
  });
});
