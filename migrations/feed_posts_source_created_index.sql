-- Optional performance: composite index for feed list queries.
-- Helps WHERE source_type = ? [AND source_id = ?] ORDER BY created_at DESC.
-- Safe to run; CONCURRENTLY avoids table lock during creation.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_posts_source_created
  ON public.feed_posts (source_type, source_id, created_at DESC);
