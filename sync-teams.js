// Usage: node sync-teams.js [--remote]
// This script will now DELETE any teams in the D1 database that are not present in teams.json (DRY sync)
// Requires: wrangler installed and configured, teams.json in project root

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEAMS_FILE = path.join(__dirname, 'teams.json');
const DB_NAME = 'blawby-ai-chatbot';

// Check if --remote flag is provided
const isRemote = process.argv.includes('--remote');
const wranglerFlag = isRemote ? '--remote' : '--local';

if (!fs.existsSync(TEAMS_FILE)) {
  console.error('teams.json not found!');
  process.exit(1);
}

const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));

// Validate teams configuration
function validateTeamConfig(team) {
  const errors = [];

  // Required top-level fields
  if (!team.id || typeof team.id !== 'string') {
    errors.push('Team ID is required and must be a string');
  }

  if (!team.slug || typeof team.slug !== 'string') {
    errors.push('Team slug is required and must be a string');
  }

  if (!team.name || typeof team.name !== 'string') {
    errors.push('Team name is required and must be a string');
  }

  if (!team.config || typeof team.config !== 'object') {
    errors.push('Team config is required and must be an object');
    return errors;
  }

  const config = team.config;

  // Validate required config fields
  if (!config.aiModel || typeof config.aiModel !== 'string') {
    errors.push('AI model is required and must be a string');
  }

  if (typeof config.requiresPayment !== 'boolean') {
    errors.push('requiresPayment must be a boolean');
  }

  if (config.consultationFee !== undefined && typeof config.consultationFee !== 'number') {
    errors.push('consultationFee must be a number if provided');
  }

  if (config.consultationFee !== undefined && config.consultationFee < 0) {
    errors.push('consultationFee cannot be negative');
  }

  // Validate jurisdiction if present
  if (config.jurisdiction) {
    if (!config.jurisdiction.type || !['national', 'state'].includes(config.jurisdiction.type)) {
      errors.push('jurisdiction.type must be "national" or "state"');
    }

    if (!config.jurisdiction.description || typeof config.jurisdiction.description !== 'string') {
      errors.push('jurisdiction.description is required');
    }

    if (!Array.isArray(config.jurisdiction.supportedStates)) {
      errors.push('jurisdiction.supportedStates must be an array');
    }

    if (!Array.isArray(config.jurisdiction.supportedCountries)) {
      errors.push('jurisdiction.supportedCountries must be an array');
    }
  }

  // Validate webhooks if present
  if (config.webhooks) {
    if (typeof config.webhooks.enabled !== 'boolean') {
      errors.push('webhooks.enabled must be a boolean');
    }

    if (config.webhooks.enabled) {
      if (!config.webhooks.url || typeof config.webhooks.url !== 'string') {
        errors.push('webhooks.url is required when webhooks are enabled');
      }

      if (!config.webhooks.secret || typeof config.webhooks.secret !== 'string') {
        errors.push('webhooks.secret is required when webhooks are enabled');
      }
    }
  }

  // Validate blawbyApi if present
  if (config.blawbyApi) {
    if (typeof config.blawbyApi.enabled !== 'boolean') {
      errors.push('blawbyApi.enabled must be a boolean');
    }

    if (config.blawbyApi.enabled) {
      if (!config.blawbyApi.teamUlid || typeof config.blawbyApi.teamUlid !== 'string') {
        errors.push('blawbyApi.teamUlid is required when Blawby API is enabled');
      }

      // Validate ULID format
      if (config.blawbyApi.teamUlid && !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(config.blawbyApi.teamUlid)) {
        errors.push('blawbyApi.teamUlid must be a valid ULID format');
      }
    }
  }

  return errors;
}

// Validate all teams
const validationErrors = [];
teams.forEach((team, index) => {
  const errors = validateTeamConfig(team);
  if (errors.length > 0) {
    validationErrors.push(`Team ${index + 1} (${team.id || 'unknown'}): ${errors.join(', ')}`);
  }
});

if (validationErrors.length > 0) {
  console.error('❌ Team configuration validation failed:');
  validationErrors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✅ Team configuration validation passed');

// Fetch all existing team IDs from D1
function getExistingTeamIds() {
  try {
    const result = execSync(`wrangler d1 execute ${DB_NAME} ${wranglerFlag} --json --command "SELECT id FROM teams;"`, { encoding: 'utf-8' });
    const data = JSON.parse(result);
    // The output is an array with one object containing results
    if (data[0] && data[0].results && Array.isArray(data[0].results)) {
      return data[0].results.map(row => row.id).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch existing team IDs:', err.message);
    return [];
  }
}

const existingIds = getExistingTeamIds();
const jsonIds = teams.map(t => t.id);
const idsToDelete = existingIds.filter(id => !jsonIds.includes(id));

console.log('Existing IDs in D1:', existingIds);
console.log('IDs in teams.json:', jsonIds);
console.log('IDs to delete:', idsToDelete);

if (idsToDelete.length > 0) {
  let deleteSql = '';
  // First delete related records to avoid foreign key constraints
  idsToDelete.forEach(id => {
    deleteSql += `DELETE FROM webhook_logs WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM ai_feedback WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM appointments WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM matters WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM lawyers WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM files WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM chat_logs WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM matter_questions WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM contact_forms WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM services WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
    deleteSql += `DELETE FROM conversations WHERE team_id = '${id.replace(/'/g, "''")}';\n`;
  });
  // Then delete the teams
  idsToDelete.forEach(id => {
    deleteSql += `DELETE FROM teams WHERE id = '${id.replace(/'/g, "''")}';\n`;
  });
  console.log('Generated delete SQL:\n', deleteSql);
  // Write delete SQL to a temp file
  const tmpDeleteFile = path.join(os.tmpdir(), `delete-teams-${Date.now()}.sql`);
  fs.writeFileSync(tmpDeleteFile, deleteSql, 'utf-8');
  try {
    execSync(`wrangler d1 execute ${DB_NAME} ${wranglerFlag} --file "${tmpDeleteFile}"`, { stdio: 'inherit' });
    console.log(`🗑️ Deleted teams: ${idsToDelete.join(', ')}`);
  } catch (err) {
    console.error('Failed to delete old teams:', err.message);
  }
  fs.unlinkSync(tmpDeleteFile);
}

// Build SQL for all teams
let sql = '';
teams.forEach(team => {
  const configJson = JSON.stringify(team.config)
    .replace(/\\/g, '\\\\')   // escape backslashes
    .replace(/'/g, "''")          // escape single quotes for SQL
    .replace(/\n/g, '\\n');      // escape newlines
  const slug = team.slug || team.id; // Use slug if available, fallback to id
  sql += `INSERT INTO teams (id, slug, name, config) VALUES ('${team.id.replace(/'/g, "''")}', '${slug.replace(/'/g, "''")}', '${team.name.replace(/'/g, "''")}', '${configJson}')\nON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, config=excluded.config;\n`;
});

// Write SQL to a temp file
const tmpFile = path.join(os.tmpdir(), `sync-teams-${Date.now()}.sql`);
fs.writeFileSync(tmpFile, sql, 'utf-8');

try {
  execSync(`wrangler d1 execute ${DB_NAME} ${wranglerFlag} --file "${tmpFile}"`, { stdio: 'inherit' });
  console.log('✅ Team sync complete!');
} catch (err) {
  console.error('Failed to sync teams:', err.message);
}

// Clean up temp file
fs.unlinkSync(tmpFile); 