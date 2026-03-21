-- One report per user per post/reply. Run after feed_reports table exists.
CREATE UNIQUE INDEX IF NOT EXISTS feed_reports_post_unique
  ON public.feed_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS feed_reports_reply_unique
  ON public.feed_reports (reporter_id, reply_id) WHERE reply_id IS NOT NULL;
