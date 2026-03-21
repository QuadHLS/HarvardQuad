-- Auth RLS Initialization Plan: wrap auth.uid() in (select auth.uid())
-- so it's evaluated once per query instead of per row.
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- feed_posts
DROP POLICY IF EXISTS "Feed posts: auth can read" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can read" ON public.feed_posts FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    source_type = 'user'
    OR (source_type = 'squad' AND source_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM squads s WHERE s.id = source_id AND s.type = 'open')
      OR public.is_squad_member(source_id, (select auth.uid()))
    ))
  )
);

DROP POLICY IF EXISTS "Feed posts: auth can insert own" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can insert own" ON public.feed_posts FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Feed posts: author can update" ON public.feed_posts;
CREATE POLICY "Feed posts: author can update" ON public.feed_posts FOR UPDATE
USING ((select auth.uid()) = author_id)
WITH CHECK ((select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Feed posts: author can delete" ON public.feed_posts;
CREATE POLICY "Feed posts: author can delete" ON public.feed_posts FOR DELETE
USING ((select auth.uid()) = author_id);

-- feed_reports
DROP POLICY IF EXISTS "Feed reports: reporter can insert own" ON public.feed_reports;
CREATE POLICY "Feed reports: reporter can insert own" ON public.feed_reports FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = reporter_id);

DROP POLICY IF EXISTS "Feed reports: reporter can read own" ON public.feed_reports;
CREATE POLICY "Feed reports: reporter can read own" ON public.feed_reports FOR SELECT
USING ((select auth.uid()) = reporter_id);

-- feed_poll_options
DROP POLICY IF EXISTS "Feed poll options: auth can read" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: auth can read" ON public.feed_poll_options FOR SELECT
USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Feed poll options: post author can insert" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can insert" ON public.feed_poll_options FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Feed poll options: post author can update" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can update" ON public.feed_poll_options FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = (select auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = (select auth.uid())));

DROP POLICY IF EXISTS "Feed poll options: post author can delete" ON public.feed_poll_options;
CREATE POLICY "Feed poll options: post author can delete" ON public.feed_poll_options FOR DELETE
USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = (select auth.uid())));

-- feed_poll_votes
DROP POLICY IF EXISTS "Feed poll votes: auth can read" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: auth can read" ON public.feed_poll_votes FOR SELECT
USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Feed poll votes: auth can insert own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: auth can insert own" ON public.feed_poll_votes FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Feed poll votes: user can update own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: user can update own" ON public.feed_poll_votes FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Feed poll votes: user can delete own" ON public.feed_poll_votes;
CREATE POLICY "Feed poll votes: user can delete own" ON public.feed_poll_votes FOR DELETE
USING ((select auth.uid()) = user_id);

-- feed_replies
DROP POLICY IF EXISTS "Feed replies: auth can read" ON public.feed_replies;
CREATE POLICY "Feed replies: auth can read" ON public.feed_replies FOR SELECT
USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Feed replies: auth can insert own" ON public.feed_replies;
CREATE POLICY "Feed replies: auth can insert own" ON public.feed_replies FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Feed replies: author can update" ON public.feed_replies;
CREATE POLICY "Feed replies: author can update" ON public.feed_replies FOR UPDATE
USING ((select auth.uid()) = author_id)
WITH CHECK ((select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Feed replies: author can delete" ON public.feed_replies;
CREATE POLICY "Feed replies: author can delete" ON public.feed_replies FOR DELETE
USING ((select auth.uid()) = author_id);

-- feed_hearts
DROP POLICY IF EXISTS "Feed hearts: auth can read" ON public.feed_hearts;
CREATE POLICY "Feed hearts: auth can read" ON public.feed_hearts FOR SELECT
USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Feed hearts: auth can insert own" ON public.feed_hearts;
CREATE POLICY "Feed hearts: auth can insert own" ON public.feed_hearts FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Feed hearts: user can delete own" ON public.feed_hearts;
CREATE POLICY "Feed hearts: user can delete own" ON public.feed_hearts FOR DELETE
USING ((select auth.uid()) = user_id);

-- feed_user_pins
DROP POLICY IF EXISTS "Feed user pins: user can read own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can read own" ON public.feed_user_pins FOR SELECT
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Feed user pins: user can insert own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can insert own" ON public.feed_user_pins FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Feed user pins: user can delete own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can delete own" ON public.feed_user_pins FOR DELETE
USING ((select auth.uid()) = user_id);

-- feed_squad_pins
DROP POLICY IF EXISTS "Squad members can view squad pins" ON public.feed_squad_pins;
CREATE POLICY "Squad members can view squad pins" ON public.feed_squad_pins FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    public.is_squad_member(squad_id, (select auth.uid()))
    OR EXISTS (SELECT 1 FROM squads WHERE id = squad_id AND type = 'open')
  )
);

