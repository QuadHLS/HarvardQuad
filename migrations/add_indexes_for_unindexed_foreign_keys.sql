-- Add indexes for unindexed foreign keys (performance advisory).
-- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

CREATE INDEX IF NOT EXISTS idx_feed_poll_votes_option_id
  ON public.feed_poll_votes(option_id);

CREATE INDEX IF NOT EXISTS idx_feed_reports_post_id
  ON public.feed_reports(post_id);

CREATE INDEX IF NOT EXISTS idx_feed_reports_reply_id
  ON public.feed_reports(reply_id);

CREATE INDEX IF NOT EXISTS idx_feed_squad_pins_pinned_by
  ON public.feed_squad_pins(pinned_by);

CREATE INDEX IF NOT EXISTS idx_feed_squad_pins_post_id
  ON public.feed_squad_pins(post_id);

CREATE INDEX IF NOT EXISTS idx_squad_documents_squad_id
  ON public.squad_documents(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_invites_inviter_id
  ON public.squad_invites(inviter_id);

CREATE INDEX IF NOT EXISTS idx_squad_join_requests_reviewed_by
  ON public.squad_join_requests(reviewed_by);
