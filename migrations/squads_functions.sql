-- Functions for squad management with automatic group chat integration

-- Function to create a squad and auto-create a group chat
CREATE OR REPLACE FUNCTION public.create_squad(
  squad_name text,
  squad_info text,
  squad_category text,
  meeting_times text,
  squad_location text,
  privacy_type text DEFAULT 'open'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_id uuid;
  conv_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate inputs
  IF squad_name IS NULL OR trim(squad_name) = '' THEN
    RAISE EXCEPTION 'Squad name cannot be empty';
  END IF;

  IF squad_category IS NULL OR trim(squad_category) = '' THEN
    RAISE EXCEPTION 'Squad category cannot be empty';
  END IF;

  IF privacy_type NOT IN ('open', 'locked', 'private') THEN
    RAISE EXCEPTION 'Privacy type must be open, locked, or private';
  END IF;

  -- Create group chat first (using existing function)
  -- For a new squad, we'll create the chat with just the creator
  -- Other members will be added when they join
  INSERT INTO conversations (name, type, created_by)
  VALUES (trim(squad_name), 'group', current_user_id)
  RETURNING id INTO conv_id;

  -- Add creator as admin of the conversation
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, current_user_id, 'admin');

  -- Create the squad (without squad_type)
  INSERT INTO squads (name, info, category, meeting_times, location, type, created_by, conversation_id)
  VALUES (
    trim(squad_name),
    squad_info,
    trim(squad_category),
    meeting_times,
    squad_location,
    privacy_type,
    current_user_id,
    conv_id
  )
  RETURNING id INTO squad_id;

  -- Add creator as admin member of the squad
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id, current_user_id, 'admin');

  RETURN squad_id;
END;
$$;

-- Function to join a squad and auto-join the group chat
CREATE OR REPLACE FUNCTION public.join_squad(squad_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_conversation_id uuid;
  squad_type_val text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if squad exists and get its type and conversation_id
  SELECT type, conversation_id INTO squad_type_val, squad_conversation_id
  FROM squads
  WHERE id = squad_id_param;

  IF squad_type_val IS NULL THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  -- Check if squad is joinable (open or locked, not private)
  IF squad_type_val = 'private' THEN
    RAISE EXCEPTION 'Cannot join private squad';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = squad_id_param
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this squad';
  END IF;

  -- Add user to squad as member
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id_param, current_user_id, 'member');

  -- Auto-join the group chat if conversation exists
  IF squad_conversation_id IS NOT NULL THEN
    -- Check if user is already in the conversation
    IF NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = squad_conversation_id
      AND user_id = current_user_id
    ) THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES (squad_conversation_id, current_user_id, 'member');
    END IF;
  END IF;
END;
$$;

-- Function to leave a squad and auto-leave the group chat
CREATE OR REPLACE FUNCTION public.leave_squad(squad_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_conversation_id uuid;
  member_role text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is a member
  SELECT role INTO member_role
  FROM squad_members
  WHERE squad_id = squad_id_param
  AND user_id = current_user_id;

  IF member_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this squad';
  END IF;

  -- Prevent admin from leaving if they are the only admin
  IF member_role = 'admin' THEN
    IF (
      SELECT COUNT(*) FROM squad_members
      WHERE squad_id = squad_id_param
      AND role = 'admin'
    ) = 1 THEN
      RAISE EXCEPTION 'Cannot leave squad as the only admin. Transfer admin role or delete the squad.';
    END IF;
  END IF;

  -- Get conversation_id before removing member
  SELECT conversation_id INTO squad_conversation_id
  FROM squads
  WHERE id = squad_id_param;

  -- Remove user from squad
  DELETE FROM squad_members
  WHERE squad_id = squad_id_param
  AND user_id = current_user_id;

  -- Auto-leave the group chat if conversation exists
  IF squad_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = squad_conversation_id
    AND user_id = current_user_id;
  END IF;
END;
$$;

-- Function to remove a member from a squad and auto-remove from group chat
CREATE OR REPLACE FUNCTION public.remove_squad_member(
  squad_id_param uuid,
  user_id_to_remove uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_conversation_id uuid;
  admin_check boolean;
  member_to_remove_role text;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if current user is admin of the squad
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = squad_id_param
    AND user_id = current_user_id
    AND role = 'admin'
  ) INTO admin_check;

  IF NOT admin_check THEN
    RAISE EXCEPTION 'Only admins can remove members from squads';
  END IF;

  -- Check if user to remove is a member
  SELECT role INTO member_to_remove_role
  FROM squad_members
  WHERE squad_id = squad_id_param
  AND user_id = user_id_to_remove;

  IF member_to_remove_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this squad';
  END IF;

  -- Prevent removing the only admin
  IF member_to_remove_role = 'admin' THEN
    IF (
      SELECT COUNT(*) FROM squad_members
      WHERE squad_id = squad_id_param
      AND role = 'admin'
    ) = 1 THEN
      RAISE EXCEPTION 'Cannot remove the only admin from the squad';
    END IF;
  END IF;

  -- Get conversation_id before removing member
  SELECT conversation_id INTO squad_conversation_id
  FROM squads
  WHERE id = squad_id_param;

  -- Remove user from squad
  DELETE FROM squad_members
  WHERE squad_id = squad_id_param
  AND user_id = user_id_to_remove;

  -- Auto-remove from group chat if conversation exists
  IF squad_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = squad_conversation_id
    AND user_id = user_id_to_remove;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_squad(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_squad_member(uuid, uuid) TO authenticated;
