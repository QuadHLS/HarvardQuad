-- Consolidate message-images and message-files into single message-media bucket
--
-- IMPORTANT: If you have existing message attachments, run a file copy script FIRST:
--   - Copy message-images/* to message-media/images/*
--   - Copy message-files/* to message-media/files/*
-- If you have no existing attachments, you can run this migration as-is.

-- 1. Create message-media bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-media', 'message-media', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for message-media
-- Path structure: {type}/{user_id}/{timestamp}_{filename} e.g. images/uid/123_photo.jpg
DROP POLICY IF EXISTS "Users can view message media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own message media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message media" ON storage.objects;

CREATE POLICY "Users can view message media"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload message media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update their own message media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own message media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Update message_attachments to point to message-media with path prefixes
-- ONLY run after copying files: images/* -> message-media/images/*, files/* -> message-media/files/*
UPDATE message_attachments
SET storage_bucket = 'message-media', file_path = 'images/' || file_path
WHERE storage_bucket = 'message-images';

UPDATE message_attachments
SET storage_bucket = 'message-media', file_path = 'files/' || file_path
WHERE storage_bucket = 'message-files';

-- 4. Add video support to messages schema (for future use)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'messages' AND tc.constraint_type = 'CHECK'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video'));

-- 5. Drop old bucket policies (optional - keeps old buckets readable until you delete them)
-- DROP POLICY IF EXISTS "Users can view message images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload message images" ON storage.objects;
-- ... etc. Uncomment when ready to remove old buckets.

-- After migration: Update MessagingService to use bucket 'message-media' with paths:
--   images: message-media/images/{user_id}/{timestamp}_{filename}
--   files:  message-media/files/{user_id}/{timestamp}_{filename}