DROP POLICY IF EXISTS "Squad admins can pin posts" ON public.feed_squad_pins;
CREATE POLICY "Squad admins can pin posts" ON public.feed_squad_pins FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = pinned_by
  AND public.is_squad_admin(squad_id, (select auth.uid()))
);

DROP POLICY IF EXISTS "Squad admins can unpin posts" ON public.feed_squad_pins;
CREATE POLICY "Squad admins can unpin posts" ON public.feed_squad_pins FOR DELETE
USING ((select auth.uid()) IS NOT NULL AND public.is_squad_admin(squad_id, (select auth.uid())));

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT
WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
USING ((select auth.uid()) = user_id);

-- user_custom_feed
DROP POLICY IF EXISTS "Users can manage own custom feed" ON public.user_custom_feed;
CREATE POLICY "Users can manage own custom feed" ON public.user_custom_feed FOR ALL
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- squad_invites
DROP POLICY IF EXISTS "Invitees can view own invites" ON public.squad_invites;
CREATE POLICY "Invitees can view own invites" ON public.squad_invites FOR SELECT
USING ((select auth.uid()) = invitee_id);

DROP POLICY IF EXISTS "Inviters can view invites they sent" ON public.squad_invites;
CREATE POLICY "Inviters can view invites they sent" ON public.squad_invites FOR SELECT
USING ((select auth.uid()) = inviter_id);

DROP POLICY IF EXISTS "Squad members can view squad invites" ON public.squad_invites;
CREATE POLICY "Squad members can view squad invites" ON public.squad_invites FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_invites.squad_id AND sm.user_id = (select auth.uid()))
);

-- squad_join_requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.squad_join_requests;
CREATE POLICY "Users can view own requests" ON public.squad_join_requests FOR SELECT
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view squad requests" ON public.squad_join_requests;
CREATE POLICY "Admins can view squad requests" ON public.squad_join_requests FOR SELECT
USING ((select auth.uid()) IS NOT NULL AND public.is_squad_admin(squad_id, (select auth.uid())));

DROP POLICY IF EXISTS "Users can request to join restricted squad" ON public.squad_join_requests;
CREATE POLICY "Users can request to join restricted squad" ON public.squad_join_requests FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id AND s.type = 'restricted')
  AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_join_requests.squad_id AND sm.user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Admins can update request status" ON public.squad_join_requests;
CREATE POLICY "Admins can update request status" ON public.squad_join_requests FOR UPDATE
USING (public.is_squad_admin(squad_id, (select auth.uid())))
WITH CHECK (public.is_squad_admin(squad_id, (select auth.uid())));

-- squads (Users can view squads - others already use (select auth.uid()))
DROP POLICY IF EXISTS "Users can view squads" ON public.squads;
CREATE POLICY "Users can view squads" ON public.squads FOR SELECT
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    type = 'open'
    OR type = 'restricted'
    OR (type = 'private' AND public.is_squad_member(id, (select auth.uid())))
  )
);

-- squad_documents (Admins can add documents - others already use (select auth.uid()))
DROP POLICY IF EXISTS "Admins can add documents to squads" ON public.squad_documents;
CREATE POLICY "Admins can add documents to squads" ON public.squad_documents FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.uid()) = created_by
  AND public.is_squad_admin(squad_documents.squad_id, (select auth.uid()))
);
