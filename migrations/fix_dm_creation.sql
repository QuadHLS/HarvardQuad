-- Fix DM creation by allowing users to add participants to DMs they create
-- The issue is that when creating a DM, we need to add both users, but the policy
-- only allows adding yourself. We need a special case for DM creation.

-- Create a function to create a DM with both participants
-- This bypasses RLS for the initial participant insertion
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
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if DM already exists
  SELECT c.id INTO existing_dm_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF existing_dm_id IS NOT NULL THEN
    RETURN existing_dm_id;
  END IF;

  -- Create new DM conversation
  INSERT INTO conversations (type, created_by)
  VALUES ('dm', current_user_id)
  RETURNING id INTO conv_id;

  -- Add both participants (bypassing RLS via SECURITY DEFINER)
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (conv_id, current_user_id, 'admin'),
    (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_dm_conversation(uuid) TO authenticated;
