-- Composite index for efficient "load older messages" pagination
-- Query: WHERE conversation_id = ? AND created_at < ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON public.messages(conversation_id, created_at DESC);
