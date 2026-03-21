-- Blocking and friends: when blocking, unfriend first. Prevent accepting friend requests when blocked.

-- 1. Update block_user: remove friendship before inserting block.
CREATE OR REPLACE FUNCTION public.block_user(blocked_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  IF blocked_id_param = current_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Unfriend first: remove from friends if they were friends
  DELETE FROM friends
  WHERE (user_id = current_user_id AND friend_id = blocked_id_param)
     OR (user_id = blocked_id_param AND friend_id = current_user_id);

  -- Cancel any pending friend requests between the two
  DELETE FROM friend_requests
  WHERE ((from_user_id = current_user_id AND to_user_id = blocked_id_param)
      OR (from_user_id = blocked_id_param AND to_user_id = current_user_id))
    AND status = 'pending';

  -- Remove friend-related notifications between the two (both directions)
  DELETE FROM notifications
  WHERE type IN ('friend_request', 'friend_accepted')
    AND ((user_id = current_user_id AND actor_id = blocked_id_param)
      OR (user_id = blocked_id_param AND actor_id = current_user_id));

  -- Insert block (no notification; blocking is silent)
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_id_param)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

-- 2. Update accept_friend_request: reject if either user has blocked the other.
CREATE OR REPLACE FUNCTION public.accept_friend_request(from_user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = current_user_id AND blocked_id = from_user_id_param)
       OR (blocker_id = from_user_id_param AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot accept friend request';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE from_user_id = from_user_id_param AND to_user_id = current_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'No pending friend request';
  END IF;

  UPDATE friend_requests SET status = 'accepted'
  WHERE from_user_id = from_user_id_param AND to_user_id = current_user_id;

  INSERT INTO friends (user_id, friend_id)
  VALUES (from_user_id_param, current_user_id), (current_user_id, from_user_id_param)
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (from_user_id_param, 'friend_accepted', current_user_id, 'profile', current_user_id, '{}');
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
