-- Fix infinite recursion in squad_members RLS policies
-- The issue is that policies are checking squad_members table which triggers the same policy check
-- We need to use a different approach that doesn't cause recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of squads they belong to" ON public.squad_members;
DROP POLICY IF EXISTS "Admins can add members to squads" ON public.squad_members;
DROP POLICY IF EXISTS "Admins can remove members from squads" ON public.squad_members;

-- Create helper functions that bypass RLS to check membership/admin status
-- These functions use SECURITY DEFINER to run with elevated privileges and bypass RLS
CREATE OR REPLACE FUNCTION public.is_squad_member(squad_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Bypass RLS by using SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = squad_id_param
    AND user_id = user_id_param
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_squad_admin(squad_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Bypass RLS by using SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = squad_id_param
    AND user_id = user_id_param
    AND role = 'admin'
  );
END;
$$;

-- Recreate policies using the functions to break recursion
CREATE POLICY "Users can view members of squads they belong to"
  ON public.squad_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_member(squad_members.squad_id, auth.uid())
  );

-- Admins can add members to squads (using function to avoid recursion)
CREATE POLICY "Admins can add members to squads"
  ON public.squad_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squad_members.squad_id, auth.uid())
  );

-- Admins can remove members from squads (using function to avoid recursion)
CREATE POLICY "Admins can remove members from squads"
  ON public.squad_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squad_members.squad_id, auth.uid())
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_squad_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_squad_admin(uuid, uuid) TO authenticated;

-- Also fix squads policies that query squad_members to use the helper functions
DROP POLICY IF EXISTS "Users can view squads they are members of" ON public.squads;
DROP POLICY IF EXISTS "Admins can update their squads" ON public.squads;
DROP POLICY IF EXISTS "Admins can delete their squads" ON public.squads;

-- Recreate squads policies using helper functions
CREATE POLICY "Users can view squads they are members of"
  ON public.squads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_member(squads.id, auth.uid())
  );

CREATE POLICY "Admins can update their squads"
  ON public.squads
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squads.id, auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squads.id, auth.uid())
  );

CREATE POLICY "Admins can delete their squads"
  ON public.squads
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squads.id, auth.uid())
  );

-- Fix squad_documents policies that query squad_members
DROP POLICY IF EXISTS "Users can view documents of squads they belong to" ON public.squad_documents;
DROP POLICY IF EXISTS "Members can add documents to squads" ON public.squad_documents;
DROP POLICY IF EXISTS "Admins can update any document in their squad" ON public.squad_documents;
DROP POLICY IF EXISTS "Admins can delete any document in their squad" ON public.squad_documents;

-- Recreate squad_documents policies using helper functions
CREATE POLICY "Users can view documents of squads they belong to"
  ON public.squad_documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_member(squad_documents.squad_id, auth.uid())
  );

CREATE POLICY "Members can add documents to squads"
  ON public.squad_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
    AND public.is_squad_member(squad_documents.squad_id, auth.uid())
  );

CREATE POLICY "Admins can update any document in their squad"
  ON public.squad_documents
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squad_documents.squad_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squad_documents.squad_id, auth.uid())
  );

CREATE POLICY "Admins can delete any document in their squad"
  ON public.squad_documents
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_squad_admin(squad_documents.squad_id, auth.uid())
  );
