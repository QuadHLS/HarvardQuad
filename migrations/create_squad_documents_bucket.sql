-- Create storage bucket for squad documents
-- This bucket will store files uploaded for squad documents
--
-- Note: The bucket may need to be created via Supabase Dashboard first:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create bucket: "squad-documents" (public)
-- 3. Then run this migration for the policies
--
-- Alternatively, the INSERT statement below will create it if possible

-- Create the bucket (public so documents can be accessed by squad members)
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad-documents', 'squad-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Squad members can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own squad documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can update any squad document" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own squad documents" ON storage.objects;
DROP POLICY IF EXISTS "Squad admins can delete any squad document" ON storage.objects;

-- Policy: Squad members can view documents
-- Users can view documents if they are members of the squad
CREATE POLICY "Squad members can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Extract squad_id from path (format: squad_id/file_name)
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id::text = (storage.foldername(name))[1]
      AND sm.user_id = auth.uid()
    )
    OR
    -- Also allow viewing if squad is open
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id::text = (storage.foldername(name))[1]
      AND s.type = 'open'
    )
  )
);

-- Policy: Squad members can upload documents
-- Users can upload documents if they are members of the squad
CREATE POLICY "Squad members can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_members sm
    WHERE sm.squad_id::text = (storage.foldername(name))[1]
    AND sm.user_id = auth.uid()
  )
);

-- Policy: Users can update their own documents
-- Users can update documents they created (check by file path containing their user_id or by squad_documents.created_by)
CREATE POLICY "Users can update their own squad documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if user created the document
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      WHERE sd.file_path = name
      AND sd.created_by = auth.uid()
    )
    OR
    -- Check if user is admin of the squad
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
      WHERE sd.file_path = name
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      WHERE sd.file_path = name
      AND sd.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.squad_documents sd
      JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
      WHERE sd.file_path = name
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  )
);

-- Policy: Squad admins can update any document in their squad
-- This is covered by the above policy, but we'll keep it for clarity
CREATE POLICY "Squad admins can update any squad document"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
    WHERE sd.file_path = name
    AND sm.user_id = auth.uid()
    AND sm.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
    WHERE sd.file_path = name
    AND sm.user_id = auth.uid()
    AND sm.role = 'admin'
  )
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own squad documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    WHERE sd.file_path = name
    AND sd.created_by = auth.uid()
  )
);

-- Policy: Squad admins can delete any document in their squad
CREATE POLICY "Squad admins can delete any squad document"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'squad-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.squad_documents sd
    JOIN public.squad_members sm ON sm.squad_id = sd.squad_id
    WHERE sd.file_path = name
    AND sm.user_id = auth.uid()
    AND sm.role = 'admin'
  )
);
