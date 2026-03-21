-- Allow inviter to cancel/unsend a squad invite. Removes invite and invitee's notification.

CREATE OR REPLACE FUNCTION public.cancel_squad_invite(invite_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  invitee_id_val uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT invitee_id INTO invitee_id_val
  FROM squad_invites
  WHERE id = invite_id_param
    AND inviter_id = current_user_id
    AND status = 'pending';

  IF invitee_id_val IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already responded';
  END IF;

  DELETE FROM squad_invites WHERE id = invite_id_param;

  DELETE FROM notifications
  WHERE user_id = invitee_id_val
    AND type = 'squad_invite'
    AND target_id = invite_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_squad_invite(uuid) TO authenticated;
