-- Top 20 trending squads by weighted engagement (posts=1, hearts=1, replies=2). Starts at 24h, expands to 48h, 72h, ... up to 7 days
-- until at least 1 result. Excludes private squads. SECURITY DEFINER for efficient aggregation.

CREATE INDEX IF NOT EXISTS idx_feed_hearts_created_at ON public.feed_hearts(created_at DESC);

DROP FUNCTION IF EXISTS public.get_trending_squads();

CREATE FUNCTION public.get_trending_squads()
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  avatar_url text,
  cover_url text,
  type text,
  is_joined boolean,
  join_request_status text,
  member_count bigint,
  post_count bigint,
  engagement_24h bigint,
  engagement_prev_24h bigint,
  change_pct numeric,
  window_hours int,
  posts_in_window bigint,
  replies_in_window bigint,
  hearts_in_window bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hour_offset int;
  row_count int;
  i int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _trending (
    id uuid, name text, category text, avatar_url text, cover_url text,
    type text, is_joined boolean, join_request_status text,
    member_count bigint, post_count bigint,
    engagement_24h bigint, engagement_prev_24h bigint, change_pct numeric,
    window_hours int, posts_in_window bigint, replies_in_window bigint, hearts_in_window bigint
  );
  TRUNCATE _trending;

  FOR i IN 1..7 LOOP
    hour_offset := i * 24;
    TRUNCATE _trending;

    INSERT INTO _trending
    WITH squad_posts AS (
      SELECT fp.id AS post_id, fp.source_id AS squad_id, fp.created_at
      FROM feed_posts fp
      JOIN squads s ON s.id = fp.source_id AND s.type != 'private'
      WHERE fp.source_type = 'squad' AND fp.source_id IS NOT NULL
    ),
    unified_cur AS (
      SELECT sp.squad_id, 1 AS contrib
      FROM squad_posts sp
      WHERE sp.created_at > now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 1 AS contrib
      FROM feed_hearts h
      JOIN squad_posts sp ON sp.post_id = h.post_id
      WHERE h.post_id IS NOT NULL AND h.created_at > now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 1 AS contrib
      FROM feed_hearts h
      JOIN feed_replies fr ON fr.id = h.reply_id
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE h.reply_id IS NOT NULL AND h.created_at > now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 2 AS contrib
      FROM feed_replies fr
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE fr.created_at > now() - (hour_offset || ' hours')::interval
    ),
    unified_prev AS (
      SELECT sp.squad_id, 1 AS contrib
      FROM squad_posts sp
      WHERE sp.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND sp.created_at <= now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 1 AS contrib
      FROM feed_hearts h
      JOIN squad_posts sp ON sp.post_id = h.post_id
      WHERE h.post_id IS NOT NULL
        AND h.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND h.created_at <= now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 1 AS contrib
      FROM feed_hearts h
      JOIN feed_replies fr ON fr.id = h.reply_id
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE h.reply_id IS NOT NULL
        AND h.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND h.created_at <= now() - (hour_offset || ' hours')::interval
      UNION ALL
      SELECT sp.squad_id, 2 AS contrib
      FROM feed_replies fr
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE fr.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND fr.created_at <= now() - (hour_offset || ' hours')::interval
    ),
    eng_cur AS (
      SELECT squad_id, SUM(contrib)::bigint AS score
      FROM unified_cur
      GROUP BY squad_id
    ),
    eng_prev AS (
      SELECT squad_id, SUM(contrib)::bigint AS score
      FROM unified_prev
      GROUP BY squad_id
    ),
    posts_win AS (
      SELECT squad_id, COUNT(*)::bigint AS c
      FROM squad_posts sp
      WHERE sp.created_at > now() - (hour_offset || ' hours')::interval
      GROUP BY squad_id
    ),
    replies_win AS (
      SELECT sp.squad_id, COUNT(*)::bigint AS c
      FROM feed_replies fr
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE fr.created_at > now() - (hour_offset || ' hours')::interval
      GROUP BY sp.squad_id
    ),
    hearts_win AS (
      SELECT sp.squad_id, COUNT(*)::bigint AS c
      FROM feed_hearts h
      JOIN squad_posts sp ON sp.post_id = h.post_id
      WHERE h.post_id IS NOT NULL AND h.created_at > now() - (hour_offset || ' hours')::interval
      GROUP BY sp.squad_id
    ),
    hearts_win_replies AS (
      SELECT sp.squad_id, COUNT(*)::bigint AS c
      FROM feed_hearts h
      JOIN feed_replies fr ON fr.id = h.reply_id
      JOIN squad_posts sp ON sp.post_id = fr.post_id
      WHERE h.reply_id IS NOT NULL AND h.created_at > now() - (hour_offset || ' hours')::interval
      GROUP BY sp.squad_id
    )
    SELECT
      s.id,
      s.name,
      s.category,
      s.avatar_url,
      s.cover_url,
      s.type,
      EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = s.id AND sm.user_id = auth.uid()),
      (SELECT sjr.status FROM squad_join_requests sjr WHERE sjr.squad_id = s.id AND sjr.user_id = auth.uid() LIMIT 1),
      COALESCE(mc.c, 0)::bigint,
      COALESCE(pc.c, 0)::bigint,
      COALESCE(ec.score, 0)::bigint,
      COALESCE(ep.score, 0)::bigint,
      CASE
        WHEN COALESCE(ep.score, 0) = 0 AND COALESCE(ec.score, 0) > 0 THEN 100
        WHEN COALESCE(ep.score, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(ec.score, 0)::numeric - ep.score) / ep.score) * 100, 1)
      END AS change_pct,
      hour_offset AS window_hours,
      COALESCE(pw.c, 0)::bigint AS posts_in_window,
      COALESCE(rw.c, 0)::bigint AS replies_in_window,
      (COALESCE(hw.c, 0) + COALESCE(hwr.c, 0))::bigint AS hearts_in_window
    FROM squads s
    LEFT JOIN (SELECT squad_id, COUNT(*)::bigint AS c FROM squad_members GROUP BY squad_id) mc ON mc.squad_id = s.id
    LEFT JOIN (
      SELECT source_id, COUNT(*)::bigint AS c FROM feed_posts
      WHERE source_type = 'squad' AND source_id IS NOT NULL GROUP BY source_id
    ) pc ON pc.source_id = s.id
    INNER JOIN eng_cur ec ON ec.squad_id = s.id
    LEFT JOIN eng_prev ep ON ep.squad_id = s.id
    LEFT JOIN posts_win pw ON pw.squad_id = s.id
    LEFT JOIN replies_win rw ON rw.squad_id = s.id
    LEFT JOIN hearts_win hw ON hw.squad_id = s.id
    LEFT JOIN hearts_win_replies hwr ON hwr.squad_id = s.id
    WHERE s.type != 'private'
    ORDER BY change_pct DESC NULLS LAST
    LIMIT 20;

    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RETURN QUERY SELECT * FROM _trending;
      DROP TABLE _trending;
      RETURN;
    END IF;
  END LOOP;

  DROP TABLE _trending;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_squads() TO authenticated;
