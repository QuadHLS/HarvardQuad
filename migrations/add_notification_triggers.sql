-- Triggers to create notifications for like, reply, and message events.
-- Run after create_notifications_table.sql.

-- 1. LIKE (heart on post or reply)
CREATE OR REPLACE FUNCTION notify_on_heart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_target_type text;
  v_target_id uuid;
  v_post_id uuid;
  v_snippet text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;  -- actor

  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO v_recipient_id FROM feed_posts WHERE id = NEW.post_id;
    v_target_type := 'post';
    v_target_id := NEW.post_id;
    SELECT LEFT(title, 80) INTO v_snippet FROM feed_posts WHERE id = NEW.post_id;
  ELSIF NEW.reply_id IS NOT NULL THEN
    SELECT author_id, post_id INTO v_recipient_id, v_post_id FROM feed_replies WHERE id = NEW.reply_id;
    v_target_type := 'reply';
    v_target_id := NEW.reply_id;
    SELECT LEFT(content, 80) INTO v_snippet FROM feed_replies WHERE id = NEW.reply_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.user_id THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (v_recipient_id, 'like', NEW.user_id, v_target_type, v_target_id,
    jsonb_build_object('snippet', COALESCE(v_snippet, ''), 'post_id', COALESCE(v_post_id, v_target_id)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_heart ON feed_hearts;
CREATE TRIGGER trigger_notify_on_heart
  AFTER INSERT ON feed_hearts
  FOR EACH ROW EXECUTE FUNCTION notify_on_heart();

-- 2. REPLY (to post or reply)
CREATE OR REPLACE FUNCTION notify_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_post_id uuid;
  v_snippet text;
BEGIN
  IF NEW.author_id IS NULL THEN RETURN NEW; END IF;

  v_post_id := NEW.post_id;
  v_snippet := LEFT(NEW.content, 80);

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT author_id INTO v_recipient_id FROM feed_replies WHERE id = NEW.parent_reply_id;
  ELSE
    SELECT author_id INTO v_recipient_id FROM feed_posts WHERE id = v_post_id;
  END IF;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.author_id THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (v_recipient_id, 'reply', NEW.author_id, 'post', v_post_id,
    jsonb_build_object('post_id', v_post_id, 'reply_id', NEW.id, 'snippet', COALESCE(v_snippet, '')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_reply ON feed_replies;
CREATE TRIGGER trigger_notify_on_reply
  AFTER INSERT ON feed_replies
  FOR EACH ROW EXECUTE FUNCTION notify_on_reply();

-- 3. MESSAGE (DM or group)
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_type text;
  v_snippet text;
  v_rec RECORD;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  SELECT type INTO v_conv_type FROM conversations WHERE id = NEW.conversation_id;
  v_snippet := LEFT(COALESCE(NEW.content, ''), 100);

  FOR v_rec IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
    VALUES (
      v_rec.user_id,
      CASE WHEN v_conv_type = 'dm' THEN 'dm' ELSE 'group_message' END,
      NEW.sender_id,
      'conversation',
      NEW.conversation_id,
      jsonb_build_object('message_id', NEW.id, 'snippet', v_snippet)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_message ON messages;
CREATE TRIGGER trigger_notify_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
