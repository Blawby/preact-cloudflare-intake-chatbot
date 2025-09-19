// Test team configuration data for Paralegal Agent tests

export interface TestTeamConfig {
  id: string;
  slug: string;
  name: string;
  config: string; // JSON string
  created_at: string;
  updated_at: string;
}

export function getParalegalTestTeamConfigForDB(teamId: string): TestTeamConfig {
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

  // Configure features for paralegal agent testing
  const features = {
    enableParalegalAgent: true,
    paralegalFirst: true // Enable paralegal-first mode for testing
  };

  const config = {
    ...baseConfig,
    features
  };

  const now = new Date().toISOString();
  
  return {
    id: teamId,
    slug: teamId,
    name: `Paralegal Test Team ${teamId}`,
    config: JSON.stringify(config),
    created_at: now,
    updated_at: now
  };
}
