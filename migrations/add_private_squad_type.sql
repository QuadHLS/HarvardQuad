-- Private squads: invite-only, admin-only invite, hidden from discover/search.
-- No request-to-join. Only members can see the squad.

-- 1. Add 'private' to type constraint
ALTER TABLE public.squads DROP CONSTRAINT IF EXISTS squads_type_check;
ALTER TABLE public.squads ADD CONSTRAINT squads_type_check CHECK (type IN ('open', 'restricted', 'private'));

-- 2. create_squad: accept 'private'
CREATE OR REPLACE FUNCTION public.create_squad(
  squad_name text,
  squad_info text,
  squad_category text,
  meeting_times text,
  squad_location text,
  privacy_type text DEFAULT 'open',
  enable_chat boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_id uuid;
  conv_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF squad_name IS NULL OR trim(squad_name) = '' THEN RAISE EXCEPTION 'Squad name cannot be empty'; END IF;
  IF squad_category IS NULL OR trim(squad_category) = '' THEN RAISE EXCEPTION 'Squad category cannot be empty'; END IF;
  IF squad_category NOT IN ('sports', 'social', 'academic', 'hobbies', 'creative', 'business', 'wellness') THEN
    RAISE EXCEPTION 'Invalid squad category';
  END IF;
  IF privacy_type NOT IN ('open', 'restricted', 'private') THEN RAISE EXCEPTION 'Privacy type must be open, restricted, or private'; END IF;

  IF enable_chat THEN
    INSERT INTO conversations (name, type, created_by)
    VALUES (trim(squad_name), 'group', current_user_id)
    RETURNING id INTO conv_id;

    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (conv_id, current_user_id, 'admin');
  END IF;

  INSERT INTO squads (name, info, category, meeting_times, location, type, created_by, conversation_id, chat_enabled)
  VALUES (trim(squad_name), squad_info, trim(squad_category), meeting_times, squad_location, privacy_type, current_user_id, conv_id, enable_chat)
  RETURNING id INTO squad_id;

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id, current_user_id, 'admin');

  RETURN squad_id;
END;
$$;

-- 3. join_squad: cannot join restricted or private directly
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
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT type, conversation_id INTO squad_type_val, squad_conversation_id
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

  IF squad_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = squad_conversation_id AND user_id = current_user_id) THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES (squad_conversation_id, current_user_id, 'member');
    END IF;
  END IF;
END;
$$;

-- 4. invite_squad_member: allow private squads (admin-only, same as restricted)
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

-- 5. get_squads_for_discover: exclude private squads (hidden from discover)
CREATE OR REPLACE FUNCTION public.get_squads_for_discover()
RETURNS TABLE(
  id uuid,
  name text,
  info text,
  category text,
  meeting_times text,
  location text,
  type text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  conversation_id uuid,
  chat_enabled boolean,
  avatar_url text,
  cover_url text,
  rules text,
  member_count bigint,
  post_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.info,
    s.category,
    s.meeting_times,
    s.location,
    s.type,
    s.created_by,
    s.created_at,
    s.updated_at,
    s.conversation_id,
    s.chat_enabled,
    s.avatar_url,
    s.cover_url,
    s.rules,
    COALESCE(mc.c, 0)::bigint AS member_count,
    COALESCE(pc.c, 0)::bigint AS post_count
  FROM squads s
  LEFT JOIN (
    SELECT squad_id, COUNT(*)::bigint AS c
    FROM squad_members
    GROUP BY squad_id
  ) mc ON mc.squad_id = s.id
  LEFT JOIN (
    SELECT source_id, COUNT(*)::bigint AS c
    FROM feed_posts
    WHERE source_type = 'squad' AND source_id IS NOT NULL
    GROUP BY source_id
  ) pc ON pc.source_id = s.id
  WHERE s.type != 'private'
    AND NOT EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = s.id AND sm.user_id = auth.uid()
    )
  ORDER BY s.created_at DESC;
END;
$$;

-- 6. squads RLS: private squads visible only to members
-- Open/restricted: visible to all. Private: visible only to members.
DROP POLICY IF EXISTS "Users can view squads they are members of" ON public.squads;
DROP POLICY IF EXISTS "Users can view squads" ON public.squads;
CREATE POLICY "Users can view squads"
  ON public.squads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      squads.type = 'open'
      OR squads.type = 'restricted'
      OR (squads.type = 'private' AND public.is_squad_member(squads.id, auth.uid()))
    )
  );

GRANT EXECUTE ON FUNCTION public.create_squad(text, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_squad_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_squads_for_discover() TO authenticated;
