-- Only squad admins can add documents (members can no longer add).
DROP POLICY IF EXISTS "Members can add documents to squads" ON public.squad_documents;

CREATE POLICY "Admins can add documents to squads"
  ON public.squad_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
    AND public.is_squad_admin(squad_documents.squad_id, auth.uid())
  );
