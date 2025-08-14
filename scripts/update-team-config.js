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
const API_TOKEN = process.env.API_TOKEN;

/**
 * Validates the team configuration object structure
 * @param {object} config - The team configuration object to validate
 * @returns {string[]} Array of validation error messages, empty if valid
 */
function validateTeamConfig(config) {
  const errors = [];

  // Check if config is an object
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    errors.push('Configuration must be a non-null object');
    return errors;
  }

  // Required string fields
  const requiredStrings = ['name', 'slug', 'description'];
  requiredStrings.forEach(field => {
    if (!config[field] || typeof config[field] !== 'string') {
      errors.push(`Missing or invalid required string field: ${field}`);
    }
  });

  // Required array fields
  const requiredArrays = ['availableServices'];
  requiredArrays.forEach(field => {
    if (!Array.isArray(config[field]) || config[field].length === 0) {
      errors.push(`Missing or invalid required array field: ${field}`);
    } else {
      // Check array elements are strings
      const invalidElements = config[field].filter(item => typeof item !== 'string');
      if (invalidElements.length > 0) {
        errors.push(`Array ${field} must contain only strings`);
      }
    }
  });

  // Check features object if present
  if (config.features) {
    if (typeof config.features !== 'object' || Array.isArray(config.features)) {
      errors.push('features must be an object');
    } else {
      // Validate boolean feature flags
      const booleanFlags = ['enableParalegalAgent', 'paralegalFirst'];
      booleanFlags.forEach(flag => {
        if (flag in config.features && typeof config.features[flag] !== 'boolean') {
          errors.push(`Feature flag ${flag} must be a boolean`);
        }
      });
    }
  }

  // Check payment configuration if present
  if ('requiresPayment' in config) {
    if (typeof config.requiresPayment !== 'boolean') {
      errors.push('requiresPayment must be a boolean');
    }
    if (config.requiresPayment && (!config.consultationFee || typeof config.consultationFee !== 'number')) {
      errors.push('consultationFee must be a number when requiresPayment is true');
    }
  }

  return errors;
}

async function updateTeamConfig(teamId, configPath) {
  try {
    // Read the configuration file
    const configFile = path.resolve(configPath);
    if (!fs.existsSync(configFile)) {
      console.error(`❌ Config file not found: ${configFile}`);
      process.exit(1);
    }

    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    // Validate config structure
    const validationErrors = validateTeamConfig(configData);
    if (validationErrors.length > 0) {
      console.error('❌ Invalid team configuration:');
      validationErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log(`🔄 Updating team configuration for: ${teamId}`);
    console.log(`📁 Config file: ${configFile}`);

    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` }),
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
  console.log('  # Using example templates:');
  console.log('  node scripts/update-team-config.js NEW_TEAM_ID reference/examples/teams/basic-legal-service.json');
  console.log('  node scripts/update-team-config.js NEW_TEAM_ID reference/examples/teams/regional-legal-service.json');
  console.log('');
  console.log('Note: Example configurations can be found in reference/examples/teams/');
  process.exit(1);
}

const [teamId, configFile] = args;

// Run the update
updateTeamConfig(teamId, configFile);
