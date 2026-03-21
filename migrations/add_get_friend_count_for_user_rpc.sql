-- RPC to get friend count for a user (count-only, no profile data).

CREATE OR REPLACE FUNCTION public.get_friend_count_for_user(profile_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::bigint
    FROM friends f
    WHERE f.user_id = profile_user_id OR f.friend_id = profile_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_count_for_user(uuid) TO authenticated;
