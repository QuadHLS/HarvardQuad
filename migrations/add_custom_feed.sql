-- Custom feed: users can combine campus (user posts) + selected squads they're in.
-- One custom feed per user.

CREATE TABLE IF NOT EXISTS public.user_custom_feed (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  include_campus boolean NOT NULL DEFAULT true,
  squad_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.user_custom_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own custom feed"
  ON public.user_custom_feed FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_custom_feed_user_id ON public.user_custom_feed(user_id);

-- Get custom feed config for current user
CREATE OR REPLACE FUNCTION public.get_custom_feed_config()
RETURNS TABLE(include_campus boolean, squad_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ucf.include_campus, COALESCE(ucf.squad_ids, '{}')
  FROM user_custom_feed ucf
  WHERE ucf.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_custom_feed_config() TO authenticated;

-- Set custom feed config. squad_ids must only contain squads the user is in.
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
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Only allow squads the user is a member of
  IF squad_ids_param IS NULL OR array_length(squad_ids_param, 1) IS NULL THEN
    valid_squad_ids := '{}';
  ELSE
    SELECT ARRAY_AGG(sm.squad_id)
    INTO valid_squad_ids
    FROM squad_members sm
    WHERE sm.user_id = current_user_id
      AND sm.squad_id = ANY(squad_ids_param);
  END IF;

  INSERT INTO user_custom_feed (user_id, include_campus, squad_ids, updated_at)
  VALUES (current_user_id, include_campus_param, COALESCE(valid_squad_ids, '{}'), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    include_campus = include_campus_param,
    squad_ids = COALESCE(valid_squad_ids, '{}'),
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_custom_feed_config(boolean, uuid[]) TO authenticated;

-- List posts for custom feed. Returns feed_posts rows.
CREATE OR REPLACE FUNCTION public.list_custom_feed_posts(
  limit_val int DEFAULT 20,
  offset_val int DEFAULT 0
)
RETURNS SETOF public.feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  include_campus_val boolean;
  squad_ids_val uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT ucf.include_campus, COALESCE(ucf.squad_ids, '{}')
  INTO include_campus_val, squad_ids_val
  FROM user_custom_feed ucf
  WHERE ucf.user_id = current_user_id;

  -- Default: include campus if no row exists
  IF include_campus_val IS NULL THEN
    include_campus_val := true;
    squad_ids_val := '{}';
  END IF;

  RETURN QUERY
  SELECT fp.*
  FROM feed_posts fp
  WHERE (
    (fp.source_type = 'user' AND include_campus_val)
    OR (fp.source_type = 'squad' AND fp.source_id IS NOT NULL AND fp.source_id = ANY(squad_ids_val))
  )
  ORDER BY fp.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_custom_feed_posts(int, int) TO authenticated;
