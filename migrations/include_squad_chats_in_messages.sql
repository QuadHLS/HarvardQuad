-- Include squad chats in messages list; add squad_id so UI can treat them like squad-page chat (no settings, squad layout).
-- Must DROP first because return type changed (added squad_id).

DROP FUNCTION IF EXISTS public.get_all_conversations();

CREATE OR REPLACE FUNCTION public.get_all_conversations()
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
  unread_count bigint,
  squad_id uuid
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
      AND (cp.hidden_at IS NULL
           OR EXISTS (
             SELECT 1 FROM messages m
             WHERE m.conversation_id = cp.conversation_id
               AND m.sender_id != current_user_id
               AND m.created_at > cp.hidden_at
           ))
  ),
  squad_conv_ids AS (
    SELECT s.id as squad_id, s.conversation_id
    FROM squads s
    WHERE s.conversation_id IS NOT NULL AND s.chat_enabled = true
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
  ),
  dm_rows AS (
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
      COALESCE(u.cnt, 0)::bigint as unread_count,
      NULL::uuid as squad_id
    FROM conversations c
    JOIN my_participations mp ON mp.conversation_id = c.id
    JOIN (
      SELECT cp.conversation_id, cp.user_id as other_user_id,
             COALESCE(p.full_name, p.public_name, p.email) as other_display_name,
             p.avatar_url as other_avatar_url
      FROM conversation_participants cp
      JOIN profiles p ON p.id = cp.user_id
      WHERE cp.user_id != current_user_id
    ) op ON op.conversation_id = c.id
    LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
    LEFT JOIN unread u ON u.conversation_id = c.id
    WHERE c.type = 'dm'
      AND (SELECT COUNT(*) FROM conversation_participants cp2 WHERE cp2.conversation_id = c.id) = 2
  ),
  group_rows AS (
    SELECT
      c.id,
      c.name,
      c.type,
      c.created_by,
      c.created_at,
      c.updated_at,
      NULL::uuid as other_user_id,
      COALESCE(c.name, 'Group')::text as other_display_name,
      c.avatar_url::text as other_avatar_url,
      lm.last_message_content,
      lm.last_message_created_at,
      COALESCE(u.cnt, 0)::bigint as unread_count,
      sci.squad_id
    FROM conversations c
    JOIN my_participations mp ON mp.conversation_id = c.id
    LEFT JOIN squad_conv_ids sci ON sci.conversation_id = c.id
    LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
    LEFT JOIN unread u ON u.conversation_id = c.id
    WHERE c.type = 'group'
  )
  SELECT * FROM (
    SELECT * FROM dm_rows
    UNION ALL
    SELECT * FROM group_rows
  ) all_convs
  ORDER BY COALESCE(all_convs.last_message_created_at, all_convs.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_conversations() TO authenticated;
