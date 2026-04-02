-- get_friends_for_user: one row per friend profile.
-- When both (user_id, friend_id) edges exist for a pair, the previous query returned duplicates.
CREATE OR REPLACE FUNCTION public.get_friends_for_user(profile_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, public_name text, avatar_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.full_name, s.public_name, s.avatar_url
  FROM (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.full_name,
      p.public_name,
      p.avatar_url
    FROM friends f
    JOIN profiles p ON p.id = CASE WHEN f.user_id = profile_user_id THEN f.friend_id ELSE f.user_id END
    WHERE (f.user_id = profile_user_id OR f.friend_id = profile_user_id)
    ORDER BY p.id
  ) s
  ORDER BY s.full_name NULLS LAST, s.public_name NULLS LAST;
END;
$function$;
