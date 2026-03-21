-- Group chats: no admin role. Any participant can remove any other participant.

CREATE OR REPLACE FUNCTION public.can_remove_participant(conv_id uuid, current_user_uuid uuid, target_user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  conv_type text;
BEGIN
  -- Users can always remove themselves
  IF current_user_uuid = target_user_uuid THEN
    RETURN true;
  END IF;

  SELECT c.type INTO conv_type
  FROM public.conversations c
  WHERE c.id = conv_id;

  IF conv_type IS NULL OR conv_type != 'group' THEN
    RETURN false;
  END IF;

  -- Any participant can remove any other participant
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = current_user_uuid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_remove_participant(uuid, uuid, uuid) TO authenticated;
