-- RPC to get true post count for a user (for profile page).
-- Bypasses feed_posts RLS so the count reflects all posts by that user.
-- Caller must be authenticated.

CREATE OR REPLACE FUNCTION public.get_post_count_for_user(target_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT COUNT(*)::bigint INTO cnt
  FROM feed_posts
  WHERE author_id = target_user_id;

  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_count_for_user(uuid) TO authenticated;
