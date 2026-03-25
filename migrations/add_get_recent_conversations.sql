-- Recent conversations for search palette: same rows as get_all_conversations, limited and pre-sorted.

CREATE OR REPLACE FUNCTION public.get_recent_conversations(p_limit integer DEFAULT 9)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint,
  squad_id uuid,
  muted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM get_all_conversations() AS c
  ORDER BY COALESCE(c.last_message_created_at, c.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 9), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_conversations(integer) TO authenticated;
