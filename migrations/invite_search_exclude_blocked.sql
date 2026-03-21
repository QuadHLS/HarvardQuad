-- Squad invite search: exclude blocked users (both directions).

CREATE OR REPLACE FUNCTION public.list_profiles_for_invite_search(viewer_id_param uuid, query_param text)
RETURNS TABLE(id uuid, full_name text, public_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF viewer_id_param IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.public_name, p.avatar_url
  FROM profiles p
  WHERE p.id != viewer_id_param
    AND (
      query_param IS NULL
      OR query_param = ''
      OR p.public_name ILIKE '%' || query_param || '%'
      OR p.full_name ILIKE '%' || query_param || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = viewer_id_param AND ub.blocked_id = p.id)
         OR (ub.blocker_id = p.id AND ub.blocked_id = viewer_id_param)
    )
  ORDER BY p.public_name NULLS LAST, p.full_name NULLS LAST
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_invite_search(uuid, text) TO authenticated;
