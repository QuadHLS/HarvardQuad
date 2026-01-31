-- Feed post images storage bucket. Run after creating the bucket in Dashboard if needed.
-- Bucket: feed-post-images (public so post images can be displayed).
-- Path pattern: {user_id}/{post_id}/{filename} so only post author can upload/update/delete.

INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-post-images', 'feed-post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (by name, scope to this bucket in policy)
DROP POLICY IF EXISTS "Feed post images: auth can view" ON storage.objects;
DROP POLICY IF EXISTS "Feed post images: auth can upload own" ON storage.objects;
DROP POLICY IF EXISTS "Feed post images: auth can update own" ON storage.objects;
DROP POLICY IF EXISTS "Feed post images: auth can delete own" ON storage.objects;

-- Authenticated users can view all post images
CREATE POLICY "Feed post images: auth can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feed-post-images'
  AND auth.uid() IS NOT NULL
);

-- Users can upload only to their own folder: {user_id}/...
CREATE POLICY "Feed post images: auth can upload own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feed-post-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update only their own files
CREATE POLICY "Feed post images: auth can update own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'feed-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'feed-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete only their own files
CREATE POLICY "Feed post images: auth can delete own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'feed-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
