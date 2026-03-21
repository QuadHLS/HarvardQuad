-- Blocking and notifications: prevent creating notifications between blocked users,
-- and delete existing notifications when blocking.

-- 1. BEFORE INSERT trigger: skip notification if actor and recipient have blocked each other.
--    Applies to ALL notification types (like, reply, mention, dm, group_message,
--    squad_invite, invite_accepted, invite_declined, join_request, join_request_approved,
--    join_request_denied, squad_join, friend_request, friend_accepted).
CREATE OR REPLACE FUNCTION public.notifications_block_filter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = NEW.user_id AND ub.blocked_id = NEW.actor_id)
       OR (ub.blocker_id = NEW.actor_id AND ub.blocked_id = NEW.user_id)
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notifications_block_filter ON public.notifications;
CREATE TRIGGER trigger_notifications_block_filter
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_block_filter();

-- 2. Update block_user: delete ALL notifications between the two users (not just friend types).
CREATE OR REPLACE FUNCTION public.block_user(blocked_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  dm_conv_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  IF blocked_id_param = current_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  DELETE FROM friends
  WHERE (user_id = current_user_id AND friend_id = blocked_id_param)
     OR (user_id = blocked_id_param AND friend_id = current_user_id);

  DELETE FROM friend_requests
  WHERE ((from_user_id = current_user_id AND to_user_id = blocked_id_param)
      OR (from_user_id = blocked_id_param AND to_user_id = current_user_id))
    AND status = 'pending';

  DELETE FROM notifications
  WHERE (user_id = current_user_id AND actor_id = blocked_id_param)
     OR (user_id = blocked_id_param AND actor_id = current_user_id);

  SELECT c.id INTO dm_conv_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
    AND EXISTS (SELECT 1 FROM conversation_participants cp1 WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id)
    AND EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = c.id AND cp2.user_id = blocked_id_param)
  LIMIT 1;
  IF dm_conv_id IS NOT NULL THEN
    DELETE FROM conversations WHERE id = dm_conv_id;
  END IF;

  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_id_param)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
