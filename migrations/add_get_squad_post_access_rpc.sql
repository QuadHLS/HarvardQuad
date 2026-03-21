-- RPC for squad post access: is_member, can_view, squad_name, squad_type.
-- Used by frontend to decide: open full, open read-only with banner, or toast.

CREATE OR REPLACE FUNCTION public.get_squad_post_access(squad_id_param uuid)
RETURNS TABLE(is_member boolean, can_view boolean, squad_name text, squad_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    public.is_squad_member(squad_id_param, auth.uid()),
    (
      s.type = 'open'
      OR (s.type = 'restricted' AND s.non_members_can_view_posts = true)
      OR public.is_squad_member(squad_id_param, auth.uid())
    ),
    s.name,
    s.type::text
  FROM squads s
  WHERE s.id = squad_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_squad_post_access(uuid) TO authenticated;
