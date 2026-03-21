-- Add shared_post message type and shared_post_data JSONB for post sharing to chats.

-- 1. Drop existing message_type constraint
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.messages'::regclass
    AND contype = 'c'
    AND conname LIKE '%message_type%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- 2. Add new constraint with shared_post
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video', 'shared_post'));

-- 3. Add shared_post_data column (nullable; only set when message_type = 'shared_post')
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS shared_post_data jsonb;

COMMENT ON COLUMN public.messages.shared_post_data IS 'When message_type = shared_post: { post_id, post_title, author_name, source_type, source_id?, squad_name?, image_path? }';
