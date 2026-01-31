-- Feed backend: posts (text/pic, social URL, poll), replies (threaded), hearts (likes), poll options/votes.
-- All policies require auth. Author can edit/delete own post/reply. One vote per user per poll. One heart per user per post/reply.

-- feed_posts: text_pic (title, content, optional image), social_url (title, content, url), poll (title + options in feed_poll_options). Pinning is per-user via feed_user_pins.
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'user' CHECK (source_type IN ('user', 'squad')),
  source_id UUID,
  post_type TEXT NOT NULL CHECK (post_type IN ('text_pic', 'social_url', 'poll')),
  title TEXT NOT NULL,
  content TEXT,
  image_path TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_poll_options: options for poll posts
CREATE TABLE IF NOT EXISTS public.feed_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_poll_votes: one vote per user per poll (user can only click once)
CREATE TABLE IF NOT EXISTS public.feed_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.feed_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- feed_replies: replies to posts and replies to replies (text only)
CREATE TABLE IF NOT EXISTS public.feed_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.feed_replies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_hearts: anyone can heart a post or a reply (one heart per user per target)
CREATE TABLE IF NOT EXISTS public.feed_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.feed_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT feed_hearts_target_check CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Partial unique indexes: one heart per user per post, one per user per reply
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_hearts_user_post ON public.feed_hearts (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_hearts_user_reply ON public.feed_hearts (user_id, reply_id) WHERE reply_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_author_id ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_source ON public.feed_posts(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_poll_options_post_id ON public.feed_poll_options(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_poll_votes_post_id ON public.feed_poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_poll_votes_user_id ON public.feed_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_replies_post_id ON public.feed_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_replies_parent ON public.feed_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_feed_replies_author_id ON public.feed_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_hearts_post_id ON public.feed_hearts(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_hearts_reply_id ON public.feed_hearts(reply_id);
CREATE INDEX IF NOT EXISTS idx_feed_hearts_user_id ON public.feed_hearts(user_id);

-- Triggers for updated_at (reuse existing function)
DROP TRIGGER IF EXISTS update_feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_feed_replies_updated_at ON public.feed_replies;
CREATE TRIGGER update_feed_replies_updated_at
  BEFORE UPDATE ON public.feed_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_hearts ENABLE ROW LEVEL SECURITY;
