PRAGMA foreign_keys = ON;

-- Add default voice configuration to existing teams if missing
UPDATE teams
SET config = json_patch(
  COALESCE(config, json('{}')),
  json('{"voice":{"enabled":false,"provider":"cloudflare","voiceId":null,"displayName":null,"previewUrl":null}}')
)
WHERE json_type(json_extract(COALESCE(config, json('{}')), '$.voice')) IS NULL;
