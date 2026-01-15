-- Fix group creation by allowing users to create groups with participants
-- The issue is that when creating a group, we need to add participants, but the policy
-- only allows admins to add participants, and the creator isn't an admin yet.
-- We need a function that creates the group and adds all participants atomically.

-- Create a function to create a group chat with participants
-- This bypasses RLS for the initial participant insertion
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_name text,
  participant_user_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  conv_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate inputs
  IF group_name IS NULL OR trim(group_name) = '' THEN
    RAISE EXCEPTION 'Group name cannot be empty';
  END IF;

  IF participant_user_ids IS NULL OR array_length(participant_user_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Group must have at least 2 participants (3 including creator)';
  END IF;

  -- Create group conversation
  INSERT INTO conversations (name, type, created_by)
  VALUES (trim(group_name), 'group', current_user_id)
  RETURNING id INTO conv_id;

  -- Add creator as admin
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, current_user_id, 'admin');

  -- Add all other participants as members (bypassing RLS via SECURITY DEFINER)
  -- Filter out the creator if they're in the list to avoid duplicates
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  SELECT conv_id, user_id, 'member'
  FROM unnest(participant_user_ids) AS user_id
  WHERE user_id != current_user_id; -- Don't duplicate creator

  RETURN conv_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
