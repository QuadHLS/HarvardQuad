-- RPC to get friend IDs only (lighter than get_friends_for_user when only IDs needed).

CREATE OR REPLACE FUNCTION public.get_friend_ids_for_user(profile_user_id uuid)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT CASE WHEN f.user_id = profile_user_id THEN f.friend_id ELSE f.user_id END
  FROM friends f
  WHERE f.user_id = profile_user_id OR f.friend_id = profile_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_ids_for_user(uuid) TO authenticated;
