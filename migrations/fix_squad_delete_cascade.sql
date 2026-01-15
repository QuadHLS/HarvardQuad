-- Fix squad deletion to cascade delete the associated group chat
-- When a squad is deleted, its associated conversation should also be deleted
--
-- Note: We use a trigger instead of ON DELETE CASCADE on the foreign key because:
-- - ON DELETE CASCADE on squads.conversation_id would delete the squad if the conversation is deleted
-- - We want the opposite: delete the conversation when the squad is deleted
-- - Using AFTER DELETE trigger avoids trigger protocol violations

-- Create a function to delete the conversation when a squad is deleted
CREATE OR REPLACE FUNCTION public.delete_squad_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  -- Get the conversation_id from the deleted squad row
  conv_id := OLD.conversation_id;
  
  -- If there's a conversation_id, delete the conversation
  -- This will cascade delete conversation_participants and messages via foreign key constraints
  IF conv_id IS NOT NULL THEN
    DELETE FROM public.conversations
    WHERE id = conv_id;
    -- Note: If conversation doesn't exist, DELETE will silently do nothing (no error)
  END IF;
  
  -- For AFTER DELETE triggers, return value is ignored but OLD is conventional
  RETURN OLD;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_delete_squad_conversation ON public.squads;

-- Create the trigger that fires AFTER DELETE on squads
-- Using AFTER DELETE to avoid trigger protocol violation when propagating changes
CREATE TRIGGER trigger_delete_squad_conversation
  AFTER DELETE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_squad_conversation();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.delete_squad_conversation() TO authenticated;
