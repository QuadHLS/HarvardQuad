-- Exclude blocked users' posts from all feeds (campus, custom, friends, squad).

-- 1. Campus feed: create RPC that excludes posts from users the viewer has blocked.
CREATE OR REPLACE FUNCTION public.list_campus_feed_posts(
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
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
  SELECT fp.*
  FROM feed_posts fp
  WHERE fp.source_type = 'user'
    AND fp.author_id NOT IN (
      SELECT ub.blocked_id FROM user_blocks ub WHERE ub.blocker_id = current_user_id
    )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_campus_feed_posts(int, int) TO authenticated;

-- 2. Custom feed: add block exclusion.
CREATE OR REPLACE FUNCTION public.list_custom_feed_posts(
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  include_campus_val boolean;
  squad_ids_val uuid[];
  has_squad_membership boolean;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM squad_members WHERE user_id = current_user_id)
  INTO has_squad_membership;

  IF NOT has_squad_membership THEN
    RETURN;
  END IF;

  SELECT ucf.include_campus, COALESCE(ucf.squad_ids, '{}')
  INTO include_campus_val, squad_ids_val
  FROM user_custom_feed ucf
  WHERE ucf.user_id = current_user_id;

  IF include_campus_val IS NULL THEN
    include_campus_val := true;
    squad_ids_val := '{}';
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  WHERE (
    (fp.source_type = 'user' AND include_campus_val)
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = ANY(squad_ids_val))
  )
  AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
  AND fp.author_id NOT IN (
    SELECT ub.blocked_id FROM user_blocks ub WHERE ub.blocker_id = current_user_id
  )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

-- 3. Friends feed: add block exclusion.
CREATE OR REPLACE FUNCTION public.list_friends_feed_posts(
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  include_campus_val boolean;
  squad_ids_val uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(uff.include_campus, true), COALESCE(uff.squad_ids, '{}')
  INTO include_campus_val, squad_ids_val
  FROM user_friends_feed uff
  WHERE uff.user_id = current_user_id;

  IF include_campus_val IS NULL THEN
    include_campus_val := true;
    squad_ids_val := '{}';
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  WHERE fp.author_id IN (
    SELECT CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END
    FROM friends f
    WHERE f.user_id = current_user_id OR f.friend_id = current_user_id
  )
  AND (
    (fp.source_type = 'user' AND include_campus_val)
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = ANY(squad_ids_val))
  )
  AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
  AND fp.author_id NOT IN (
    SELECT ub.blocked_id FROM user_blocks ub WHERE ub.blocker_id = current_user_id
  )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

-- 4. Squad feed: exclude posts from blocked users when viewing a squad's feed.
CREATE OR REPLACE FUNCTION public.list_squad_feed_posts(
  squad_id_param uuid,
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
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
  SELECT fp.*
  FROM feed_posts fp
  WHERE fp.source_type = 'squad'
    AND fp.source_id = squad_id_param
    AND fp.author_id NOT IN (
      SELECT ub.blocked_id FROM user_blocks ub WHERE ub.blocker_id = current_user_id
    )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_squad_feed_posts(uuid, int, int) TO authenticated;
