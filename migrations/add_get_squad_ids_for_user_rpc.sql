-- RPC to get squads a user is in (for profile page display).
-- Bypasses squad_members RLS so viewers can see all squads the profile user is in,
-- including private squads the viewer is not in.
-- Returns squad_id and member_count. Caller must be authenticated.

CREATE OR REPLACE FUNCTION public.get_squad_ids_for_user(target_user_id uuid)
RETURNS TABLE(squad_id uuid, member_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT sm.squad_id, cnt.c
  FROM squad_members sm
  JOIN (
    SELECT squad_id, COUNT(*)::bigint AS c
    FROM squad_members
    GROUP BY squad_id
  ) cnt ON cnt.squad_id = sm.squad_id
  WHERE sm.user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_squad_ids_for_user(uuid) TO authenticated;
