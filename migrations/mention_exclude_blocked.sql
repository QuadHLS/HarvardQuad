-- @ mention suggestions: exclude blocked users (both directions).

CREATE OR REPLACE FUNCTION public.list_profiles_for_mention(query_param text)
RETURNS TABLE(id uuid, public_name text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid;
BEGIN
  viewer_id := auth.uid();
  IF viewer_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.public_name, p.full_name
  FROM profiles p
  WHERE p.id != viewer_id
    AND (
      query_param IS NULL
      OR query_param = ''
      OR p.public_name ILIKE '%' || query_param || '%'
      OR p.full_name ILIKE '%' || query_param || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = viewer_id AND ub.blocked_id = p.id)
         OR (ub.blocker_id = p.id AND ub.blocked_id = viewer_id)
    )
  ORDER BY p.public_name NULLS LAST, p.full_name NULLS LAST
  LIMIT 8;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_profiles_for_mention(text) TO authenticated;
