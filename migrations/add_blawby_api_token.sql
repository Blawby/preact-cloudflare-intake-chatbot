-- Migration: Add Blawby API token configuration to blawby-ai team
-- This migration updates the existing blawby-ai team to include the API token and team ULID

-- Update the blawby-ai team configuration to include the Blawby API settings
UPDATE teams 
SET config = json_set(
  config,
  '$.blawbyApi',
  json_object(
    'enabled', true,
    'apiKey', 'B3aCXQkQiXy81PJ8jhTtnzP2Dn4j0LcK2PG1U3RGa81e67e2',
    'teamUlid', '01jq70jnstyfzevc6423czh50e'
  )
)
WHERE slug = 'blawby-ai';

-- Verify the update was successful
SELECT 
  id,
  slug,
  name,
  json_extract(config, '$.blawbyApi.enabled') as api_enabled,
  json_extract(config, '$.blawbyApi.teamUlid') as team_ulid,
  json_extract(config, '$.blawbyApi.apiKey') as api_key
FROM teams 
WHERE slug = 'blawby-ai';
