-- Blocking and squads: prevent blocked users from joining squads where admin blocked them.
-- Applies to open, restricted, and private squads.

-- 1. join_squad (open squads): block if any squad admin has blocked the requester.
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
  squad_name_val text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT type, conversation_id, name INTO squad_type_val, squad_conversation_id, squad_name_val
  FROM squads WHERE id = squad_id_param;

  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;

  IF squad_type_val IN ('restricted', 'private') THEN
    RAISE EXCEPTION 'Cannot join this squad directly. Request to join (restricted) or wait for an invite (private).';
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
    RAISE EXCEPTION 'User is already a member of this squad';
  END IF;

  IF EXISTS (
    SELECT 1 FROM squad_members sm
    JOIN user_blocks ub ON ub.blocker_id = sm.user_id AND ub.blocked_id = current_user_id
    WHERE sm.squad_id = squad_id_param AND sm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'An admin has blocked you from this squad';
  END IF;

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id_param, current_user_id, 'member');

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  SELECT sm.user_id, 'squad_join', current_user_id, 'squad', squad_id_param,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, ''))
  FROM squad_members sm
  WHERE sm.squad_id = squad_id_param AND sm.role = 'admin';

  IF squad_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = squad_conversation_id AND user_id = current_user_id) THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES (squad_conversation_id, current_user_id, 'member');
    END IF;
  END IF;
END;
$$;

-- 2. request_to_join_squad (restricted): block if any squad admin has blocked the requester.
CREATE OR REPLACE FUNCTION public.request_to_join_squad(squad_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_type_val text;
  squad_name_val text;
  request_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT type, name INTO squad_type_val, squad_name_val FROM squads WHERE id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val != 'restricted' THEN RAISE EXCEPTION 'Only restricted squads require a join request'; END IF;
  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  IF EXISTS (
    SELECT 1 FROM squad_members sm
    JOIN user_blocks ub ON ub.blocker_id = sm.user_id AND ub.blocked_id = current_user_id
    WHERE sm.squad_id = squad_id_param AND sm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'An admin has blocked you from this squad';
  END IF;

  INSERT INTO squad_join_requests (squad_id, user_id, status)
  VALUES (squad_id_param, current_user_id, 'pending')
  ON CONFLICT (squad_id, user_id) DO UPDATE SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL
  RETURNING id INTO request_id;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  SELECT sm.user_id, 'join_request', current_user_id, 'join_request', request_id,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, ''))
  FROM squad_members sm
  WHERE sm.squad_id = squad_id_param AND sm.role = 'admin';

  RETURN request_id;
END;
$$;

-- 3. invite_squad_member: block if inviter has blocked invitee or invitee has blocked inviter.
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

  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = current_user_id AND blocked_id = invitee_id_param)
       OR (blocker_id = invitee_id_param AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot invite this user (blocked). Unblock in Settings.';
  END IF;

  SELECT id, inviter_id INTO invite_id, existing_inviter_id
  FROM squad_invites
  WHERE squad_id = squad_id_param AND invitee_id = invitee_id_param AND status = 'pending';

  IF invite_id IS NOT NULL THEN
    IF existing_inviter_id != current_user_id THEN
      RAISE EXCEPTION 'This person has already been invited to this squad';
    END IF;
    UPDATE squad_invites SET created_at = now() WHERE id = invite_id;
    RETURN invite_id;
  END IF;

  INSERT INTO squad_invites (squad_id, inviter_id, invitee_id, status)
  VALUES (squad_id_param, current_user_id, invitee_id_param, 'pending')
  RETURNING id INTO invite_id;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (invitee_id_param, 'squad_invite', current_user_id, 'squad_invite', invite_id,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, '')));

  RETURN invite_id;
END;
$$;

-- 4. accept_squad_invite: block if either user has blocked the other.
CREATE OR REPLACE FUNCTION public.accept_squad_invite(invite_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  conv_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT si.squad_id, si.inviter_id, si.invitee_id, s.name, s.conversation_id
  INTO r FROM squad_invites si JOIN squads s ON s.id = si.squad_id
  WHERE si.id = invite_id_param AND si.status = 'pending';

  IF r.squad_id IS NULL THEN RAISE EXCEPTION 'Invite not found or already responded'; END IF;
  IF r.invitee_id != auth.uid() THEN RAISE EXCEPTION 'Not your invite'; END IF;

  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = r.inviter_id AND blocked_id = r.invitee_id)
       OR (blocker_id = r.invitee_id AND blocked_id = r.inviter_id)
  ) THEN
    RAISE EXCEPTION 'Cannot accept this invite (blocked). Unblock in Settings.';
  END IF;

  UPDATE squad_invites SET status = 'accepted' WHERE id = invite_id_param;

  UPDATE squad_join_requests SET status = 'approved', reviewed_by = r.inviter_id, reviewed_at = now()
  WHERE squad_id = r.squad_id AND user_id = r.invitee_id AND status = 'pending';

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (r.squad_id, r.invitee_id, 'member')
  ON CONFLICT (squad_id, user_id) DO NOTHING;

  conv_id := r.conversation_id;
  IF conv_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (conv_id, r.invitee_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (r.inviter_id, 'invite_accepted', r.invitee_id, 'squad', r.squad_id,
    jsonb_build_object('squad_name', COALESCE(r.name, '')));
END;
$$;

-- 5. approve_squad_join_request: block if any squad admin has blocked the requester.
CREATE OR REPLACE FUNCTION public.approve_squad_join_request(request_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT sjr.squad_id, sjr.user_id, s.name, s.conversation_id INTO r
  FROM squad_join_requests sjr
  JOIN squads s ON s.id = sjr.squad_id
  WHERE sjr.id = request_id_param AND sjr.status = 'pending';

  IF r.squad_id IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  IF NOT public.is_squad_admin(r.squad_id, auth.uid()) THEN RAISE EXCEPTION 'Only squad admins can approve'; END IF;

  IF EXISTS (
    SELECT 1 FROM squad_members sm
    JOIN user_blocks ub ON ub.blocker_id = sm.user_id AND ub.blocked_id = r.user_id
    WHERE sm.squad_id = r.squad_id AND sm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot approve. Unblock this user in Settings.';
  END IF;

  UPDATE squad_join_requests SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id_param;

  UPDATE squad_invites SET status = 'accepted'
  WHERE squad_id = r.squad_id AND invitee_id = r.user_id AND status = 'pending';

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (r.squad_id, r.user_id, 'member')
  ON CONFLICT (squad_id, user_id) DO NOTHING;

  IF r.conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (r.conversation_id, r.user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (r.user_id, 'join_request_approved', auth.uid(), 'squad', r.squad_id,
    jsonb_build_object('squad_name', COALESCE(r.name, '')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_to_join_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_squad_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_squad_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_squad_join_request(uuid) TO authenticated;
