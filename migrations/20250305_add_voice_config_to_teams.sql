PRAGMA foreign_keys = ON;

-- Add default voice configuration to existing teams if missing
UPDATE teams
SET config = json_patch(
  config,
  json('{"voice":{"enabled":false,"provider":"cloudflare","voiceId":null,"displayName":null,"previewUrl":null}}')
)
WHERE json_type(json_extract(config, '$.voice')) IS NULL;
