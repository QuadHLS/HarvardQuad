-- Efficient RPC for total unread count (avoids fetching all conversations)
CREATE OR REPLACE FUNCTION public.get_total_unread_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  total bigint;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(cnt), 0) INTO total
  FROM (
    SELECT COUNT(*)::bigint as cnt
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = current_user_id
    WHERE m.sender_id != current_user_id
      AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
    GROUP BY m.conversation_id
  ) sub;

  RETURN COALESCE(total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_unread_count() TO authenticated;
