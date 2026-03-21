-- Allow unified post type: a post can have title (required), content, image_path, url, and poll_options all at once.
-- Display order: title, text, iframe, image, poll.
-- Existing types (text_pic, social_url, poll) remain for backward compatibility.
ALTER TABLE public.feed_posts DROP CONSTRAINT IF EXISTS feed_posts_post_type_check;
ALTER TABLE public.feed_posts ADD CONSTRAINT feed_posts_post_type_check
  CHECK (post_type IN ('text_pic', 'social_url', 'poll', 'post'));
