-- Remove squad_type column from squads table
-- This migration removes the squad_type column that was previously added

-- Drop the index first
DROP INDEX IF EXISTS public.idx_squads_squad_type;

-- Drop the column
ALTER TABLE public.squads 
DROP COLUMN IF EXISTS squad_type;

-- Update the create_squad function to remove squad_type parameter
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

-- Grant execute permission (updated signature)
GRANT EXECUTE ON FUNCTION public.create_squad(text, text, text, text, text, text) TO authenticated;
