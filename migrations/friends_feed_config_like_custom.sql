-- Friends feed: same config as custom feed (include_campus + squad_ids).
-- Filters to friends' posts from campus and/or selected squads.

ALTER TABLE public.user_friends_feed
  ADD COLUMN IF NOT EXISTS include_campus boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS squad_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill: if friend_ids was used, default to campus-only
UPDATE public.user_friends_feed
SET include_campus = true, squad_ids = '{}'
WHERE include_campus IS NULL OR squad_ids IS NULL;

-- Get friends feed config (same shape as custom feed)
CREATE OR REPLACE FUNCTION public.get_friends_feed_config()
RETURNS TABLE(include_campus boolean, squad_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT COALESCE(uff.include_campus, true), COALESCE(uff.squad_ids, '{}')
  FROM user_friends_feed uff
  WHERE uff.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_feed_config() TO authenticated;

-- Set friends feed config (same params as custom feed)
CREATE OR REPLACE FUNCTION public.set_friends_feed_config(
  include_campus_param boolean,
  squad_ids_param uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  valid_squad_ids uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF squad_ids_param IS NULL OR array_length(squad_ids_param, 1) IS NULL THEN
    valid_squad_ids := '{}';
  ELSE
    SELECT ARRAY_AGG(sm.squad_id)
    INTO valid_squad_ids
    FROM squad_members sm
    WHERE sm.user_id = current_user_id
      AND sm.squad_id = ANY(squad_ids_param);
  END IF;

  INSERT INTO user_friends_feed (user_id, include_campus, squad_ids, updated_at)
  VALUES (current_user_id, include_campus_param, COALESCE(valid_squad_ids, '{}'), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    include_campus = include_campus_param,
    squad_ids = COALESCE(valid_squad_ids, '{}'),
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_friends_feed_config(boolean, uuid[]) TO authenticated;

-- List friends feed posts: friends' posts from campus and/or selected squads (same logic as custom)
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
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_friends_feed_posts(int, int) TO authenticated;
