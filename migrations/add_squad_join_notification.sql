-- Notify squad admins when someone joins an open squad.

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

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id_param, current_user_id, 'member');

  -- Notify all admins that someone joined
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
