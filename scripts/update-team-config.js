#!/usr/bin/env node

/**
 * Team Configuration Management Script
 * 
 * This script updates team configurations via the API instead of relying on manual database syncs.
 * Usage: node scripts/update-team-config.js <team-id> <config-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

async function updateTeamConfig(teamId, configPath) {
  try {
    // Read the configuration file
    const configFile = path.resolve(configPath);
    if (!fs.existsSync(configFile)) {
      console.error(`❌ Config file not found: ${configFile}`);
      process.exit(1);
    }

    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    console.log(`🔄 Updating team configuration for: ${teamId}`);
    console.log(`📁 Config file: ${configFile}`);

    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to update team: ${response.status} - ${error}`);
      process.exit(1);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Team configuration updated successfully!');
      console.log(`📋 Team: ${result.data.name}`);
      console.log(`🔗 Slug: ${result.data.slug}`);
      console.log(`💰 Payment: ${result.data.config.requiresPayment ? 'Enabled' : 'Disabled'}`);
      console.log(`💵 Fee: $${result.data.config.consultationFee || 0}`);
      console.log(`🎯 Paralegal: ${result.data.config.features?.enableParalegalAgent ? 'Enabled' : 'Disabled'}`);
    } else {
      console.error(`❌ Update failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error updating team configuration:', error.message);
    process.exit(1);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node scripts/update-team-config.js <team-id> <config-file>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/update-team-config.js 01jq70jnstyfzevc6423czh50e configs/north-carolina.json');
  console.log('  node scripts/update-team-config.js north-carolina-legal-services configs/north-carolina.json');
  process.exit(1);
}

const [teamId, configFile] = args;

// Run the update
updateTeamConfig(teamId, configFile);
