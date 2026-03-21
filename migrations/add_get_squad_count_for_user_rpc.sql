-- RPC to get squad count for a user (count-only, no squad data).
-- Same logic as get_squad_ids_for_user but returns single count.

CREATE OR REPLACE FUNCTION public.get_squad_count_for_user(target_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN (
    SELECT COUNT(*)::bigint
    FROM squad_members sm
    WHERE sm.user_id = target_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_squad_count_for_user(uuid) TO authenticated;
