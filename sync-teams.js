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