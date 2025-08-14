import type { Env } from '../types';

export interface ConflictCheckResult {
  cleared: boolean;
  hits: ConflictHit[];
  checkedParties: string[];
  checkedAt: string;
  notes?: string;
}

export interface ConflictHit {
  matterId: string;
  matterTitle?: string;
  opposingParty: string;
  conflictType: 'direct' | 'related' | 'potential';
  similarity: number; // 0.0 to 1.0
  details?: string;
}

export class ConflictCheckService {
  constructor(private env: Env) {}

  /**
   * Check for conflicts of interest with the given parties
   */
  async checkConflicts(teamId: string, parties: string[]): Promise<ConflictCheckResult> {
    console.log('Running conflict check for team:', teamId, 'parties:', parties);
    
    const hits: ConflictHit[] = [];
    const checkedParties = parties.filter(p => p && p.trim().length > 0);

    try {
      // Check against existing matters in the same team
      for (const party of checkedParties) {
        const cleanParty = party.trim().toLowerCase();
        
        // Direct name matches in opposing_party field
        const directMatches = await this.findDirectMatches(teamId, cleanParty);
        hits.push(...directMatches);

        // Fuzzy matches for similar names
        const fuzzyMatches = await this.findFuzzyMatches(teamId, cleanParty);
        hits.push(...fuzzyMatches);

        // Check client names for potential conflicts
        const clientMatches = await this.findClientMatches(teamId, cleanParty);
        hits.push(...clientMatches);
      }

      // Remove duplicates and sort by similarity
      const uniqueHits = this.deduplicateHits(hits);
      
      const result: ConflictCheckResult = {
        cleared: uniqueHits.length === 0,
        hits: uniqueHits,
        checkedParties,
        checkedAt: new Date().toISOString(),
        notes: uniqueHits.length > 0 
          ? `Found ${uniqueHits.length} potential conflict(s) requiring review`
          : 'No conflicts detected'
      };

      console.log('Conflict check completed:', result);
      return result;

    } catch (error) {
      console.error('Conflict check failed:', error);
      
      // Return a safe result that requires manual review
      return {
        cleared: false,
        hits: [],
        checkedParties,
        checkedAt: new Date().toISOString(),
        notes: 'Conflict check failed - manual review required'
      };
    }
  }

  private async findDirectMatches(teamId: string, party: string): Promise<ConflictHit[]> {
    const stmt = this.env.DB.prepare(`
      SELECT id, title, opposing_party, client_name 
      FROM matters 
      WHERE team_id = ? 
        AND (LOWER(opposing_party) = ? OR LOWER(opposing_party) LIKE ?)
        AND status != 'archived'
      LIMIT 10
    `);

    const results = await stmt.bind(teamId, party, `%${party}%`).all();
    
    return (results.results || []).map((row: any) => ({
      matterId: row.id,
      matterTitle: row.title,
      opposingParty: row.opposing_party || 'Unknown',
      conflictType: 'direct' as const,
      similarity: 1.0,
      details: `Direct match with opposing party in matter: ${row.title || 'Untitled'}`
    }));
  }

  private async findFuzzyMatches(teamId: string, party: string): Promise<ConflictHit[]> {
    // Simple fuzzy matching using SQL LIKE with variations
    const variations = this.generateNameVariations(party);
    const hits: ConflictHit[] = [];

    for (const variation of variations) {
      const stmt = this.env.DB.prepare(`
        SELECT id, title, opposing_party, client_name 
        FROM matters 
        WHERE team_id = ? 
          AND LOWER(opposing_party) LIKE ?
          AND status != 'archived'
        LIMIT 5
      `);

      const results = await stmt.bind(teamId, `%${variation}%`).all();
      
      for (const row of (results.results || [])) {
        const similarity = this.calculateSimilarity(party, row.opposing_party || '');
        if (similarity > 0.7) { // Only include high-confidence matches
          hits.push({
            matterId: row.id,
            matterTitle: row.title,
            opposingParty: row.opposing_party || 'Unknown',
            conflictType: 'related' as const,
            similarity,
            details: `Similar name match (${Math.round(similarity * 100)}% confidence)`
          });
        }
      }
    }

    return hits;
  }

  private async findClientMatches(teamId: string, party: string): Promise<ConflictHit[]> {
    // Check if the opposing party matches any of our clients
    const stmt = this.env.DB.prepare(`
      SELECT id, title, client_name 
      FROM matters 
      WHERE team_id = ? 
        AND LOWER(client_name) LIKE ?
        AND status != 'archived'
      LIMIT 5
    `);

    const results = await stmt.bind(teamId, `%${party}%`).all();
    
    return (results.results || []).map((row: any) => ({
      matterId: row.id,
      matterTitle: row.title,
      opposingParty: party,
      conflictType: 'potential' as const,
      similarity: 0.9,
      details: `Potential conflict: opposing party matches existing client "${row.client_name}"`
    }));
  }

  private generateNameVariations(name: string): string[] {
    const variations = [name];
    
    // Add variations without common suffixes
    const suffixes = [' inc', ' llc', ' corp', ' ltd', ' co'];
    for (const suffix of suffixes) {
      if (name.endsWith(suffix)) {
        variations.push(name.slice(0, -suffix.length));
      } else {
        variations.push(name + suffix);
      }
    }

    // Add variations with/without middle initials
    const words = name.split(' ');
    if (words.length >= 3) {
      // Try without middle name/initial
      variations.push(`${words[0]} ${words[words.length - 1]}`);
    }

    return [...new Set(variations)]; // Remove duplicates
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity based on word overlap
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private deduplicateHits(hits: ConflictHit[]): ConflictHit[] {
    const seen = new Set<string>();
    const unique: ConflictHit[] = [];

    for (const hit of hits) {
      const key = `${hit.matterId}-${hit.opposingParty}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(hit);
      }
    }

    // Sort by conflict type (direct first) then by similarity
    return unique.sort((a, b) => {
      const typeOrder = { direct: 0, potential: 1, related: 2 };
      const typeCompare = typeOrder[a.conflictType] - typeOrder[b.conflictType];
      if (typeCompare !== 0) return typeCompare;
      return b.similarity - a.similarity;
    });
  }

  /**
   * Record a conflict check in the database
   */
  async recordConflictCheck(
    matterId: string, 
    result: ConflictCheckResult, 
    checkedBy: string = 'system'
  ): Promise<void> {
    try {
      const stmt = this.env.DB.prepare(`
        INSERT INTO conflict_checks (
          id, matter_id, parties, result, cleared, checked_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      await stmt.bind(
        crypto.randomUUID(),
        matterId,
        JSON.stringify(result.checkedParties),
        JSON.stringify(result),
        result.cleared,
        checkedBy,
        result.notes
      ).run();

      console.log('Conflict check recorded for matter:', matterId);
    } catch (error) {
      console.error('Failed to record conflict check:', error);
      // Don't throw - this is just logging
    }
  }
}
