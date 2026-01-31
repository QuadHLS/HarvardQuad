-- Per-user pinning: each user can pin posts for themselves.
-- Run after create_feed_tables.sql and feed_rls_policies.sql.

CREATE TABLE IF NOT EXISTS public.feed_user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_user_pins_user_id ON public.feed_user_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_user_pins_post_id ON public.feed_user_pins(post_id);

ALTER TABLE public.feed_user_pins ENABLE ROW LEVEL SECURITY;

-- Users can only see their own pins
DROP POLICY IF EXISTS "Feed user pins: user can read own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can read own"
ON public.feed_user_pins FOR SELECT
USING (auth.uid() = user_id);

-- Users can pin any post for themselves (insert own row)
DROP POLICY IF EXISTS "Feed user pins: user can insert own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can insert own"
ON public.feed_user_pins FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can unpin (delete only their own rows)
DROP POLICY IF EXISTS "Feed user pins: user can delete own" ON public.feed_user_pins;
CREATE POLICY "Feed user pins: user can delete own"
ON public.feed_user_pins FOR DELETE
USING (auth.uid() = user_id);
