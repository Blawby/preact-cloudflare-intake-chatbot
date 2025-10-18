/**
 * PII Encryption Service
 * Provides encryption/decryption for sensitive PII fields at rest
 * Uses Web Crypto API with AES-GCM for authenticated encryption
 */

import { Env } from '../types.js';

export interface PIIField {
  field: string;
  value: string | null;
  encrypted?: boolean;
}

export interface PIIAuditLog {
  userId: string;
  accessType: 'read' | 'update' | 'delete' | 'export';
  piiFields: string[];
  accessReason?: string;
  accessedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
}

export class PIIEncryptionService {
  private env: Env;
  private encryptionKey: CryptoKey | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Initialize encryption key from environment
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    const keyMaterial = this.env.BETTER_AUTH_SECRET || this.env.IDEMPOTENCY_SALT;
    if (!keyMaterial) {
      throw new Error('Encryption key material not found in environment');
    }

    // Derive a consistent key from the secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);
    
    // Import as raw key for AES-GCM
    this.encryptionKey = await crypto.subtle.importKey(
      'raw',
      keyData.slice(0, 32), // Use first 32 bytes for AES-256
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return this.encryptionKey;
  }

  /**
   * Encrypt a PII value
   */
  async encryptPII(value: string | null): Promise<string | null> {
    if (!value || value.trim() === '') {
      return null;
    }

    try {
      const key = await this.getEncryptionKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('PII encryption failed:', error);
      throw new Error('Failed to encrypt PII data');
    }
  }

  /**
   * Decrypt a PII value
   */
  async decryptPII(encryptedValue: string | null): Promise<string | null> {
    if (!encryptedValue || encryptedValue.trim() === '') {
      return null;
    }

    try {
      const key = await this.getEncryptionKey();
      
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedValue).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('PII decryption failed:', error);
      throw new Error('Failed to decrypt PII data');
    }
  }

  /**
   * Encrypt multiple PII fields
   */
  async encryptPIIFields(fields: PIIField[]): Promise<PIIField[]> {
    const encryptedFields: PIIField[] = [];
    
    for (const field of fields) {
      if (field.value && !field.encrypted) {
        const encrypted = await this.encryptPII(field.value);
        encryptedFields.push({
          ...field,
          value: encrypted,
          encrypted: true
        });
      } else {
        encryptedFields.push(field);
      }
    }
    
    return encryptedFields;
  }

  /**
   * Decrypt multiple PII fields
   */
  async decryptPIIFields(fields: PIIField[]): Promise<PIIField[]> {
    const decryptedFields: PIIField[] = [];
    
    for (const field of fields) {
      if (field.value && field.encrypted) {
        const decrypted = await this.decryptPII(field.value);
        decryptedFields.push({
          ...field,
          value: decrypted,
          encrypted: false
        });
      } else {
        decryptedFields.push(field);
      }
    }
    
    return decryptedFields;
  }

  /**
   * Log PII access for audit trail
   */
  async logPIIAccess(auditLog: PIIAuditLog): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO pii_access_audit (
          user_id, access_type, pii_fields, access_reason, 
          accessed_by, ip_address, user_agent, organization_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        auditLog.userId,
        auditLog.accessType,
        JSON.stringify(auditLog.piiFields),
        auditLog.accessReason || null,
        auditLog.accessedBy || null,
        auditLog.ipAddress || null,
        auditLog.userAgent || null,
        auditLog.organizationId || null
      ).run();
    } catch (error) {
      console.error('Failed to log PII access:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Get PII access audit logs for a user
   */
  async getPIIAccessLogs(
    userId: string, 
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    accessType: string;
    piiFields: string[];
    accessReason?: string;
    accessedBy?: string;
    timestamp: number;
    organizationId?: string;
  }>> {
    try {
      const result = await this.env.DB.prepare(`
        SELECT id, access_type, pii_fields, access_reason, 
               accessed_by, timestamp, organization_id
        FROM pii_access_audit 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `).bind(userId, limit, offset).all();

      return result.results?.map(row => ({
        id: row.id as string,
        accessType: row.access_type as string,
        piiFields: JSON.parse(row.pii_fields as string),
        accessReason: row.access_reason as string | undefined,
        accessedBy: row.accessed_by as string | undefined,
        timestamp: row.timestamp as number,
        organizationId: row.organization_id as string | undefined
      })) || [];
    } catch (error) {
      console.error('Failed to get PII access logs:', error);
      return [];
    }
  }

  /**
   * Check if user has given PII consent
   */
  async hasPIIConsent(userId: string): Promise<boolean> {
    try {
      const result = await this.env.DB.prepare(`
        SELECT pii_consent_given FROM users WHERE id = ?
      `).bind(userId).first();

      return Boolean(result?.pii_consent_given);
    } catch (error) {
      console.error('Failed to check PII consent:', error);
      return false;
    }
  }

  /**
   * Update PII consent for a user
   */
  async updatePIIConsent(
    userId: string, 
    consent: boolean,
    consentType: 'pii' | 'data_retention' | 'marketing' | 'data_processing' = 'pii'
  ): Promise<void> {
    try {
      const fieldMap = {
        pii: 'pii_consent_given',
        data_retention: 'data_retention_consent',
        marketing: 'marketing_consent',
        data_processing: 'data_processing_consent'
      };

      const field = fieldMap[consentType];
      const timestamp = Date.now();

      await this.env.DB.prepare(`
        UPDATE users 
        SET ${field} = ?, pii_consent_date = ?
        WHERE id = ?
      `).bind(consent ? 1 : 0, timestamp, userId).run();
    } catch (error) {
      console.error('Failed to update PII consent:', error);
      throw error;
    }
  }

  /**
   * Mark data for deletion (GDPR right to be forgotten)
   */
  async requestDataDeletion(userId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      await this.env.DB.prepare(`
        UPDATE users 
        SET data_deletion_requested = 1, data_deletion_date = ?
        WHERE id = ?
      `).bind(timestamp, userId).run();
    } catch (error) {
      console.error('Failed to request data deletion:', error);
      throw error;
    }
  }

  /**
   * Get users with pending data deletion requests
   */
  async getPendingDeletionRequests(): Promise<Array<{
    id: string;
    email: string;
    dataDeletionDate: number;
  }>> {
    try {
      const result = await this.env.DB.prepare(`
        SELECT id, email, data_deletion_date
        FROM users 
        WHERE data_deletion_requested = 1 AND data_deletion_date IS NOT NULL
        ORDER BY data_deletion_date ASC
      `).all();

      return result.results?.map(row => ({
        id: row.id as string,
        email: row.email as string,
        dataDeletionDate: row.data_deletion_date as number
      })) || [];
    } catch (error) {
      console.error('Failed to get pending deletion requests:', error);
      return [];
    }
  }
}
