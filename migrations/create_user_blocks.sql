-- Create user_blocks table for DM blocking functionality

-- Create the user_blocks table (minimal columns)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Create index for reverse lookups (checking if current user is blocked by someone)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all use auth.uid())

CREATE POLICY "users_view_own_blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "users_create_blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "users_delete_own_blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Function to block a user
CREATE OR REPLACE FUNCTION public.block_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), target_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  DELETE FROM user_blocks
  WHERE blocker_id = auth.uid() AND blocked_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to check if a block exists between two users
CREATE OR REPLACE FUNCTION public.is_user_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$;

-- Function to get blocked users list
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  blocked_id UUID,
  blocked_at TIMESTAMPTZ,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ub.blocked_id,
    ub.created_at,
    p.full_name,
    p.email,
    p.avatar_url
  FROM user_blocks ub
  LEFT JOIN profiles p ON p.id = ub.blocked_id
  WHERE ub.blocker_id = auth.uid()
  ORDER BY ub.created_at DESC;
END;
$$;

-- Function to check if can send message in a DM
CREATE OR REPLACE FUNCTION public.can_send_dm_message(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_user UUID;
  conv_type TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT type INTO conv_type FROM conversations WHERE id = conv_id;
  
  IF conv_type != 'dm' THEN
    RETURN TRUE;
  END IF;
  
  SELECT user_id INTO other_user
  FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id != auth.uid()
  LIMIT 1;
  
  IF other_user IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_user)
       OR (blocker_id = other_user AND blocked_id = auth.uid())
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_dm_message(UUID) TO authenticated;

-- Update create_dm_conversation to respect blocks
CREATE OR REPLACE FUNCTION public.create_dm_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
  existing_dm_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check for blocks
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: user is blocked';
  END IF;

  -- Check if DM already exists
  SELECT c.id INTO existing_dm_id
  FROM conversations c
  WHERE c.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
    AND (SELECT COUNT(*) FROM conversation_participants cp3 WHERE cp3.conversation_id = c.id) = 2
  LIMIT 1;

  IF existing_dm_id IS NOT NULL THEN
    RETURN existing_dm_id;
  END IF;

  -- Create new DM
  INSERT INTO conversations (type, created_by)
  VALUES ('dm', auth.uid())
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (conv_id, auth.uid(), 'admin'),
    (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;
