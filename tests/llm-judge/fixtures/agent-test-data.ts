// Test team configuration data for LLM Judge tests

export interface TestTeamConfig {
  id: string;
  slug: string;
  name: string;
  config: string; // JSON string
  created_at: string;
  updated_at: string;
}

export function getTestTeamConfigForDB(teamId: string): TestTeamConfig {
  const baseConfig = {
    aiModel: 'llama',
    consultationFee: 0,
    requiresPayment: false,
    ownerEmail: 'test@example.com',
    availableServices: [
      'General Consultation', // Always first to ensure it's available
      'Family Law',
      'Employment Law',
      'Business Law',
      'Personal Injury',
      'Criminal Law',
      'Civil Law'
    ],
    jurisdiction: {
      type: 'national',
      description: 'Available nationwide',
      supportedStates: ['all'],
      supportedCountries: ['US']
    }
  };

  // Configure features based on team ID
  let features = {};
  
  if (teamId === 'blawby-ai') {
    // blawby-ai should use paralegal agent
    features = {
      enableParalegalAgent: true,
      paralegalFirst: true
    };
  } else if (teamId === 'north-carolina-legal-services' || teamId === 'test-team-1') {
    // North Carolina Legal Services should use intake agent
    features = {
      enableParalegalAgent: false,
      paralegalFirst: false
    };
  } else if (teamId === 'test-team-disabled') {
    // Disabled team for testing
    features = {
      enableParalegalAgent: false,
      paralegalFirst: false
    };
  } else {
    // Default test team - use intake agent
    features = {
      enableParalegalAgent: false,
      paralegalFirst: false
    };
  }

  const config = {
    ...baseConfig,
    features
  };

  const now = new Date().toISOString();
  
  return {
    id: teamId,
    slug: teamId,
    name: teamId === 'blawby-ai' ? 'Blawby AI' : 
          teamId === 'north-carolina-legal-services' ? 'North Carolina Legal Services' :
          `Test Team ${teamId}`,
    config: JSON.stringify(config),
    created_at: now,
    updated_at: now
  };
}
