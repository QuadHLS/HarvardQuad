-- Store known_squad_ids / known_friend_ids at save time so we can auto-select NEW items in the config popup
-- without auto-updating the saved config (user must click Save).

-- Custom feed: add known_squad_ids (squads user had when they last saved)
ALTER TABLE public.user_custom_feed
  ADD COLUMN IF NOT EXISTS known_squad_ids uuid[] NOT NULL DEFAULT '{}';

-- Friends feed: add known_friend_ids (friends user had when they last saved)
ALTER TABLE public.user_friends_feed
  ADD COLUMN IF NOT EXISTS known_friend_ids uuid[] NOT NULL DEFAULT '{}';

-- get_custom_feed_config: return known_squad_ids
CREATE OR REPLACE FUNCTION public.get_custom_feed_config()
RETURNS TABLE(include_campus boolean, squad_ids uuid[], known_squad_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ucf.include_campus, COALESCE(ucf.squad_ids, '{}'), COALESCE(ucf.known_squad_ids, '{}')
  FROM user_custom_feed ucf
  WHERE ucf.user_id = auth.uid();
END;
$$;

-- set_custom_feed_config: store known_squad_ids from squad_members at save time
CREATE OR REPLACE FUNCTION public.set_custom_feed_config(
  include_campus_param boolean,
  squad_ids_param uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  valid_squad_ids uuid[];
  known_squad_ids_val uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF squad_ids_param IS NULL OR array_length(squad_ids_param, 1) IS NULL THEN
    valid_squad_ids := '{}';
  ELSE
    SELECT ARRAY_AGG(sm.squad_id)
    INTO valid_squad_ids
    FROM squad_members sm
    WHERE sm.user_id = current_user_id
      AND sm.squad_id = ANY(squad_ids_param);
  END IF;

  SELECT COALESCE(ARRAY_AGG(squad_id), '{}')
  INTO known_squad_ids_val
  FROM squad_members
  WHERE user_id = current_user_id;

  INSERT INTO user_custom_feed (user_id, include_campus, squad_ids, known_squad_ids, updated_at)
  VALUES (current_user_id, include_campus_param, COALESCE(valid_squad_ids, '{}'), COALESCE(known_squad_ids_val, '{}'), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    include_campus = include_campus_param,
    squad_ids = COALESCE(valid_squad_ids, '{}'),
    known_squad_ids = COALESCE(known_squad_ids_val, '{}'),
    updated_at = NOW();
END;
$$;

-- get_friends_feed_config: return known_friend_ids
CREATE OR REPLACE FUNCTION public.get_friends_feed_config()
RETURNS TABLE(friend_ids uuid[], known_friend_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT COALESCE(uff.friend_ids, '{}'), COALESCE(uff.known_friend_ids, '{}')
  FROM user_friends_feed uff
  WHERE uff.user_id = auth.uid();
END;
$$;

-- set_friends_feed_config: store known_friend_ids from friends table at save time
CREATE OR REPLACE FUNCTION public.set_friends_feed_config(
  friend_ids_param uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  valid_friend_ids uuid[];
  known_friend_ids_val uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF friend_ids_param IS NULL OR array_length(friend_ids_param, 1) IS NULL THEN
    valid_friend_ids := '{}';
  ELSE
    SELECT ARRAY_AGG(CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END)
    INTO valid_friend_ids
    FROM friends f
    WHERE (f.user_id = current_user_id OR f.friend_id = current_user_id)
      AND (CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END) = ANY(friend_ids_param);
  END IF;

  SELECT COALESCE(ARRAY_AGG(CASE WHEN f.user_id = current_user_id THEN f.friend_id ELSE f.user_id END), '{}')
  INTO known_friend_ids_val
  FROM friends f
  WHERE f.user_id = current_user_id OR f.friend_id = current_user_id;

  INSERT INTO user_friends_feed (user_id, friend_ids, known_friend_ids, updated_at)
  VALUES (current_user_id, COALESCE(valid_friend_ids, '{}'), COALESCE(known_friend_ids_val, '{}'), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    friend_ids = COALESCE(valid_friend_ids, '{}'),
    known_friend_ids = COALESCE(known_friend_ids_val, '{}'),
    updated_at = NOW();
END;
$$;
