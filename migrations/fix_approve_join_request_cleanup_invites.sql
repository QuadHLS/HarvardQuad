-- Fix: approve_squad_join_request should clean up any pending squad_invites for
-- the same user+squad, preventing stale invite rows.

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

  UPDATE squad_join_requests SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id_param;

  -- Clean up any pending invites for this user+squad
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
