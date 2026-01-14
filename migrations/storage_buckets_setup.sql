-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- This file contains the SQL for bucket policies only
-- 
-- Steps to create buckets:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create bucket: "message-images" (public)
-- 3. Create bucket: "message-files" (public)
--
-- Then run the policies below

-- Policy for message-images bucket
-- Users can upload images to conversations they're part of
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view message images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own message images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message images" ON storage.objects;

-- Policy: Authenticated users can view images
CREATE POLICY "Users can view message images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-images'
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can upload images (must be authenticated)
CREATE POLICY "Users can upload message images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own images
CREATE POLICY "Users can update their own message images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'message-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'message-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own message images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for message-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-files', 'message-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message files" ON storage.objects;

-- Policy: Authenticated users can view files
CREATE POLICY "Users can view message files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-files'
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can upload files (must be authenticated and in their own folder)
CREATE POLICY "Users can upload message files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own message files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'message-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'message-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own message files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
