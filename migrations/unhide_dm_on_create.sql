-- When create_dm_conversation returns an existing DM, unhide it for the current user.
-- Fixes: hide conv → create new with same person → stuck on "Loading conversation..."
-- (existing conv was hidden so get_all_conversations excluded it)

CREATE OR REPLACE FUNCTION public.create_dm_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  conv_id uuid;
  existing_dm_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = current_user_id AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: user is blocked';
  END IF;

  SELECT c.id INTO existing_dm_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (SELECT 1 FROM conversation_participants cp1 WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id)
    AND EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id)
    AND (SELECT COUNT(*) FROM conversation_participants cp3 WHERE cp3.conversation_id = c.id) = 2
  LIMIT 1;

  IF existing_dm_id IS NOT NULL THEN
    UPDATE conversation_participants
    SET hidden_at = NULL
    WHERE conversation_id = existing_dm_id AND user_id = current_user_id;
    RETURN existing_dm_id;
  END IF;

  INSERT INTO conversations (type, created_by)
  VALUES ('dm', current_user_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES
    (conv_id, current_user_id, 'admin'),
    (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;
