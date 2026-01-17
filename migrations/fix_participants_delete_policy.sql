-- Fix DELETE policy for conversation_participants to allow all members to remove non-admins
-- This matches the INSERT policy behavior: all members can manage the group

-- Create a function to check if user can remove a participant
-- Allows removal if: user is removing themselves, OR user is removing a non-admin, OR user is admin removing anyone
CREATE OR REPLACE FUNCTION public.can_remove_participant(conv_id uuid, current_user_uuid uuid, target_user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result boolean;
  conv_type text;
  target_role text;
  current_role text;
BEGIN
  -- Users can always remove themselves
  IF current_user_uuid = target_user_uuid THEN
    RETURN true;
  END IF;

  -- First check if conversation exists and is a group
  SELECT c.type INTO conv_type
  FROM public.conversations c
  WHERE c.id = conv_id;
  
  IF conv_type IS NULL OR conv_type != 'group' THEN
    RETURN false;
  END IF;

  -- Get target user's role
  SELECT role INTO target_role
  FROM public.conversation_participants
  WHERE conversation_id = conv_id
  AND user_id = target_user_uuid;

  -- If target doesn't exist, can't remove
  IF target_role IS NULL THEN
    RETURN false;
  END IF;

  -- If target is an admin, only admins can remove them
  IF target_role = 'admin' THEN
    SELECT role INTO current_role
    FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = current_user_uuid;
    
    -- Only admins can remove other admins
    RETURN (current_role = 'admin');
  END IF;

  -- For non-admins: check if current user is a participant
  -- SECURITY DEFINER should bypass RLS for this query
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = current_user_uuid
  ) INTO result;

  -- Any participant can remove non-admins
  RETURN COALESCE(result, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_remove_participant(uuid, uuid, uuid) TO authenticated;

-- Drop the existing DELETE policy
DROP POLICY IF EXISTS "Users can remove participants from conversations" ON public.conversation_participants;

-- Create new DELETE policy: All members can remove non-admins, only admins can remove admins
CREATE POLICY "Users can remove participants from conversations"
  ON public.conversation_participants
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND public.can_remove_participant(
      conversation_id,
      (select auth.uid()),
      user_id
    )
  );
