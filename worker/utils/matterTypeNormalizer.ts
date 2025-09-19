/**
 * Centralized matter type normalization utility
 * 
 * This module provides consistent mapping between human-readable matter type labels
 * and canonical snake_case codes used throughout the system.
 */

export interface MatterTypeMapping {
  label: string;
  code: string;
  aliases?: string[];
}

/**
 * Canonical matter type mappings from human labels to snake_case codes
 * Includes explicit entries for ambiguous cases and common variations
 */
export const MATTER_TYPE_MAPPINGS: MatterTypeMapping[] = [
  { label: 'Family Law', code: 'family_law' },
  { label: 'Employment Law', code: 'employment_law' },
  { label: 'Landlord/Tenant', code: 'landlord_tenant', aliases: ['Tenant Rights Law', 'Landlord Tenant', 'Landlord-Tenant'] },
  { label: 'Personal Injury', code: 'personal_injury' },
  { label: 'Business Law', code: 'business_law' },
  { label: 'Criminal Law', code: 'criminal_law' },
  { label: 'Civil Law', code: 'civil_law' },
  { label: 'Contract Review', code: 'contract_review' },
  { label: 'Property Law', code: 'property_law' },
  { label: 'Administrative Law', code: 'administrative_law' },
  { label: 'General Consultation', code: 'general_consultation' }
];

/**
 * Maps human-readable labels to canonical snake_case codes
 */
const LABEL_TO_CODE_MAP = new Map<string, string>();
const ALIAS_TO_CODE_MAP = new Map<string, string>();

// Build lookup maps
MATTER_TYPE_MAPPINGS.forEach(mapping => {
  LABEL_TO_CODE_MAP.set(mapping.label, mapping.code);
  if (mapping.aliases) {
    mapping.aliases.forEach(alias => {
      ALIAS_TO_CODE_MAP.set(alias, mapping.code);
    });
  }
});

/**
 * Normalizes a matter type string to canonical snake_case format
 * 
 * @param matterType - The matter type string to normalize
 * @returns The canonical snake_case code
 */
export function normalizeMatterType(matterType: string): string {
  if (!matterType || typeof matterType !== 'string') {
    return 'general_consultation';
  }

  const trimmed = matterType.trim();
  
  // Direct label match
  if (LABEL_TO_CODE_MAP.has(trimmed)) {
    return LABEL_TO_CODE_MAP.get(trimmed)!;
  }
  
  // Alias match
  if (ALIAS_TO_CODE_MAP.has(trimmed)) {
    return ALIAS_TO_CODE_MAP.get(trimmed)!;
  }
  
  // Fallback: normalize by replacing non-alphanumeric characters with underscores
  // and converting to lowercase
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  
  return normalized || 'general_consultation';
}

/**
 * Gets the human-readable label for a canonical matter type code
 * 
 * @param code - The canonical snake_case code
 * @returns The human-readable label
 */
export function getMatterTypeLabel(code: string): string {
  const mapping = MATTER_TYPE_MAPPINGS.find(m => m.code === code);
  return mapping?.label || code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Gets all available matter type labels (for UI/enum generation)
 * 
 * @returns Array of human-readable labels
 */
export function getAvailableMatterTypeLabels(): string[] {
  return MATTER_TYPE_MAPPINGS.map(m => m.label);
}

/**
 * Gets all available matter type codes (for internal processing)
 * 
 * @returns Array of canonical snake_case codes
 */
export function getAvailableMatterTypeCodes(): string[] {
  return MATTER_TYPE_MAPPINGS.map(m => m.code);
}

/**
 * Validates if a matter type is supported
 * 
 * @param matterType - The matter type to validate
 * @returns True if the matter type is supported
 */
export function isValidMatterType(matterType: string): boolean {
  const normalized = normalizeMatterType(matterType);
  return getAvailableMatterTypeCodes().includes(normalized);
}

/**
 * Normalizes an array of matter types (useful for team config processing)
 * 
 * @param matterTypes - Array of matter type strings
 * @returns Array of normalized canonical codes
 */
export function normalizeMatterTypes(matterTypes: string[]): string[] {
  if (!Array.isArray(matterTypes)) {
    return [];
  }
  
  return matterTypes
    .map(type => normalizeMatterType(type))
    .filter((code, index, array) => array.indexOf(code) === index); // Remove duplicates
}
