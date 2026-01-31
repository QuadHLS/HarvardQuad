-- Feed performance: indexes for common read patterns.
-- Run after create_feed_tables.sql (and feed_rls_policies.sql). Safe to run multiple times (IF NOT EXISTS).
-- Note: Pin order is per-user (feed_user_pins); list is sorted in-app.

-- Replies for a post: load by post_id ordered by created_at (and thread by parent_reply_id)
CREATE INDEX IF NOT EXISTS idx_feed_replies_post_created
  ON public.feed_replies (post_id, created_at);

-- Poll vote counts per option for a post (GROUP BY option_id WHERE post_id = ?)
CREATE INDEX IF NOT EXISTS idx_feed_poll_votes_post_option
  ON public.feed_poll_votes (post_id, option_id);
