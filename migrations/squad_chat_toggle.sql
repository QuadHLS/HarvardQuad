-- Squad group chat toggle: chat_enabled column, updated create_squad, enable_squad_chat RPC,
-- name/avatar sync trigger, hide squad chats from messages page

-- ── 1. Add chat_enabled column ──
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT false;

-- Backfill: squads that already have a conversation_id are chat-enabled
UPDATE public.squads SET chat_enabled = true WHERE conversation_id IS NOT NULL;

-- ── 2. Update create_squad to accept chat_enabled parameter ──
CREATE OR REPLACE FUNCTION public.create_squad(
  squad_name text,
  squad_info text,
  squad_category text,
  meeting_times text,
  squad_location text,
  privacy_type text DEFAULT 'open',
  enable_chat boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_id uuid;
  conv_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF squad_name IS NULL OR trim(squad_name) = '' THEN RAISE EXCEPTION 'Squad name cannot be empty'; END IF;
  IF squad_category IS NULL OR trim(squad_category) = '' THEN RAISE EXCEPTION 'Squad category cannot be empty'; END IF;
  IF squad_category NOT IN ('sports', 'social', 'academic', 'hobbies', 'creative', 'business', 'wellness') THEN
    RAISE EXCEPTION 'Invalid squad category';
  END IF;
  IF privacy_type NOT IN ('open', 'private') THEN RAISE EXCEPTION 'Privacy type must be open or private'; END IF;

  -- Only create group chat if chat is enabled
  IF enable_chat THEN
    INSERT INTO conversations (name, type, created_by)
    VALUES (trim(squad_name), 'group', current_user_id)
    RETURNING id INTO conv_id;

    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (conv_id, current_user_id, 'admin');
  END IF;

  INSERT INTO squads (name, info, category, meeting_times, location, type, created_by, conversation_id, chat_enabled)
  VALUES (trim(squad_name), squad_info, trim(squad_category), meeting_times, squad_location, privacy_type, current_user_id, conv_id, enable_chat)
  RETURNING id INTO squad_id;

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id, current_user_id, 'admin');

  RETURN squad_id;
END;
$$;

-- ── 3. Enable squad chat RPC: creates group chat and adds all existing members ──
CREATE OR REPLACE FUNCTION public.enable_squad_chat(squad_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_rec record;
  conv_id uuid;
  mem record;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT id, name, conversation_id, chat_enabled, avatar_url
  INTO squad_rec
  FROM squads
  WHERE id = squad_id_param;

  IF squad_rec IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only squad admins can enable chat';
  END IF;

  -- If already has a conversation, just enable the flag
  IF squad_rec.conversation_id IS NOT NULL THEN
    UPDATE squads SET chat_enabled = true WHERE id = squad_id_param;
    RETURN squad_rec.conversation_id;
  END IF;

  -- Create new group chat
  INSERT INTO conversations (name, type, created_by, avatar_url)
  VALUES (squad_rec.name, 'group', current_user_id, squad_rec.avatar_url)
  RETURNING id INTO conv_id;

  -- Add all current squad members to the chat
  FOR mem IN
    SELECT sm.user_id, sm.role FROM squad_members sm WHERE sm.squad_id = squad_id_param
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (conv_id, mem.user_id, mem.role)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  -- Link conversation to squad and enable
  UPDATE squads SET conversation_id = conv_id, chat_enabled = true WHERE id = squad_id_param;

  RETURN conv_id;
END;
$$;

-- ── 4. Trigger to sync squad name & avatar to conversation ──
CREATE OR REPLACE FUNCTION public.sync_squad_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    -- Sync name if changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      UPDATE conversations SET name = NEW.name WHERE id = NEW.conversation_id;
    END IF;
    -- Sync avatar if changed
    IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
      UPDATE conversations SET avatar_url = NEW.avatar_url WHERE id = NEW.conversation_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_squad_to_conversation ON public.squads;
CREATE TRIGGER trigger_sync_squad_to_conversation
  AFTER UPDATE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_squad_to_conversation();

-- ── 5. Update get_all_conversations to exclude squad group chats ──
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
    SELECT cp.conversation_id, cp.last_read_at, cp.joined_at
    FROM conversation_participants cp
    WHERE cp.user_id = current_user_id
  ),
  squad_conv_ids AS (
    SELECT s.conversation_id FROM squads s WHERE s.conversation_id IS NOT NULL
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
      c.avatar_url::text as other_avatar_url,
      lm.last_message_content,
      lm.last_message_created_at,
      COALESCE(u.cnt, 0)::bigint as unread_count
    FROM conversations c
    JOIN my_participations mp ON mp.conversation_id = c.id
    LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
    LEFT JOIN unread u ON u.conversation_id = c.id
    WHERE c.type = 'group'
      AND c.id NOT IN (SELECT conversation_id FROM squad_conv_ids)
  )
  SELECT * FROM (
    SELECT * FROM dm_rows
    UNION ALL
    SELECT * FROM group_rows
  ) all_convs
  ORDER BY COALESCE(all_convs.last_message_created_at, all_convs.created_at) DESC;
END;
$$;

-- ── 6. Grants ──
GRANT EXECUTE ON FUNCTION public.create_squad(text, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_squad_chat(uuid) TO authenticated;
