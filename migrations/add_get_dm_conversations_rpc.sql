-- Single-query RPC for DM conversations (avoids N+1)
CREATE OR REPLACE FUNCTION public.get_dm_conversations()
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_participations AS (
    SELECT cp.conversation_id, cp.last_read_at, cp.joined_at
    FROM conversation_participants cp
    WHERE cp.user_id = current_user_id
  ),
  other_participant AS (
    SELECT cp.conversation_id, cp.user_id as other_user_id,
           COALESCE(p.full_name, p.public_name, p.email) as other_display_name,
           p.avatar_url as other_avatar_url
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.user_id != current_user_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_message_content,
      m.created_at as last_message_created_at
    FROM messages m
    JOIN my_participations mp ON mp.conversation_id = m.conversation_id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::bigint as cnt
    FROM messages m
    JOIN my_participations mp ON mp.conversation_id = m.conversation_id
    WHERE m.sender_id != current_user_id
      AND m.created_at > COALESCE(mp.last_read_at, mp.joined_at)
    GROUP BY m.conversation_id
  )
  SELECT
    c.id,
    c.name,
    c.type,
    c.created_by,
    c.created_at,
    c.updated_at,
    op.other_user_id,
    op.other_display_name::text,
    op.other_avatar_url,
    lm.last_message_content,
    lm.last_message_created_at,
    COALESCE(u.cnt, 0)
  FROM conversations c
  JOIN my_participations mp ON mp.conversation_id = c.id
  JOIN other_participant op ON op.conversation_id = c.id
  LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
  LEFT JOIN unread u ON u.conversation_id = c.id
  WHERE c.type = 'dm'
  ORDER BY lm.last_message_created_at DESC NULLS LAST, c.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_conversations() TO authenticated;
