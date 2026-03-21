-- Squad invites for open squads: invitee gets notification, can accept/decline.
-- Accept/decline creates notification for inviter.

CREATE TABLE IF NOT EXISTS public.squad_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(squad_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_invites_invitee ON public.squad_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_squad_invites_squad ON public.squad_invites(squad_id);

ALTER TABLE public.squad_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitees can view own invites" ON public.squad_invites FOR SELECT
USING (auth.uid() = invitee_id);

CREATE POLICY "Inviters can view invites they sent" ON public.squad_invites FOR SELECT
USING (auth.uid() = inviter_id);

CREATE POLICY "Squad members can view squad invites" ON public.squad_invites FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_invites.squad_id AND sm.user_id = auth.uid())
);

-- invite_squad_member: open squads only; caller must be member; creates invite + notification
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
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF invitee_id_param = current_user_id THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;

  SELECT s.type, s.name INTO squad_type_val, squad_name_val
  FROM squads s WHERE s.id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val != 'open' THEN RAISE EXCEPTION 'Only open squads support invites'; END IF;

  IF NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
    RAISE EXCEPTION 'Only squad members can invite';
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = invitee_id_param) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;

  INSERT INTO squad_invites (squad_id, inviter_id, invitee_id, status)
  VALUES (squad_id_param, current_user_id, invitee_id_param, 'pending')
  ON CONFLICT (squad_id, invitee_id) DO UPDATE SET inviter_id = current_user_id, status = 'pending', created_at = now()
  RETURNING id INTO invite_id;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (invitee_id_param, 'squad_invite', current_user_id, 'squad_invite', invite_id,
    jsonb_build_object('squad_id', squad_id_param, 'squad_name', COALESCE(squad_name_val, '')));

  RETURN invite_id;
END;
$$;

-- accept_squad_invite: invitee accepts; adds to squad, notifies inviter
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

  UPDATE squad_invites SET status = 'accepted' WHERE id = invite_id_param;

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

-- decline_squad_invite: invitee declines; notifies inviter
CREATE OR REPLACE FUNCTION public.decline_squad_invite(invite_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT si.squad_id, si.inviter_id, si.invitee_id, s.name INTO r
  FROM squad_invites si JOIN squads s ON s.id = si.squad_id
  WHERE si.id = invite_id_param AND si.status = 'pending';

  IF r.squad_id IS NULL THEN RAISE EXCEPTION 'Invite not found or already responded'; END IF;
  IF r.invitee_id != auth.uid() THEN RAISE EXCEPTION 'Not your invite'; END IF;

  UPDATE squad_invites SET status = 'declined' WHERE id = invite_id_param;

  INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, metadata)
  VALUES (r.inviter_id, 'invite_declined', r.invitee_id, 'squad', r.squad_id,
    jsonb_build_object('squad_name', COALESCE(r.name, '')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_squad_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_squad_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_squad_invite(uuid) TO authenticated;
