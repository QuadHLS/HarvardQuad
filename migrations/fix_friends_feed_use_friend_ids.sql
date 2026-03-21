-- Friends feed: use friend_ids from user_friends_feed (which friends to show).
-- Visibility: campus posts + squad posts (open, restricted+public, or viewer is member).
-- Excludes: restricted squad with public off (when viewer not in squad), private squad (when viewer not in squad).

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
  friend_ids_val uuid[];
  allowed_authors uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get friend_ids from config. No row = show all friends. Empty array = show none.
  SELECT COALESCE(uff.friend_ids, '{}')
  INTO friend_ids_val
  FROM user_friends_feed uff
  WHERE uff.user_id = current_user_id;

  IF NOT FOUND THEN
    -- No config row: show all friends
    SELECT COALESCE(ARRAY_AGG(CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END), '{}')
    INTO allowed_authors
    FROM friends f
    WHERE f.user_id = current_user_id OR f.friend_id = current_user_id;
  ELSIF array_length(friend_ids_val, 1) IS NULL OR array_length(friend_ids_val, 1) = 0 THEN
    allowed_authors := '{}';
  ELSE
    allowed_authors := friend_ids_val;
  END IF;

  IF allowed_authors IS NULL OR array_length(allowed_authors, 1) IS NULL OR array_length(allowed_authors, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  LEFT JOIN squads s ON fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = s.id
  WHERE fp.author_id = ANY(allowed_authors)
    AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
    AND fp.author_id IS NOT NULL
    AND (
      fp.source_type = 'user'
      OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND (
        (s.type = 'open')
        OR (s.type = 'restricted' AND s.non_members_can_view_posts = true)
        OR public.is_squad_member(fp.source_id, current_user_id)
      ))
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = current_user_id AND ub.blocked_id = fp.author_id)
         OR (ub.blocker_id = fp.author_id AND ub.blocked_id = current_user_id)
    )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_friends_feed_posts(int, int) TO authenticated;
