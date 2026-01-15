-- Add last_read_at column to conversation_participants table
-- This tracks when a user last viewed a conversation to calculate unread counts

ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at 
ON public.conversation_participants(conversation_id, user_id, last_read_at);

-- Update existing records to set last_read_at to joined_at for existing participants
UPDATE public.conversation_participants
SET last_read_at = joined_at
WHERE last_read_at IS NULL;
