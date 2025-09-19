import type { Env } from '../types';
import { normalizeMatterType } from '../utils/matterTypeNormalizer.js';

export interface DocumentRequirement {
  id: string;
  documentType: string;
  title: string;
  description: string;
  required: boolean;
  category: 'identification' | 'financial' | 'legal' | 'medical' | 'business' | 'other';
  expectedFormat?: string;
  examples?: string[];
  estimatedTime?: string; // How long it typically takes to obtain
}

export interface MatterDocumentRequirements {
  matterType: string;
  requirements: DocumentRequirement[];
  totalRequired: number;
  estimatedCompletionTime: string;
  notes?: string;
}

export class DocumentRequirementService {
  constructor(private env: Env) {}

  /**
   * Get document requirements for a specific matter type
   */
  async getRequirements(matterType: string): Promise<MatterDocumentRequirements> {
    const normalizedType = normalizeMatterType(matterType);
    const requirements = this.getTemplateRequirements(normalizedType);
    
    const totalRequired = requirements.filter(req => req.required).length;
    const estimatedTime = this.calculateEstimatedTime(requirements);

    return {
      matterType,
      requirements,
      totalRequired,
      estimatedCompletionTime: estimatedTime,
      notes: this.getMatterTypeNotes(normalizedType)
    };
  }

  /**
   * Create document requirements for a specific matter in the database
   */
  async createMatterRequirements(matterId: string, matterType: string): Promise<void> {
    const requirements = await this.getRequirements(matterType);
    
    try {
      // Explicit transaction to ensure atomicity
      await this.env.DB.prepare('BEGIN TRANSACTION').run();
      const insertSql = `
        INSERT INTO document_requirements (
          id, matter_id, document_type, description, required, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `;

      const preparedInserts = requirements.requirements.map(req =>
        this.env.DB.prepare(insertSql).bind(
          crypto.randomUUID(),
          matterId,
          req.documentType,
          req.description,
          req.required
        )
      );

      // Execute as a batch for performance and atomicity
      await this.env.DB.batch(preparedInserts);

      await this.env.DB.prepare('COMMIT').run();

      console.log(`Created ${requirements.requirements.length} document requirements for matter ${matterId}`);
    } catch (error) {
      console.error('Failed to create document requirements:', error);
      try { await this.env.DB.prepare('ROLLBACK').run(); } catch {}
      throw error;
    }
  }

  /**
   * Update the status of a document requirement
   */
  async updateRequirementStatus(
    matterId: string, 
    documentType: string, 
    status: 'pending' | 'requested' | 'received' | 'reviewed' | 'approved',
    fileId?: string
  ): Promise<void> {
    try {
      const stmt = this.env.DB.prepare(`
        UPDATE document_requirements 
        SET status = ?, file_id = ?, updated_at = datetime('now')
        WHERE matter_id = ? AND document_type = ?
      `);

      await stmt.bind(status, fileId || null, matterId, documentType).run();
      console.log(`Updated document requirement ${documentType} to ${status} for matter ${matterId}`);
    } catch (error) {
      console.error('Failed to update document requirement:', error);
      throw error;
    }
  }

  /**
   * Get the current status of document requirements for a matter
   */
  async getMatterRequirementStatus(matterId: string): Promise<any[]> {
    try {
      const stmt = this.env.DB.prepare(`
        SELECT document_type, description, required, status, file_id, due_date, updated_at
        FROM document_requirements 
        WHERE matter_id = ?
        ORDER BY required DESC, document_type ASC
      `);

      const results = await stmt.bind(matterId).all();
      return results.results || [];
    } catch (error) {
      console.error('Failed to get matter requirement status:', error);
      return [];
    }
  }

