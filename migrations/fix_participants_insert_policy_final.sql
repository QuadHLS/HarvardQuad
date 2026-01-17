-- Fix INSERT policy for conversation_participants to avoid RLS recursion
-- This version uses a different approach: only checks creator or message history
-- This avoids querying conversation_participants which causes recursion

CREATE OR REPLACE FUNCTION public.can_add_participant_to_group(conv_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result boolean;
  conv_type text;
  is_creator boolean;
BEGIN
  -- First check if conversation exists and is a group
  SELECT c.type, (c.created_by = user_uuid) INTO conv_type, is_creator
  FROM public.conversations c
  WHERE c.id = conv_id;
  
  IF conv_type IS NULL OR conv_type != 'group' THEN
    RETURN false;
  END IF;
  
  -- If user is the creator, they can add participants
  IF is_creator THEN
    RETURN true;
  END IF;
  
  -- Check if user has sent a message (proves they're a participant)
  -- This uses messages table which doesn't cause recursion
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.conversation_id = conv_id
    AND m.sender_id = user_uuid
    LIMIT 1
  ) INTO result;
  
  -- If user has sent a message, they're definitely a participant
  IF result THEN
    RETURN true;
  END IF;
  
  -- If no message, use is_participant() function which is SECURITY DEFINER
  -- This should safely check participation without recursion
  -- Both functions are SECURITY DEFINER and owned by postgres, so RLS is bypassed
  SELECT public.is_participant(conv_id, user_uuid) INTO result;
  
  -- Allow if user is creator, has sent a message, OR is already a participant
  RETURN COALESCE(result, false);
END;
$$;

-- CRITICAL: Function must be owned by postgres to bypass RLS
ALTER FUNCTION public.can_add_participant_to_group(uuid, uuid) OWNER TO postgres;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_add_participant_to_group(uuid, uuid) TO authenticated;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can add participants" ON public.conversation_participants;

-- Create new INSERT policy: Any participant can add new participants to group chats
-- Uses can_add_participant_to_group() which checks creator, message history, or is_participant()
CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Users can add themselves
      (select auth.uid()) = user_id
      OR
      -- Any participant can add new participants (only to group chats)
      public.can_add_participant_to_group(conversation_participants.conversation_id, (select auth.uid()))
    )
  );
