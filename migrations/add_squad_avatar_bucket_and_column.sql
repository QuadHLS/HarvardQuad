-- Squad avatar: storage bucket + squads.avatar_url so admins can set a picture for their squad.
-- Path pattern: {squad_id}/avatar (or avatar.jpg etc). Only squad admins can upload/update/delete.

-- 1) Column on squads to store the avatar URL (or path). App can store full public URL after upload.
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.squads.avatar_url IS 'Public URL (or storage path) for squad avatar image. Set by squad admin via squad-avatars bucket.';

-- 2) Create public bucket for squad avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-avatars', 'squad-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Drop existing policies for this bucket if re-running
DROP POLICY IF EXISTS "Squad avatars: anyone can view" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can upload" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can update" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can delete" ON storage.objects;

-- Anyone (including anon) can view squad avatars (public bucket)
CREATE POLICY "Squad avatars: anyone can view"
ON storage.objects FOR SELECT
USING (bucket_id = 'squad-avatars');

-- Only squad admins can upload; path must be under their squad folder: {squad_id}/...
CREATE POLICY "Squad avatars: admins can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'squad-avatars'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- Only squad admins can update their squad's avatar
CREATE POLICY "Squad avatars: admins can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'squad-avatars'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'squad-avatars'
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- Only squad admins can delete their squad's avatar
CREATE POLICY "Squad avatars: admins can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'squad-avatars'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);
