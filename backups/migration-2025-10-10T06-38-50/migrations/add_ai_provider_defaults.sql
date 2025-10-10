-- Add explicit AI provider/model metadata to existing team configs
UPDATE teams
SET config = json_set(
        json_set(
            json_set(
                config,
                '$.aiProvider',
                COALESCE(json_extract(config, '$.aiProvider'), 'workers-ai')
            ),
            '$.aiModel',
            COALESCE(json_extract(config, '$.aiModel'), '@cf/openai/gpt-oss-20b')
        ),
        '$.aiModelFallback',
        CASE
            WHEN json_type(config, '$.aiModelFallback') = 'array' THEN json_extract(config, '$.aiModelFallback')
            WHEN COALESCE(json_extract(config, '$.aiModel'), '@cf/openai/gpt-oss-20b') = '@cf/openai/gpt-oss-20b' THEN json('[]')
            ELSE json('["@cf/openai/gpt-oss-20b"]')
        END
    )
WHERE json_type(config, '$.aiProvider') IS NULL
   OR json_type(config, '$.aiModel') IS NULL
   OR json_type(config, '$.aiModelFallback') IS NULL;
