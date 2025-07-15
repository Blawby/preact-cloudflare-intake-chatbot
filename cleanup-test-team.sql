-- Cleanup script for test-team data
-- This script deletes all data related to test-team in the correct order to avoid foreign key constraint violations

-- 1. Delete webhook logs for test-team
DELETE FROM webhook_logs WHERE team_id = 'test-team';

-- 2. Delete AI feedback for test-team
DELETE FROM ai_feedback WHERE team_id = 'test-team';

-- 3. Delete matter questions for test-team
DELETE FROM matter_questions WHERE team_id = 'test-team';

-- 4. Delete AI generated summaries for test-team
DELETE FROM ai_generated_summaries WHERE matter_id IN (
  SELECT id FROM matters WHERE team_id = 'test-team'
);

-- 5. Delete matter events for test-team
DELETE FROM matter_events WHERE matter_id IN (
  SELECT id FROM matters WHERE team_id = 'test-team'
);

-- 6. Delete files for test-team
DELETE FROM files WHERE team_id = 'test-team';

-- 7. Delete appointments for test-team
DELETE FROM appointments WHERE conversation_id IN (
  SELECT id FROM conversations WHERE team_id = 'test-team'
);

-- 8. Delete messages for test-team
DELETE FROM messages WHERE conversation_id IN (
  SELECT id FROM conversations WHERE team_id = 'test-team'
);

-- 9. Delete contact forms for test-team
DELETE FROM contact_forms WHERE team_id = 'test-team';

-- 10. Delete services for test-team
DELETE FROM services WHERE team_id = 'test-team';

-- 11. Delete lawyers for test-team
DELETE FROM lawyers WHERE team_id = 'test-team';

-- 12. Delete matters for test-team
DELETE FROM matters WHERE team_id = 'test-team';

-- 13. Delete conversations for test-team
DELETE FROM conversations WHERE team_id = 'test-team';

-- 14. Delete chat logs for test-team sessions
DELETE FROM chat_logs WHERE session_id IN (
  SELECT session_id FROM conversations WHERE team_id = 'test-team'
);

-- 15. Finally, delete the test-team itself
DELETE FROM teams WHERE id = 'test-team'; 