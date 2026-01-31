-- Drop global pin columns from feed_posts; pinning is now per-user via feed_user_pins.
-- Run after create_feed_user_pins.sql.

DROP INDEX IF EXISTS public.idx_feed_posts_is_pinned;

ALTER TABLE public.feed_posts
  DROP COLUMN IF EXISTS is_pinned,
  DROP COLUMN IF EXISTS pinned_by;
