-- Fix All Remaining Performance Issues
-- This migration explicitly drops ALL policies and recreates them properly combined
-- Fixes: 3 RLS issues, 34 multiple permissive policies, 11 unused indexes, 1 missing FK index
--
-- IMPORTANT: This migration requires the helper functions from:
-- - fix_conversation_participants_rls.sql (is_participant, is_admin)
-- - fix_squad_members_rls_recursion.sql (is_squad_member, is_squad_admin)
-- Make sure those migrations have been run first!
--
-- Ensure helper functions have proper permissions
GRANT EXECUTE ON FUNCTION public.is_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_squad_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_squad_admin(uuid, uuid) TO authenticated;

-- ============================================
-- 1. FIX PROFILES TABLE - Drop ALL policies and recreate (3 RLS issues)
-- ============================================

-- Drop all profiles policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- Recreate with optimized (select auth.uid()) and combined SELECT policy
CREATE POLICY "Users can view profiles"
  ON public.profiles
  FOR SELECT
  USING (
    true
    OR (select auth.uid()) = id
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- 2. CONVERSATION_PARTICIPANTS - Combine ALL policies (8 policies -> fewer)
-- ============================================

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'conversation_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', r.policyname);
    END LOOP;
END $$;

-- Recreate with single SELECT policy
CREATE POLICY "Users can view conversation participants"
  ON public.conversation_participants
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND public.is_participant(conversation_id, (select auth.uid()))
  );

-- Combined INSERT policy: Users can add themselves OR admins can add participants
CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Users can add themselves
      (select auth.uid()) = user_id
      OR
      -- Admins can add participants (only to group chats)
      (
        public.is_admin(conversation_id, (select auth.uid()))
        AND EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = conversation_participants.conversation_id
          AND c.type = 'group'
        )
      )
    )
  );

-- Combined DELETE policy: Users can remove themselves OR admins can remove any participant
CREATE POLICY "Users can remove participants from conversations"
  ON public.conversation_participants
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Users can remove themselves
      (select auth.uid()) = user_id
      OR
      -- Admins can remove any participant
      public.is_admin(conversation_id, (select auth.uid()))
    )
  );

CREATE POLICY "Users can update their own participant record"
  ON public.conversation_participants
  FOR UPDATE
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

-- ============================================
-- 3. SQUADS - Combine SELECT policies (8 policies -> fewer)
-- ============================================

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'squads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.squads', r.policyname);
    END LOOP;
END $$;

-- Recreate with single SELECT policy
CREATE POLICY "Users can view squads"
  ON public.squads
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      type = 'open'
      OR public.is_squad_member(squads.id, (select auth.uid()))
    )
  );

CREATE POLICY "Users can create squads"
  ON public.squads
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = created_by);

-- Combined UPDATE policy: Users can update squads they created OR admins can update their squads
CREATE POLICY "Users can update squads"
  ON public.squads
  FOR UPDATE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squads.id, (select auth.uid()))
    )
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squads.id, (select auth.uid()))
    )
  );

-- Combined DELETE policy: Users can delete squads they created OR admins can delete their squads
CREATE POLICY "Users can delete squads"
  ON public.squads
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squads.id, (select auth.uid()))
    )
  );

-- ============================================
-- 4. SQUAD_MEMBERS - Combine SELECT policies (8 policies -> fewer)
-- ============================================

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'squad_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.squad_members', r.policyname);
    END LOOP;
END $$;

-- Recreate with single SELECT policy
CREATE POLICY "Users can view squad members"
  ON public.squad_members
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      public.is_squad_member(squad_members.squad_id, (select auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.squads
        WHERE squads.id = squad_members.squad_id
        AND squads.type = 'open'
      )
    )
  );

-- Combined INSERT policy: Users can join open squads OR admins can add members
CREATE POLICY "Users can add members to squads"
  ON public.squad_members
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Users can join open squads (add themselves)
      (
        (select auth.uid()) = user_id
        AND EXISTS (
          SELECT 1 FROM public.squads
          WHERE squads.id = squad_members.squad_id
          AND squads.type = 'open'
        )
      )
      OR
      -- Admins can add members to squads
      public.is_squad_admin(squad_members.squad_id, (select auth.uid()))
    )
  );

-- Combined DELETE policy: Users can leave squads OR admins can remove members
CREATE POLICY "Users can remove members from squads"
  ON public.squad_members
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Users can leave squads (remove themselves)
      (select auth.uid()) = user_id
      OR
      -- Admins can remove members from squads
      public.is_squad_admin(squad_members.squad_id, (select auth.uid()))
    )
  );

-- ============================================
-- 5. SQUAD_DOCUMENTS - Combine SELECT policies (8 policies -> fewer)
-- ============================================

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'squad_documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.squad_documents', r.policyname);
    END LOOP;
END $$;

-- Recreate with single SELECT policy
CREATE POLICY "Users can view squad documents"
  ON public.squad_documents
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      public.is_squad_member(squad_documents.squad_id, (select auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.squads
        WHERE squads.id = squad_documents.squad_id
        AND squads.type = 'open'
      )
    )
  );

CREATE POLICY "Members can add documents to squads"
  ON public.squad_documents
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = created_by
    AND public.is_squad_member(squad_documents.squad_id, (select auth.uid()))
  );

-- Combined UPDATE policy: Users can update documents they created OR admins can update any document
CREATE POLICY "Users can update squad documents"
  ON public.squad_documents
  FOR UPDATE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squad_documents.squad_id, (select auth.uid()))
    )
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squad_documents.squad_id, (select auth.uid()))
    )
  );

-- Combined DELETE policy: Users can delete documents they created OR admins can delete any document
CREATE POLICY "Users can delete squad documents"
  ON public.squad_documents
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = created_by
      OR public.is_squad_admin(squad_documents.squad_id, (select auth.uid()))
    )
  );

-- ============================================
-- 6. DROP REMAINING UNUSED INDEXES (11 issues)
-- ============================================

-- Drop unused indexes
DROP INDEX IF EXISTS public.idx_conversation_participants_user_conversation;
DROP INDEX IF EXISTS public.idx_conversation_participants_conversation_role;
DROP INDEX IF EXISTS public.idx_conversations_updated_at;
DROP INDEX IF EXISTS public.idx_messages_sender_created_at;
DROP INDEX IF EXISTS public.idx_messages_updated_at;
DROP INDEX IF EXISTS public.idx_profiles_updated_at;
DROP INDEX IF EXISTS public.idx_profiles_created_at;
DROP INDEX IF EXISTS public.idx_squad_documents_created_at;
DROP INDEX IF EXISTS public.idx_squad_documents_updated_at;
DROP INDEX IF EXISTS public.idx_squad_members_joined_at;
DROP INDEX IF EXISTS public.idx_squads_created_at;
DROP INDEX IF EXISTS public.idx_squads_updated_at;

-- ============================================
-- 7. ADD MISSING FOREIGN KEY INDEX (1 issue)
-- ============================================

-- Ensure all foreign keys have indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON public.squads(created_by);
CREATE INDEX IF NOT EXISTS idx_squads_conversation_id ON public.squads(conversation_id);

-- ============================================
-- ANALYZE TABLES
-- ============================================

ANALYZE public.profiles;
ANALYZE public.conversation_participants;
ANALYZE public.squads;
ANALYZE public.squad_members;
ANALYZE public.squad_documents;
