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
      'Family Law',
      'Employment Law',
      'Business Law',
      'Personal Injury',
      'Criminal Law',
      'Civil Law',
      'General Consultation'
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
    // For LLM Judge tests, ensure intake agent is used (disable paralegal)
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
    // Default test team - also use intake agent
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
    name: teamId === 'blawby-ai' ? 'Blawby AI' : `Test Team ${teamId}`,
    config: JSON.stringify(config),
    created_at: now,
    updated_at: now
  };
}
