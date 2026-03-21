-- Hide chat: remove from list but stay as participant. New messages bring it back.

-- 1. Add hidden_at to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- 2. RPC: hide conversation for current user (sets hidden_at)
CREATE OR REPLACE FUNCTION public.hide_conversation(conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  UPDATE conversation_participants
  SET hidden_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.hide_conversation(uuid) TO authenticated;

-- 3. Trigger: when a message is inserted, unhide for all recipients (so they see the chat again)
CREATE OR REPLACE FUNCTION public.unhide_conversation_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET hidden_at = NULL
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS unhide_on_new_message ON public.messages;
CREATE TRIGGER unhide_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.unhide_conversation_on_new_message();

-- 4. Update get_dm_conversations: exclude hidden unless new message since hidden_at
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
    SELECT cp.conversation_id, cp.last_read_at, cp.joined_at, cp.hidden_at
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

-- 5. Update get_all_conversations: same hidden filter
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
    SELECT cp.conversation_id, cp.last_read_at, cp.joined_at, cp.hidden_at
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
      COALESCE(u.cnt, 0)::bigint as unread_count
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
      NULL::text as other_avatar_url,
      lm.last_message_content,
      lm.last_message_created_at,
      COALESCE(u.cnt, 0)::bigint as unread_count
    FROM conversations c
    JOIN my_participations mp ON mp.conversation_id = c.id
    LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
    LEFT JOIN unread u ON u.conversation_id = c.id
    WHERE c.type = 'group'
  )
  SELECT * FROM (
    SELECT * FROM dm_rows
    UNION ALL
    SELECT * FROM group_rows
  ) combined
  ORDER BY last_message_created_at DESC NULLS LAST, updated_at DESC;
END;
$$;
