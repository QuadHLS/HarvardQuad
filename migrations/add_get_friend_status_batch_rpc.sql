-- Batch friend status for multiple targets (replaces N calls to are_friends + get_friend_request_status).

CREATE OR REPLACE FUNCTION public.get_friend_status_batch(
  viewer_id uuid,
  target_ids uuid[]
)
RETURNS TABLE(target_id uuid, is_friend boolean, request_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_ids IS NULL OR array_length(target_ids, 1) IS NULL OR array_length(target_ids, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH targets AS (
    SELECT unnest(target_ids) AS tid
  ),
  friend_pairs AS (
    SELECT CASE WHEN f.user_id = viewer_id THEN f.friend_id ELSE f.user_id END AS tid
    FROM friends f
    WHERE (f.user_id = viewer_id AND f.friend_id = ANY(target_ids))
       OR (f.user_id = ANY(target_ids) AND f.friend_id = viewer_id)
  ),
  sent AS (
    SELECT fr.to_user_id AS tid
    FROM friend_requests fr
    WHERE fr.from_user_id = viewer_id AND fr.to_user_id = ANY(target_ids) AND fr.status = 'pending'
  ),
  received AS (
    SELECT fr.from_user_id AS tid
    FROM friend_requests fr
    WHERE fr.from_user_id = ANY(target_ids) AND fr.to_user_id = viewer_id AND fr.status = 'pending'
  )
  SELECT
    t.tid AS target_id,
    (fp.tid IS NOT NULL) AS is_friend,
    CASE
      WHEN s.tid IS NOT NULL THEN 'pending_sent'::text
      WHEN r.tid IS NOT NULL THEN 'pending_received'::text
      ELSE NULL::text
    END AS request_status
  FROM targets t
  LEFT JOIN friend_pairs fp ON fp.tid = t.tid
  LEFT JOIN sent s ON s.tid = t.tid
  LEFT JOIN received r ON r.tid = t.tid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_status_batch(uuid, uuid[]) TO authenticated;
