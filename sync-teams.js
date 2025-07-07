// Usage: node sync-teams.js
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

if (!fs.existsSync(TEAMS_FILE)) {
  console.error('teams.json not found!');
  process.exit(1);
}

const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));

// Build SQL for all teams
let sql = '';
teams.forEach(team => {
  const configJson = JSON.stringify(team.config).replace(/'/g, "''");
  sql += `INSERT INTO teams (id, name, config) VALUES ('${team.id.replace(/'/g, "''")}', '${team.name.replace(/'/g, "''")}', '${configJson}')\nON CONFLICT(id) DO UPDATE SET name=excluded.name, config=excluded.config;\n`;
});

// Write SQL to a temp file
const tmpFile = path.join(os.tmpdir(), `sync-teams-${Date.now()}.sql`);
fs.writeFileSync(tmpFile, sql, 'utf-8');

try {
  execSync(`wrangler d1 execute ${DB_NAME} --remote --file "${tmpFile}"`, { stdio: 'inherit' });
  console.log('✅ Team sync complete!');
} catch (err) {
  console.error('Failed to sync teams:', err.message);
}

// Clean up temp file
fs.unlinkSync(tmpFile); 