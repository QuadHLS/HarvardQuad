-- Optional display name override for feed posts (e.g. "Quadly" for system welcome posts).
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS override_author_name TEXT;