  private getTemplateRequirements(matterType: string): DocumentRequirement[] {
    const templates: Record<string, DocumentRequirement[]> = {
      family_law: [
        {
          id: 'marriage_cert',
          documentType: 'marriage_certificate',
          title: 'Marriage Certificate',
          description: 'Official marriage certificate or license',
          required: true,
          category: 'legal',
          expectedFormat: 'PDF or certified copy',
          estimatedTime: '1-2 days'
        },
        {
          id: 'birth_certs',
          documentType: 'birth_certificates',
          title: 'Birth Certificates (Children)',
          description: 'Birth certificates for all minor children',
          required: true,
          category: 'legal',
          expectedFormat: 'PDF or certified copy',
          estimatedTime: '1-3 days'
        },
        {
          id: 'financial_statements',
          documentType: 'financial_statements',
          title: 'Financial Statements',
          description: 'Bank statements, pay stubs, tax returns (last 2 years)',
          required: true,
          category: 'financial',
          estimatedTime: '3-5 days'
        },
        {
          id: 'property_deeds',
          documentType: 'property_deeds',
          title: 'Property Deeds',
          description: 'Deeds for real estate, vehicle titles',
          required: false,
          category: 'legal',
          estimatedTime: '1-2 weeks'
        }
      ],
      employment_law: [
        {
          id: 'employment_contract',
          documentType: 'employment_contract',
          title: 'Employment Contract/Offer Letter',
          description: 'Original employment agreement or offer letter',
          required: true,
          category: 'legal',
          estimatedTime: 'immediate'
        },
        {
          id: 'employee_handbook',
          documentType: 'employee_handbook',
          title: 'Employee Handbook',
          description: 'Company policies and procedures manual',
          required: true,
          category: 'legal',
          estimatedTime: '1-2 days'
        },
        {
          id: 'performance_reviews',
          documentType: 'performance_reviews',
          title: 'Performance Reviews',
          description: 'All performance evaluations and disciplinary records',
          required: false,
          category: 'business',
          estimatedTime: '3-5 days'
        },
        {
          id: 'correspondence',
          documentType: 'correspondence',
          title: 'Email/Written Correspondence',
          description: 'Relevant emails, memos, or written communications',
          required: false,
          category: 'business',
          estimatedTime: '1-3 days'
        }
      ],
      personal_injury: [
        {
          id: 'medical_records',
          documentType: 'medical_records',
          title: 'Medical Records',
          description: 'All medical records related to the injury',
          required: true,
          category: 'medical',
          estimatedTime: '1-2 weeks'
        },
        {
          id: 'accident_report',
          documentType: 'accident_report',
          title: 'Accident/Incident Report',
          description: 'Police report, incident report, or accident documentation',
          required: true,
          category: 'legal',
          estimatedTime: '3-5 days'
        },
        {
          id: 'insurance_docs',
          documentType: 'insurance_documents',
          title: 'Insurance Documents',
          description: 'Insurance policies, claim numbers, correspondence',
          required: true,
          category: 'financial',
          estimatedTime: '1-2 days'
        },
        {
          id: 'photos_evidence',
          documentType: 'photos_evidence',
          title: 'Photos and Evidence',
          description: 'Photos of injuries, accident scene, property damage',
          required: false,
          category: 'other',
          estimatedTime: 'immediate'
        }
      ],
      contract_review: [
        {
          id: 'contract_draft',
          documentType: 'contract_draft',
          title: 'Contract Draft',
          description: 'The contract document that needs review',
          required: true,
          category: 'legal',
          estimatedTime: 'immediate'
        },
        {
          id: 'related_docs',
          documentType: 'related_documents',
          title: 'Related Documents',
          description: 'Any addendums, exhibits, or related agreements',
          required: false,
          category: 'legal',
          estimatedTime: '1-2 days'
        },
        {
          id: 'business_info',
          documentType: 'business_information',
          title: 'Business Information',
          description: 'Business licenses, articles of incorporation (if applicable)',
          required: false,
          category: 'business',
          estimatedTime: '3-5 days'
        }
      ],
      general_consultation: [
        {
          id: 'background_docs',
          documentType: 'background_documents',
          title: 'Background Documents',
          description: 'Any documents related to your legal situation',
          required: false,
          category: 'other',
          estimatedTime: '1-3 days'
        },
        {
          id: 'correspondence',
          documentType: 'correspondence',
          title: 'Relevant Correspondence',
          description: 'Letters, emails, or notices related to your matter',
          required: false,
          category: 'other',
          estimatedTime: '1-2 days'
        }
      ]
    };

    return templates[matterType] || templates.general_consultation;
  }

  private calculateEstimatedTime(requirements: DocumentRequirement[]): string {
    const requiredDocs = requirements.filter(req => req.required);
    if (requiredDocs.length === 0) return '1-2 days';

    const hasWeekLongItems = requiredDocs.some(req => 
      req.estimatedTime?.includes('week') || req.estimatedTime?.includes('2 weeks')
    );
    
    if (hasWeekLongItems) return '1-2 weeks';

    const hasMultiDayItems = requiredDocs.some(req => 
      req.estimatedTime?.includes('3-5 days') || req.estimatedTime?.includes('5 days')
    );
    
    return hasMultiDayItems ? '3-5 days' : '1-3 days';
  }

  private getMatterTypeNotes(matterType: string): string {
    const notes: Record<string, string> = {
      family_law: 'Financial documents are crucial for asset division and support calculations. Certified copies may be required for court filing.',
      employment_law: 'Gather all written communications and company policies. Document any witnesses to incidents.',
      personal_injury: 'Medical records are essential for proving damages. Keep all receipts for medical expenses and lost wages.',
      contract_review: 'Provide the most current version of the contract. Note any specific concerns or red flags.',
      general_consultation: 'Bring any documents that help explain your legal situation, even if you\'re not sure they\'re relevant.'
    };

    return notes[matterType] || 'Gather any documents that may be relevant to your legal matter.';
  }
}
