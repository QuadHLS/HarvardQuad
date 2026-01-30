-- Add RPC to add multiple members to a squad (and their group chat).
-- Used when creating a squad with initial invitees.
-- Caller must be an admin of the squad.

CREATE OR REPLACE FUNCTION public.add_squad_members(
  squad_id_param uuid,
  user_ids_param uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_conversation_id uuid;
  uid uuid;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Caller must be squad admin
  SELECT public.is_squad_admin(squad_id_param, current_user_id) INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only squad admins can add members';
  END IF;

  -- Squad must exist; get its conversation for group chat
  SELECT conversation_id INTO squad_conversation_id
  FROM squads
  WHERE id = squad_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  FOREACH uid IN ARRAY user_ids_param
  LOOP
    -- Skip self
    IF uid = current_user_id THEN
      CONTINUE;
    END IF;

    -- Add to squad_members if not already a member
    INSERT INTO squad_members (squad_id, user_id, role)
    SELECT squad_id_param, uid, 'member'
    WHERE NOT EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_id_param AND user_id = uid
    );

    -- Add to conversation (group chat) if squad has one and not already in it
    IF squad_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      SELECT squad_conversation_id, uid, 'member'
      WHERE NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = squad_conversation_id AND user_id = uid
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_squad_members(uuid, uuid[]) TO authenticated;
