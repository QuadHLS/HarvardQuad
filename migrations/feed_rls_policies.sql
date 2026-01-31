-- Feed RLS policies. All require auth. Run after create_feed_tables.sql.

-- feed_posts: SELECT all authenticated; INSERT as auth (author_id = uid); UPDATE/DELETE author only
DROP POLICY IF EXISTS "Feed posts: auth can read" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can read"
ON public.feed_posts FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Feed posts: auth can insert own" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can insert own"
ON public.feed_posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Feed posts: author can update" ON public.feed_posts;
CREATE POLICY "Feed posts: author can update"
ON public.feed_posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Feed posts: author can delete" ON public.feed_posts;
CREATE POLICY "Feed posts: author can delete"
ON public.feed_posts FOR DELETE
USING (auth.uid() = author_id);

-- feed_poll_options: SELECT all auth; INSERT/UPDATE/DELETE only post author
DROP POLICY IF EXISTS "Feed poll options: auth can read" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: auth can read"
ON public.feed_poll_options FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Feed poll options: post author can insert" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can insert"
ON public.feed_poll_options FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

DROP POLICY IF EXISTS "Feed poll options: post author can update" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can update"
ON public.feed_poll_options FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

DROP POLICY IF EXISTS "Feed poll options: post author can delete" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can delete"
ON public.feed_poll_options FOR DELETE
USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

-- feed_poll_votes: SELECT all auth; INSERT/UPDATE one per user per poll (auth); DELETE own vote (upsert uses UPDATE)
DROP POLICY IF EXISTS "Feed poll votes: auth can read" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: auth can read"
ON public.feed_poll_votes FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Feed poll votes: auth can insert own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: auth can insert own"
ON public.feed_poll_votes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Feed poll votes: user can update own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: user can update own"
ON public.feed_poll_votes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Feed poll votes: user can delete own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: user can delete own"
ON public.feed_poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- feed_replies: SELECT all auth; INSERT auth; UPDATE/DELETE author only
DROP POLICY IF EXISTS "Feed replies: auth can read" ON public.feed_replies;
CREATE POLICY "Feed replies: auth can read"
ON public.feed_replies FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Feed replies: auth can insert own" ON public.feed_replies;
CREATE POLICY "Feed replies: auth can insert own"
ON public.feed_replies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Feed replies: author can update" ON public.feed_replies;
CREATE POLICY "Feed replies: author can update"
ON public.feed_replies FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Feed replies: author can delete" ON public.feed_replies;
CREATE POLICY "Feed replies: author can delete"
ON public.feed_replies FOR DELETE
USING (auth.uid() = author_id);

-- feed_hearts: SELECT all auth; INSERT auth (one per user per post/reply enforced by unique index); DELETE own heart
DROP POLICY IF EXISTS "Feed hearts: auth can read" ON public.feed_hearts;
CREATE POLICY "Feed hearts: auth can read"
ON public.feed_hearts FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Feed hearts: auth can insert own" ON public.feed_hearts;
CREATE POLICY "Feed hearts: auth can insert own"
ON public.feed_hearts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Feed hearts: user can delete own" ON public.feed_hearts;
CREATE POLICY "Feed hearts: user can delete own"
ON public.feed_hearts FOR DELETE
USING (auth.uid() = user_id);
