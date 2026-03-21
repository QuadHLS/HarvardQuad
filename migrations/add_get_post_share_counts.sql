-- Returns share count per post from messages.shared_post_data->>'post_id'.
-- SECURITY DEFINER allows counting across all conversations (share count is public).
CREATE OR REPLACE FUNCTION get_post_share_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, share_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (shared_post_data->>'post_id')::uuid AS post_id,
    count(*)::bigint AS share_count
  FROM messages
  WHERE message_type = 'shared_post'
    AND shared_post_data IS NOT NULL
    AND shared_post_data->>'post_id' IS NOT NULL
    AND (shared_post_data->>'post_id')::uuid = ANY(post_ids)
  GROUP BY (shared_post_data->>'post_id')::uuid;
$$;

COMMENT ON FUNCTION get_post_share_counts(uuid[]) IS 'Returns share count for each post_id from shared_post messages. Used for feed display.';

CREATE INDEX IF NOT EXISTS messages_shared_post_post_id_idx
  ON messages ((shared_post_data->>'post_id'))
  WHERE message_type = 'shared_post' AND shared_post_data IS NOT NULL;
