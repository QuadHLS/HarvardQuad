-- Allow non-members to view squad_members and feed_squad_pins for open squads
-- (and restricted with non_members_can_view_posts for pins/feed). Matches feed_posts
-- visibility so open squad page works for non-members.

-- squad_members: non-members can view open squad members (Members section shows for open only)
DROP POLICY IF EXISTS "Users can view members of squads they belong to" ON public.squad_members;
DROP POLICY IF EXISTS "Users can view squad members" ON public.squad_members;
CREATE POLICY "Users can view squad members"
  ON public.squad_members
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      public.is_squad_member(squad_members.squad_id, (select auth.uid()))
      OR EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_members.squad_id AND s.type = 'open')
    )
  );

-- feed_squad_pins: add restricted+non_members_can_view_posts (open already allowed)
DROP POLICY IF EXISTS "Squad members can view squad pins" ON public.feed_squad_pins;
CREATE POLICY "Squad members can view squad pins" ON public.feed_squad_pins FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    public.is_squad_member(squad_id, (select auth.uid()))
    OR EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id AND s.type = 'open')
    OR EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id AND s.type = 'restricted' AND s.non_members_can_view_posts = true)
  )
);

-- list_squad_feed_posts: enforce squad visibility (was returning private squad posts to non-members)
CREATE OR REPLACE FUNCTION public.list_squad_feed_posts(
  squad_id_param uuid,
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  can_view boolean;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    public.is_squad_member(squad_id_param, current_user_id)
    OR EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id_param AND s.type = 'open')
    OR EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id_param AND s.type = 'restricted' AND s.non_members_can_view_posts = true)
  INTO can_view;

  IF NOT can_view THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  WHERE fp.source_type = 'squad'
    AND fp.source_id = squad_id_param
    AND fp.author_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = current_user_id AND ub.blocked_id = fp.author_id)
         OR (ub.blocker_id = fp.author_id AND ub.blocked_id = current_user_id)
    )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;
