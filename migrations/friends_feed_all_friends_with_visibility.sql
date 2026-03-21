-- Friends feed: show posts from all friends throughout the site.
-- Excludes: restricted squad with public view off (when not member), private squad posts (when not member).
-- No config needed - no friend_ids, include_campus, or squad_ids.

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
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  LEFT JOIN squads s ON s.id = fp.source_id AND fp.source_type = 'squad'
  WHERE fp.author_id IN (
    SELECT CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END
    FROM friends f
    WHERE f.user_id = current_user_id OR f.friend_id = current_user_id
  )
  AND (
    fp.source_type = 'user'
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND (
      s.type = 'open'
      OR (s.type = 'restricted' AND s.non_members_can_view_posts = true)
      OR public.is_squad_member(fp.source_id, current_user_id)
    ))
  )
  AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
  AND fp.author_id IS NOT NULL
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
