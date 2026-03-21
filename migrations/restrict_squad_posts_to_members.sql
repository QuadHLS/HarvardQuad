-- Non-members cannot post to restricted (or any) squads. Only squad members can create squad posts.

DROP POLICY IF EXISTS "Feed posts: auth can insert own" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can insert own" ON public.feed_posts FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = author_id
  AND (
    source_type != 'squad'
    OR source_id IS NULL
    OR public.is_squad_member(source_id, (select auth.uid()))
  )
);
