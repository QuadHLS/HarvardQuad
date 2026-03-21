-- Keep original inviter when someone else tries to re-invite. Second person gets an error (show as toast).

CREATE OR REPLACE FUNCTION public.invite_squad_member(squad_id_param uuid, invitee_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_type_val text;
  squad_name_val text;
  invite_id uuid;
  existing_inviter_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF invitee_id_param = current_user_id THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;

  SELECT s.type, s.name INTO squad_type_val, squad_name_val
  FROM squads s WHERE s.id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val NOT IN ('open', 'restricted', 'private') THEN RAISE EXCEPTION 'Invalid squad type'; END IF;

  IF squad_type_val = 'open' THEN
    IF NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
      RAISE EXCEPTION 'Only squad members can invite';
    END IF;
  ELSE
    IF NOT public.is_squad_admin(squad_id_param, current_user_id) THEN
      RAISE EXCEPTION 'Only squad admins can invite to restricted or private squads';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = invitee_id_param) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;

  -- Check for existing pending invite
  SELECT id, inviter_id INTO invite_id, existing_inviter_id
  FROM squad_invites
  WHERE squad_id = squad_id_param AND invitee_id = invitee_id_param AND status = 'pending';

  IF invite_id IS NOT NULL THEN
    IF existing_inviter_id != current_user_id THEN
      RAISE EXCEPTION 'This person has already been invited to this squad';
    END IF;
    -- Same person re-inviting: refresh created_at, no notification change
    UPDATE squad_invites SET created_at = now() WHERE id = invite_id;
    RETURN invite_id;
  END IF;

  -- No existing invite: insert
  INSERT INTO squad_invites (squad_id, inviter_id, invitee_id, status)
  VALUES (squad_id_param, current_user_id, invitee_id_param, 'pending')
  RETURNING id INTO invite_id;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (invitee_id_param, 'squad_invite', current_user_id, 'squad_invite', invite_id,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, '')));

  RETURN invite_id;
END;
$$;
