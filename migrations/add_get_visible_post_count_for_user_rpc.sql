-- RPC to get post count for a user as visible to a viewer.
-- When viewing another user's profile: only campus, open squad, restricted (non_members_can_view_posts), or squads viewer is in.
-- When viewing own profile (target = viewer): count all posts.

CREATE OR REPLACE FUNCTION public.get_visible_post_count_for_user(
  target_user_id uuid,
  viewer_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  IF viewer_id IS NULL THEN
    RETURN 0;
  END IF;

  IF target_user_id = viewer_id THEN
    SELECT COUNT(*)::bigint INTO cnt FROM feed_posts
    WHERE author_id = target_user_id
    AND (override_author_name IS NULL OR override_author_name = '');
    RETURN cnt;
  END IF;

  SELECT COUNT(*)::bigint INTO cnt
  FROM feed_posts fp
  LEFT JOIN squads s ON fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = s.id
  WHERE fp.author_id = target_user_id
  AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
  AND (
    fp.source_type = 'user'
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND (
      (s.type = 'open')
      OR (s.type = 'restricted' AND s.non_members_can_view_posts = true)
      OR public.is_squad_member(fp.source_id, viewer_id)
    ))
  );

  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_post_count_for_user(uuid, uuid) TO authenticated;
