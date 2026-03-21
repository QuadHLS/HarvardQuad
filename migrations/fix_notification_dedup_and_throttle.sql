-- 1. Fix notify_on_heart: prevent duplicate like notifications on re-like.
--    Skip if an unread 'like' notification already exists for this actor+target.

CREATE OR REPLACE FUNCTION notify_on_heart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_target_type text;
  v_target_id uuid;
  v_post_id uuid;
  v_snippet text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO v_recipient_id FROM feed_posts WHERE id = NEW.post_id;
    v_target_type := 'post';
    v_target_id := NEW.post_id;
    SELECT LEFT(title, 80) INTO v_snippet FROM feed_posts WHERE id = NEW.post_id;
  ELSIF NEW.reply_id IS NOT NULL THEN
    SELECT author_id, post_id INTO v_recipient_id, v_post_id FROM feed_replies WHERE id = NEW.reply_id;
    v_target_type := 'reply';
    v_target_id := NEW.reply_id;
    SELECT LEFT(content, 80) INTO v_snippet FROM feed_replies WHERE id = NEW.reply_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.user_id THEN RETURN NEW; END IF;

  -- Skip if an existing like notification from this actor on this target is still unread
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_recipient_id
      AND type = 'like'
      AND actor_id = NEW.user_id
      AND target_id = v_target_id
      AND read_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (v_recipient_id, 'like', NEW.user_id, v_target_type, v_target_id,
    jsonb_build_object('snippet', COALESCE(v_snippet, ''), 'post_id', COALESCE(v_post_id, v_target_id)));
  RETURN NEW;
END;
$$;

-- 2. Fix invite_squad_member: prevent duplicate invite notifications on re-invite.
--    Delete any existing squad_invite notification for this invitee+squad before inserting a new one.

CREATE OR REPLACE FUNCTION public.invite_squad_member(squad_id_param uuid, invitee_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_type_val text;
  squad_name_val text;
  invite_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF invitee_id_param = current_user_id THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;

  SELECT s.type, s.name INTO squad_type_val, squad_name_val
  FROM squads s WHERE s.id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val NOT IN ('open', 'restricted', 'private') THEN RAISE EXCEPTION 'Invalid squad type'; END IF;

  IF squad_type_val = 'open' THEN
    IF NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
      RAISE EXCEPTION 'Only squad members can invite';
    END IF;
  ELSE
    IF NOT public.is_squad_admin(squad_id_param, current_user_id) THEN
      RAISE EXCEPTION 'Only squad admins can invite to restricted or private squads';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = invitee_id_param) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;

  INSERT INTO squad_invites (squad_id, inviter_id, invitee_id, status)
  VALUES (squad_id_param, current_user_id, invitee_id_param, 'pending')
  ON CONFLICT (squad_id, invitee_id) DO UPDATE SET inviter_id = current_user_id, status = 'pending', created_at = now()
  RETURNING id INTO invite_id;

  -- Remove stale squad_invite notifications for this invitee+squad before creating new one
  DELETE FROM notifications
  WHERE user_id = invitee_id_param
    AND type = 'squad_invite'
    AND metadata->>'squad_id' = squad_id_param::text;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (invitee_id_param, 'squad_invite', current_user_id, 'squad_invite', invite_id,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, '')));

  RETURN invite_id;
END;
$$;

-- 3. Add feed_hearts to realtime publication

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'feed_hearts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_hearts;
  END IF;
END;
$$;

-- 4. Fix notify_on_message: throttle group message notifications.
--    For group chats, skip notification if we already notified this user for this
--    conversation within the last 5 minutes (still fires immediately for DMs).

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
  LOOP
    -- For group chats, throttle: skip if a notification was sent in the last 5 minutes
    IF v_conv_type != 'dm' THEN
      IF EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_rec.user_id
          AND type = 'group_message'
          AND target_id = NEW.conversation_id
          AND created_at > now() - interval '5 minutes'
      ) THEN
        CONTINUE;
      END IF;
    END IF;

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
