-- Top 20 trending posts by weighted engagement (posts=1, hearts=1, replies=2). Starts at 48h (2 days), then 72h, ... up to 7 days
-- until at least 1 result. Same for everyone: campus, open squads, restricted with non_members_can_view_posts.
-- Private squads and restricted without post viewing never appear.

DROP FUNCTION IF EXISTS public.get_trending_posts();

CREATE FUNCTION public.get_trending_posts()
RETURNS TABLE(post_id uuid, total_hearts bigint, reply_count bigint, change_pct numeric, window_hours int)
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

  CREATE TEMP TABLE IF NOT EXISTS _trending_posts (post_id uuid, total_hearts bigint, reply_count bigint, change_pct numeric, window_hours int);
  TRUNCATE _trending_posts;

  FOR i IN 2..7 LOOP
    hour_offset := i * 24;
    TRUNCATE _trending_posts;

    INSERT INTO _trending_posts (post_id, total_hearts, reply_count, change_pct, window_hours)
    WITH eligible_posts AS (
      SELECT fp.id, fp.created_at
      FROM feed_posts fp
      LEFT JOIN squads s ON s.id = fp.source_id AND fp.source_type = 'squad'
      WHERE (
        fp.source_type = 'user'
        OR (fp.source_type = 'squad' AND s.type = 'open')
        OR (fp.source_type = 'squad' AND s.type = 'restricted' AND s.non_members_can_view_posts = true)
      )
    ),
    post_hearts AS (
      SELECT h.post_id, COUNT(*)::bigint AS cnt
      FROM feed_hearts h
      WHERE h.post_id IS NOT NULL
        AND h.created_at > now() - (hour_offset || ' hours')::interval
    GROUP BY h.post_id
    ),
    reply_hearts AS (
      SELECT fr.post_id, COUNT(*)::bigint AS cnt
      FROM feed_hearts h
      JOIN feed_replies fr ON fr.id = h.reply_id
      WHERE h.reply_id IS NOT NULL
        AND h.created_at > now() - (hour_offset || ' hours')::interval
    GROUP BY fr.post_id
  ),
  reply_counts AS (
      SELECT fr.post_id, COUNT(*)::bigint AS cnt
      FROM feed_replies fr
      WHERE fr.created_at > now() - (hour_offset || ' hours')::interval
    GROUP BY fr.post_id
  ),
  post_hearts_prev AS (
      SELECT h.post_id, COUNT(*)::bigint AS cnt
      FROM feed_hearts h
      WHERE h.post_id IS NOT NULL
        AND h.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND h.created_at <= now() - (hour_offset || ' hours')::interval
    GROUP BY h.post_id
  ),
  reply_hearts_prev AS (
      SELECT fr.post_id, COUNT(*)::bigint AS cnt
      FROM feed_hearts h
      JOIN feed_replies fr ON fr.id = h.reply_id
      WHERE h.reply_id IS NOT NULL
        AND h.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND h.created_at <= now() - (hour_offset || ' hours')::interval
    GROUP BY fr.post_id
  ),
  reply_counts_prev AS (
      SELECT fr.post_id, COUNT(*)::bigint AS cnt
      FROM feed_replies fr
      WHERE fr.created_at > now() - (2 * hour_offset || ' hours')::interval
        AND fr.created_at <= now() - (hour_offset || ' hours')::interval
    GROUP BY fr.post_id
  ),
  engagement AS (
      SELECT
        ep.id,
        (
          (CASE WHEN ep.created_at > now() - (hour_offset || ' hours')::interval THEN 1 ELSE 0 END)
          + COALESCE(ph.cnt, 0) + COALESCE(rh.cnt, 0) + (COALESCE(rc.cnt, 0) * 2)
        )::bigint AS score
    FROM eligible_posts ep
    LEFT JOIN post_hearts ph ON ph.post_id = ep.id
    LEFT JOIN reply_hearts rh ON rh.post_id = ep.id
    LEFT JOIN reply_counts rc ON rc.post_id = ep.id
    WHERE (
      ep.created_at > now() - (hour_offset || ' hours')::interval
      OR COALESCE(ph.cnt, 0) + COALESCE(rh.cnt, 0) + COALESCE(rc.cnt, 0) > 0
    )
  ),
  engagement_prev AS (
      SELECT
        ep.id,
        (
          (CASE WHEN ep.created_at > now() - (2 * hour_offset || ' hours')::interval AND ep.created_at <= now() - (hour_offset || ' hours')::interval THEN 1 ELSE 0 END)
          + COALESCE(php.cnt, 0) + COALESCE(rhp.cnt, 0) + (COALESCE(rcp.cnt, 0) * 2)
        )::bigint AS score
    FROM eligible_posts ep
    LEFT JOIN post_hearts_prev php ON php.post_id = ep.id
    LEFT JOIN reply_hearts_prev rhp ON rhp.post_id = ep.id
    LEFT JOIN reply_counts_prev rcp ON rcp.post_id = ep.id
  )
    SELECT e.id,
      (COALESCE(ph.cnt, 0) + COALESCE(rh.cnt, 0))::bigint,
      COALESCE(rc.cnt, 0)::bigint,
      CASE
        WHEN COALESCE(eprev.score, 0) = 0 AND COALESCE(e.score, 0) > 0 THEN 100
        WHEN COALESCE(eprev.score, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(e.score, 0)::numeric - eprev.score) / eprev.score) * 100, 1)
      END,
      hour_offset
    FROM engagement e
    LEFT JOIN engagement_prev eprev ON eprev.id = e.id
    LEFT JOIN post_hearts ph ON ph.post_id = e.id
    LEFT JOIN reply_hearts rh ON rh.post_id = e.id
    LEFT JOIN reply_counts rc ON rc.post_id = e.id
    ORDER BY (CASE WHEN COALESCE(eprev.score, 0) = 0 AND COALESCE(e.score, 0) > 0 THEN 100 WHEN COALESCE(eprev.score, 0) = 0 THEN 0 ELSE ROUND(((COALESCE(e.score, 0)::numeric - eprev.score) / eprev.score) * 100, 1) END) DESC NULLS LAST
    LIMIT 20;

    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RETURN QUERY SELECT _trending_posts.post_id, _trending_posts.total_hearts, _trending_posts.reply_count, _trending_posts.change_pct, _trending_posts.window_hours FROM _trending_posts;
      DROP TABLE _trending_posts;
      RETURN;
    END IF;
  END LOOP;

  DROP TABLE _trending_posts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_posts() TO authenticated;
