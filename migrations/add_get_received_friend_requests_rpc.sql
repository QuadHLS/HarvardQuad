-- RPC to fetch pending friend requests received by the current user.

CREATE OR REPLACE FUNCTION public.get_received_friend_requests()
RETURNS TABLE (
  from_user_id uuid,
  full_name text,
  public_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.from_user_id,
    p.full_name,
    p.public_name,
    p.avatar_url,
    fr.created_at
  FROM friend_requests fr
  JOIN profiles p ON p.id = fr.from_user_id
  WHERE fr.to_user_id = auth.uid()
    AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_received_friend_requests() TO authenticated;
