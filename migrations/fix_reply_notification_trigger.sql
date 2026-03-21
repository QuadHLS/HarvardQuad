-- Fix: notify_on_reply should notify BOTH the post author and the parent reply
-- author (when it's a nested reply), deduplicated and skipping self-notifications.

CREATE OR REPLACE FUNCTION notify_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_parent_reply_author_id uuid;
  v_snippet text;
BEGIN
  IF NEW.author_id IS NULL THEN RETURN NEW; END IF;

  v_snippet := LEFT(NEW.content, 80);

  -- Always look up the post author
  SELECT author_id INTO v_post_author_id FROM feed_posts WHERE id = NEW.post_id;

  -- If nested reply, also look up the parent reply author
  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_reply_author_id FROM feed_replies WHERE id = NEW.parent_reply_id;
  END IF;

  -- Notify post author (skip if replier is the post author)
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
    VALUES (v_post_author_id, 'reply', NEW.author_id, 'reply', NEW.id,
      jsonb_build_object('post_id', NEW.post_id, 'reply_id', NEW.id, 'snippet', COALESCE(v_snippet, '')));
  END IF;

  -- Notify parent reply author (skip self, skip duplicate if same as post author)
  IF v_parent_reply_author_id IS NOT NULL
     AND v_parent_reply_author_id != NEW.author_id
     AND v_parent_reply_author_id IS DISTINCT FROM v_post_author_id
  THEN
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
    VALUES (v_parent_reply_author_id, 'reply', NEW.author_id, 'reply', NEW.id,
      jsonb_build_object('post_id', NEW.post_id, 'reply_id', NEW.id, 'snippet', COALESCE(v_snippet, '')));
  END IF;

  RETURN NEW;
END;
$$;
