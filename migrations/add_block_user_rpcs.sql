-- Block/unblock RPCs for user_blocks. RLS on user_blocks already restricts to own rows.
-- Blocking does NOT create any notifications (blocked user is not notified).

DROP FUNCTION IF EXISTS public.block_user(uuid);
DROP FUNCTION IF EXISTS public.unblock_user(uuid);
DROP FUNCTION IF EXISTS public.is_blocked_by_me(uuid);
DROP FUNCTION IF EXISTS public.get_blocked_users();

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

  -- No notification created; blocking is silent to the blocked user
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_id_param)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(blocked_id_param uuid)
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

  DELETE FROM user_blocks
  WHERE blocker_id = current_user_id AND blocked_id = blocked_id_param;
END;
$$;

-- Returns true if current user blocks target (one-way check for UI state).
CREATE OR REPLACE FUNCTION public.is_blocked_by_me(blocked_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = current_user_id AND blocked_id = blocked_id_param
  );
END;
$$;

-- Returns list of users blocked by current user (for Settings > Blocked users).
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  blocked_id uuid,
  full_name text,
  public_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS blocked_id,
    p.full_name,
    p.public_name,
    p.avatar_url
  FROM user_blocks ub
  JOIN profiles p ON p.id = ub.blocked_id
  WHERE ub.blocker_id = auth.uid()
  ORDER BY ub.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_by_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;

-- Index for is_blocked_by_me lookup (blocker_id, blocked_id is already PK)
-- PK covers: WHERE blocker_id = X AND blocked_id = Y
-- Add index for get_blocked_users: WHERE blocker_id = X ORDER BY created_at
CREATE INDEX IF NOT EXISTS user_blocks_blocker_created_at_idx
  ON user_blocks (blocker_id, created_at DESC);
