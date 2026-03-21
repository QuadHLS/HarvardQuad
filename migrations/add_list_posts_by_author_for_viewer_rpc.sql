-- RPC to list posts by author with viewer-specific visibility.
-- Own profile (author = viewer): all posts excluding Quadly.
-- Other profile: only campus, open squad, restricted (non_members_can_view_posts), or squads viewer is in.

CREATE OR REPLACE FUNCTION public.list_posts_by_author_for_viewer(
  author_id_param uuid,
  viewer_id_param uuid,
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF viewer_id_param IS NULL THEN
    RETURN;
  END IF;

  IF author_id_param = viewer_id_param THEN
    RETURN QUERY
    SELECT fp.*
    FROM feed_posts fp
    WHERE fp.author_id = author_id_param
    AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
    ORDER BY fp.created_at DESC
    LIMIT limit_val
    OFFSET offset_val;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  LEFT JOIN squads s ON fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = s.id
  WHERE fp.author_id = author_id_param
  AND (fp.override_author_name IS NULL OR fp.override_author_name = '')
  AND (
    fp.source_type = 'user'
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND (
      (s.type = 'open')
      OR (s.type = 'restricted' AND s.non_members_can_view_posts = true)
      OR public.is_squad_member(fp.source_id, viewer_id_param)
    ))
  )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_posts_by_author_for_viewer(uuid, uuid, int, int) TO authenticated;
