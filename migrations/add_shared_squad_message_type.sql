-- Add shared_squad message type and shared_squad_data JSONB for squad sharing to chats.

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

ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video', 'shared_post', 'shared_squad'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS shared_squad_data jsonb;

COMMENT ON COLUMN public.messages.shared_squad_data IS 'When message_type = shared_squad: { squad_id, squad_name, squad_type, member_count?, post_count?, category?, avatar_path?, created_at? }';
