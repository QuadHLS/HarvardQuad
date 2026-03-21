-- Blocking and DMs: delete DM on block, prevent creating DM when blocked.
-- Blocked users cannot start a convo with you; you cannot start one with them.
-- Unblocking allows starting a new convo (history is deleted).

-- 1. Update block_user: delete DM conversation between the two users before inserting block.
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

  -- Unfriend first
  DELETE FROM friends
  WHERE (user_id = current_user_id AND friend_id = blocked_id_param)
     OR (user_id = blocked_id_param AND friend_id = current_user_id);

  -- Cancel pending friend requests
  DELETE FROM friend_requests
  WHERE ((from_user_id = current_user_id AND to_user_id = blocked_id_param)
      OR (from_user_id = blocked_id_param AND to_user_id = current_user_id))
    AND status = 'pending';

  -- Remove friend-related notifications
  DELETE FROM notifications
  WHERE type IN ('friend_request', 'friend_accepted')
    AND ((user_id = current_user_id AND actor_id = blocked_id_param)
      OR (user_id = blocked_id_param AND actor_id = current_user_id));

  -- Delete DM conversation (messages cascade via FK)
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

  -- Insert block
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_id_param)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

-- 2. Update create_dm_conversation: reject if either user has blocked the other.
CREATE OR REPLACE FUNCTION public.create_dm_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  conv_id uuid;
  existing_dm_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = current_user_id AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: user is blocked';
  END IF;

  SELECT c.id INTO existing_dm_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (SELECT 1 FROM conversation_participants cp1 WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id)
    AND EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id)
    AND (SELECT COUNT(*) FROM conversation_participants cp3 WHERE cp3.conversation_id = c.id) = 2
  LIMIT 1;

  IF existing_dm_id IS NOT NULL THEN
    RETURN existing_dm_id;
  END IF;

  INSERT INTO conversations (type, created_by)
  VALUES ('dm', current_user_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES
    (conv_id, current_user_id, 'admin'),
    (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dm_conversation(uuid) TO authenticated;
