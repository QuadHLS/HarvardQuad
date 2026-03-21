-- Drop get_post_count_for_user; superseded by get_visible_post_count_for_user (handles both own and other profile).

DROP FUNCTION IF EXISTS public.get_post_count_for_user(uuid);
