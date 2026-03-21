-- Optional: composite index for reverse block lookups (blocked_id, blocker_id).
-- Helps NOT EXISTS / is_user_blocked patterns that check both directions.
CREATE INDEX IF NOT EXISTS user_blocks_blocked_blocker_idx
  ON user_blocks (blocked_id, blocker_id);
