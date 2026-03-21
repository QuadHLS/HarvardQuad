-- Explore People: exclude blocked users (both directions).

CREATE OR REPLACE FUNCTION public.list_profiles_for_explore(viewer_id_param uuid)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE p.is_public = true
    AND (viewer_id_param IS NULL OR p.id != viewer_id_param)
    AND (
      viewer_id_param IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = viewer_id_param AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = viewer_id_param)
      )
    )
  ORDER BY p.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_explore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_profiles_for_explore(uuid) TO anon;
