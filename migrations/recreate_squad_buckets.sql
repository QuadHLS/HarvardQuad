-- Recreate squad storage buckets (run after deleting existing squad-avatars and squad-documents via Dashboard).
-- squad-avatars: avatar + banner images (path: {squad_id}/avatar.jpg, {squad_id}/banner.jpg)
-- squad-documents: squad documents/files

-- 1) Add cover_url to squads for banner (if not exists)
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS cover_url text;

COMMENT ON COLUMN public.squads.cover_url IS 'Storage path for squad banner/cover image. Path: squad_id/banner.jpg in squad-avatars bucket.';

-- 2) Create squad-avatars bucket (avatar + banner) - private, use signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-avatars', 'squad-avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3) Create squad-documents bucket - private, use signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-documents', 'squad-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4) Squad-avatars policies
DROP POLICY IF EXISTS "Squad avatars: anyone can view" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can upload" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can update" ON storage.objects;
DROP POLICY IF EXISTS "Squad avatars: admins can delete" ON storage.objects;

CREATE POLICY "Squad avatars: authenticated can view"
ON storage.objects FOR SELECT
USING (bucket_id = 'squad-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Squad avatars: admins can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'squad-avatars'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

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

CREATE POLICY "Squad avatars: admins can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'squad-avatars'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 5) Squad-documents policies
DROP POLICY IF EXISTS "Squad members can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own squad documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can update any squad document" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own squad documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can delete any squad document" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can update any squad document" ON storage.objects;

CREATE POLICY "Squad members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id::text = (storage.foldername(name))[1]
      AND sm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id::text = (storage.foldername(name))[1]
      AND s.type = 'open'
    )
  )
);

CREATE POLICY "Squad admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND public.is_squad_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Users can update their own squad documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      WHERE sd.file_path = name AND sd.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squad_documents sd
      JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
      WHERE sd.file_path = name AND sm.user_id = auth.uid() AND sm.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      WHERE sd.file_path = name AND sd.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squad_documents sd
      JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
      WHERE sd.file_path = name AND sm.user_id = auth.uid() AND sm.role = 'admin'
    )
  )
);

CREATE POLICY "Users can delete their own squad documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    WHERE sd.file_path = name AND sd.created_by = auth.uid()
  )
);

CREATE POLICY "Squad admins can delete any squad document"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
    WHERE sd.file_path = name AND sm.user_id = auth.uid() AND sm.role = 'admin'
  )
);
