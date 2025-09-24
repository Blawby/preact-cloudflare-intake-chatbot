-- Add jurisdiction configuration to North Carolina Legal Services
-- This enables location-based validation for the team

UPDATE teams 
SET config = json_patch(config, json('{
  "jurisdiction": {
    "type": "state",
    "description": "North Carolina",
    "supportedStates": ["NC"],
    "supportedCountries": ["US"],
    "allowOutOfJurisdiction": true,
    "requireLocation": true,
    "outOfJurisdictionMessage": "We primarily serve clients in North Carolina. While we can provide general guidance, we recommend consulting with a local attorney in your state for state-specific legal matters. Would you like me to help you find local legal resources?"
  }
}'))
WHERE slug = 'north-carolina-legal-services';
