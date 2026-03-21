-- Custom feed: if user is not in any squad, return no posts.
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
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;
