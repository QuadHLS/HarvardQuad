-- Rename squad type from 'private' to 'restricted'.
-- Same behavior: request-to-join, members-only content. Only the label changes.

-- 1. Migrate data
UPDATE public.squads SET type = 'restricted' WHERE type = 'private';

-- 2. Update constraint
ALTER TABLE public.squads DROP CONSTRAINT IF EXISTS squads_type_check;
ALTER TABLE public.squads ADD CONSTRAINT squads_type_check CHECK (type IN ('open', 'restricted'));

-- 3. create_squad: accept 'restricted' instead of 'private'
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
  IF privacy_type NOT IN ('open', 'restricted') THEN RAISE EXCEPTION 'Privacy type must be open or restricted'; END IF;

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

-- 4. join_squad: cannot join restricted squads directly
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

  IF squad_type_val = 'restricted' THEN
    RAISE EXCEPTION 'Cannot join restricted squad';
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

-- 5. request_to_join_squad: only restricted squads
CREATE OR REPLACE FUNCTION public.request_to_join_squad(squad_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_type_val text;
  request_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT type INTO squad_type_val FROM squads WHERE id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val != 'restricted' THEN RAISE EXCEPTION 'Only restricted squads require a join request'; END IF;
  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  INSERT INTO squad_join_requests (squad_id, user_id, status)
  VALUES (squad_id_param, current_user_id, 'pending')
  ON CONFLICT (squad_id, user_id) DO UPDATE SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

-- 6. squad_join_requests policy: restricted squads
DROP POLICY IF EXISTS "Users can request to join private squad" ON public.squad_join_requests;
CREATE POLICY "Users can request to join restricted squad" ON public.squad_join_requests FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id AND s.type = 'restricted')
  AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid())
);

