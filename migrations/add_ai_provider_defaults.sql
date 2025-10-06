-- Add explicit AI provider/model metadata to existing team configs
UPDATE teams
SET config = json_set(
        json_set(
            json_set(
                config,
                '$.aiProvider',
                COALESCE(json_extract(config, '$.aiProvider'), 'legacy-llama')
            ),
            '$.aiModel',
            COALESCE(json_extract(config, '$.aiModel'), '@cf/meta/llama-3.1-8b-instruct')
        ),
        '$.aiModelFallback',
        CASE
            WHEN json_type(config, '$.aiModelFallback') = 'array' THEN json_extract(config, '$.aiModelFallback')
            WHEN COALESCE(json_extract(config, '$.aiModel'), '@cf/meta/llama-3.1-8b-instruct') = '@cf/meta/llama-3.1-8b-instruct' THEN json('[]')
            ELSE json('["@cf/meta/llama-3.1-8b-instruct"]')
        END
    )
WHERE json_type(config, '$.aiProvider') IS NULL
   OR json_type(config, '$.aiModel') IS NULL
   OR json_type(config, '$.aiModelFallback') IS NULL;
