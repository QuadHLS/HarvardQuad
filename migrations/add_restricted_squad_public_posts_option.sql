-- Admin option for restricted squads: allow non-members to view posts (but never chat).
-- Chat remains members-only regardless of this setting.

-- 1. Add column (only meaningful for restricted squads)
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS non_members_can_view_posts boolean NOT NULL DEFAULT false;

-- 2. Update feed_posts SELECT policy: for restricted squads, allow view if member OR squad allows it
DROP POLICY IF EXISTS "Feed posts: auth can read" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can read" ON public.feed_posts FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    source_type = 'user'
    OR (source_type = 'squad' AND source_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM squads s WHERE s.id = source_id AND s.type = 'open')
      OR public.is_squad_member(source_id, (select auth.uid()))
      OR EXISTS (SELECT 1 FROM squads s WHERE s.id = source_id AND s.type = 'restricted' AND s.non_members_can_view_posts = true)
    ))
  )
);
