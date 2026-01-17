-- Fix admin transfer when admin leaves a group
-- If the last admin leaves, automatically promote the oldest member (by joined_at) to admin
-- If only 1 person remains after someone leaves, automatically delete the group chat

CREATE OR REPLACE FUNCTION public.handle_participant_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_admins_count integer;
  remaining_participants_count integer;
  oldest_member_id uuid;
  conversation_type text;
BEGIN
  -- Only process for group conversations
  SELECT type INTO conversation_type
  FROM conversations
  WHERE id = OLD.conversation_id;
  
  IF conversation_type != 'group' THEN
    RETURN OLD;
  END IF;
  
  -- Check how many participants remain after this deletion
  SELECT COUNT(*) INTO remaining_participants_count
  FROM conversation_participants
  WHERE conversation_id = OLD.conversation_id;
  
  -- If only 1 person left (or 0), delete the group chat
  IF remaining_participants_count <= 1 THEN
    -- Delete the conversation (cascades to delete participants and messages)
    DELETE FROM conversations
    WHERE id = OLD.conversation_id;
    
    RETURN OLD;
  END IF;
  
  -- If the removed user was an admin, check if any admins remain
  IF OLD.role = 'admin' THEN
    SELECT COUNT(*) INTO remaining_admins_count
    FROM conversation_participants
    WHERE conversation_id = OLD.conversation_id
    AND role = 'admin';
    
    -- If no admins remain, promote the oldest member (by joined_at)
    IF remaining_admins_count = 0 THEN
      SELECT user_id INTO oldest_member_id
      FROM conversation_participants
      WHERE conversation_id = OLD.conversation_id
      ORDER BY joined_at ASC
      LIMIT 1;
      
      -- Promote the oldest member to admin
      IF oldest_member_id IS NOT NULL THEN
        UPDATE conversation_participants
        SET role = 'admin'
        WHERE conversation_id = OLD.conversation_id
        AND user_id = oldest_member_id;
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger to run after a participant is deleted
DROP TRIGGER IF EXISTS transfer_admin_on_leave ON conversation_participants;

CREATE TRIGGER transfer_admin_on_leave
  AFTER DELETE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_participant_removal();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_participant_removal() TO authenticated;
