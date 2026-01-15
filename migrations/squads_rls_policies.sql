-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all open squads" ON public.squads;
DROP POLICY IF EXISTS "Users can view squads they are members of" ON public.squads;
DROP POLICY IF EXISTS "Users can create squads" ON public.squads;
DROP POLICY IF EXISTS "Users can update squads they created" ON public.squads;
DROP POLICY IF EXISTS "Admins can update their squads" ON public.squads;
DROP POLICY IF EXISTS "Users can delete squads they created" ON public.squads;
DROP POLICY IF EXISTS "Admins can delete their squads" ON public.squads;

DROP POLICY IF EXISTS "Users can view members of squads they belong to" ON public.squad_members;
DROP POLICY IF EXISTS "Users can view members of open squads" ON public.squad_members;
DROP POLICY IF EXISTS "Users can join open squads" ON public.squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;
DROP POLICY IF EXISTS "Admins can add members to squads" ON public.squad_members;
DROP POLICY IF EXISTS "Admins can remove members from squads" ON public.squad_members;

DROP POLICY IF EXISTS "Users can view documents of squads they belong to" ON public.squad_documents;
DROP POLICY IF EXISTS "Users can view documents of open squads" ON public.squad_documents;
DROP POLICY IF EXISTS "Members can add documents to squads" ON public.squad_documents;
DROP POLICY IF EXISTS "Users can update documents they created" ON public.squad_documents;
DROP POLICY IF EXISTS "Admins can update any document in their squad" ON public.squad_documents;
DROP POLICY IF EXISTS "Users can delete documents they created" ON public.squad_documents;
DROP POLICY IF EXISTS "Admins can delete any document in their squad" ON public.squad_documents;

-- Squads RLS Policies
-- Users can view all open squads
CREATE POLICY "Users can view all open squads"
  ON public.squads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND type = 'open'
  );

-- Users can view locked/private squads they are members of
CREATE POLICY "Users can view squads they are members of"
  ON public.squads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_id = auth.uid()
    )
  );

-- Users can create squads
CREATE POLICY "Users can create squads"
  ON public.squads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Users can update squads they created
CREATE POLICY "Users can update squads they created"
  ON public.squads
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Admins can update their squads
CREATE POLICY "Admins can update their squads"
  ON public.squads
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  );

-- Users can delete squads they created
CREATE POLICY "Users can delete squads they created"
  ON public.squads
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Admins can delete their squads
CREATE POLICY "Admins can delete their squads"
  ON public.squads
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squads.id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  );

-- Squad Members RLS Policies
-- Users can view members of squads they belong to
CREATE POLICY "Users can view members of squads they belong to"
  ON public.squad_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
    )
  );

-- Users can view members of open squads
CREATE POLICY "Users can view members of open squads"
  ON public.squad_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_members.squad_id
      AND squads.type = 'open'
    )
  );

-- Users can join open squads (add themselves)
CREATE POLICY "Users can join open squads"
  ON public.squad_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_members.squad_id
      AND squads.type = 'open'
    )
  );

-- Users can leave squads (remove themselves)
CREATE POLICY "Users can leave squads"
  ON public.squad_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Admins can add members to squads
CREATE POLICY "Admins can add members to squads"
  ON public.squad_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  );

-- Admins can remove members from squads
CREATE POLICY "Admins can remove members from squads"
  ON public.squad_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = squad_members.squad_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  );

-- Squad Documents RLS Policies
-- Users can view documents of squads they belong to
CREATE POLICY "Users can view documents of squads they belong to"
  ON public.squad_documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squad_documents.squad_id
      AND squad_members.user_id = auth.uid()
    )
  );

-- Users can view documents of open squads
CREATE POLICY "Users can view documents of open squads"
  ON public.squad_documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squads
      WHERE squads.id = squad_documents.squad_id
      AND squads.type = 'open'
    )
  );

-- Members can add documents to squads
CREATE POLICY "Members can add documents to squads"
  ON public.squad_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squad_documents.squad_id
      AND squad_members.user_id = auth.uid()
    )
  );

-- Users can update documents they created
CREATE POLICY "Users can update documents they created"
  ON public.squad_documents
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Admins can update any document in their squad
CREATE POLICY "Admins can update any document in their squad"
  ON public.squad_documents
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squad_documents.squad_id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squad_documents.squad_id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  );

-- Users can delete documents they created
CREATE POLICY "Users can delete documents they created"
  ON public.squad_documents
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Admins can delete any document in their squad
CREATE POLICY "Admins can delete any document in their squad"
  ON public.squad_documents
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.squad_members
      WHERE squad_members.squad_id = squad_documents.squad_id
      AND squad_members.user_id = auth.uid()
      AND squad_members.role = 'admin'
    )
  );
