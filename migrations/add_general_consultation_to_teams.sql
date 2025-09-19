-- Add General Consultation to all existing teams
-- This ensures all teams can handle general legal requests

UPDATE teams 
SET config = json_patch(
  config, 
  json_object(
    'availableServices', 
    json_insert(
      COALESCE(json_extract(config, '$.availableServices'), '[]'),
      '$[0]', 
      'General Consultation'
    )
  )
)
WHERE json_extract(config, '$.availableServices') IS NOT NULL
  AND json_extract(config, '$.availableServices') != '[]'
  AND NOT EXISTS (
    SELECT 1 
    FROM json_each(json_extract(config, '$.availableServices')) 
    WHERE value = 'General Consultation'
  );

-- For teams with no availableServices or empty array, set default services
UPDATE teams 
SET config = json_patch(
  config,
  json_object(
    'availableServices',
    json_array(
      'General Consultation',
      'Family Law',
      'Employment Law',
      'Business Law',
      'Personal Injury',
      'Criminal Law',
      'Civil Law'
    )
  )
)
WHERE json_extract(config, '$.availableServices') IS NULL 
   OR json_extract(config, '$.availableServices') = '[]'
   OR json_array_length(COALESCE(json_extract(config, '$.availableServices'), '[]')) = 0;
