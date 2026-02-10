-- Enable Supabase Realtime (postgres_changes) for feed tables.
-- Required for live updates on home and squad feeds (posts, replies, hearts, polls).
-- Run in Supabase SQL Editor or via migration. If publication already has tables, add these.

ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_hearts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_poll_votes;
