-- RPC to get squads the current user is NOT a member of (for Discover tab). Excludes private squads.
-- SECURITY DEFINER bypasses RLS so we return all squads the user can discover.
-- Caller must be authenticated.

CREATE OR REPLACE FUNCTION public.get_squads_for_discover()
RETURNS TABLE(
  id uuid,
  name text,
  info text,
  category text,
  meeting_times text,
  location text,
  type text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  conversation_id uuid,
  chat_enabled boolean,
  avatar_url text,
  cover_url text,
  rules text,
  member_count bigint,
  post_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.info,
    s.category,
    s.meeting_times,
    s.location,
    s.type,
    s.created_by,
    s.created_at,
    s.updated_at,
    s.conversation_id,
    s.chat_enabled,
    s.avatar_url,
    s.cover_url,
    s.rules,
    COALESCE(mc.c, 0)::bigint AS member_count,
    COALESCE(pc.c, 0)::bigint AS post_count
  FROM squads s
  LEFT JOIN (
    SELECT squad_id, COUNT(*)::bigint AS c
    FROM squad_members
    GROUP BY squad_id
  ) mc ON mc.squad_id = s.id
  LEFT JOIN (
    SELECT source_id, COUNT(*)::bigint AS c
    FROM feed_posts
    WHERE source_type = 'squad' AND source_id IS NOT NULL
    GROUP BY source_id
  ) pc ON pc.source_id = s.id
  WHERE s.type != 'private'
  AND NOT EXISTS (
    SELECT 1 FROM squad_members sm
    WHERE sm.squad_id = s.id AND sm.user_id = auth.uid()
  )
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_squads_for_discover() TO authenticated;
