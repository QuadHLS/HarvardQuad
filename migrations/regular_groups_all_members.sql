-- Regular group chats (not squad groups): all participants are members, no admin role.
-- Squad groups keep admin (set in squads_functions.create_squad).
-- This updates create_group_conversation so the creator is added as 'member' like everyone else.

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

  IF participant_user_ids IS NULL OR array_length(participant_user_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Group must have at least 1 participant (2 including creator)';
  END IF;

  -- Create group conversation
  INSERT INTO conversations (name, type, created_by)
  VALUES (trim(group_name), 'group', current_user_id)
  RETURNING id INTO conv_id;

  -- Add creator as member (regular groups: no admin role)
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, current_user_id, 'member');

  -- Add all other participants as members
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  SELECT conv_id, user_id, 'member'
  FROM unnest(participant_user_ids) AS user_id
  WHERE user_id != current_user_id;

  RETURN conv_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
