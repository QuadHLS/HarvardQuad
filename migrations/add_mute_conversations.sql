-- Mute notifications: per-conversation mute for DMs and group chats.
-- muted_at: when set, user receives no notifications for that conversation.

-- 1. Add muted_at to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS muted_at timestamptz;

-- 2. RPC: toggle mute (sets muted_at = now() if unmuted, NULL if muted)
CREATE OR REPLACE FUNCTION public.toggle_mute_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  currently_muted boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT (muted_at IS NOT NULL) INTO currently_muted
  FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id = auth.uid();

  IF currently_muted THEN
    UPDATE conversation_participants
    SET muted_at = NULL
    WHERE conversation_id = conv_id AND user_id = auth.uid();
    RETURN false;
  ELSE
    UPDATE conversation_participants
    SET muted_at = now()
    WHERE conversation_id = conv_id AND user_id = auth.uid();
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_mute_conversation(uuid) TO authenticated;

-- 3. Update notify_on_message: skip recipients who have muted
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_type text;
  v_snippet text;
  v_rec RECORD;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  SELECT type INTO v_conv_type FROM conversations WHERE id = NEW.conversation_id;
  v_snippet := LEFT(COALESCE(NEW.content, ''), 100);

  FOR v_rec IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
      AND cp.muted_at IS NULL
  LOOP
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
    VALUES (
      v_rec.user_id,
      CASE WHEN v_conv_type = 'dm' THEN 'dm' ELSE 'group_message' END,
      NEW.sender_id,
      'conversation',
      NEW.conversation_id,
      jsonb_build_object('message_id', NEW.id, 'snippet', v_snippet)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- 4. Update get_all_conversations: add muted_at to return
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
  squad_id uuid,
  muted_at timestamptz
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
    SELECT cp.conversation_id, cp.last_read_at, cp.joined_at, cp.hidden_at, cp.muted_at
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
      NULL::uuid as squad_id,
      mp.muted_at
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
      sci.squad_id,
      mp.muted_at
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
