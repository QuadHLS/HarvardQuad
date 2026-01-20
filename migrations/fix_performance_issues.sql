-- Fix Supabase Performance Advisor Issues
-- 1. Auth RLS Initialization Plan: wrap auth.uid() in (SELECT auth.uid())
-- 2. Multiple Permissive Policies: consolidate SELECT policies on conversations

-- ============================================
-- STEP 1: Fix user_blocks RLS policies (3 Auth RLS issues)
-- ============================================

DROP POLICY IF EXISTS "users_view_own_blocks" ON public.user_blocks;
CREATE POLICY "users_view_own_blocks"
  ON public.user_blocks FOR SELECT
  USING ((SELECT auth.uid()) = blocker_id);

DROP POLICY IF EXISTS "users_create_blocks" ON public.user_blocks;
CREATE POLICY "users_create_blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

DROP POLICY IF EXISTS "users_delete_own_blocks" ON public.user_blocks;
CREATE POLICY "users_delete_own_blocks"
  ON public.user_blocks FOR DELETE
  USING ((SELECT auth.uid()) = blocker_id);

-- ============================================
-- STEP 2: Fix conversations policies
-- Drop ALL existing SELECT policies and create ONE consolidated policy
-- This fixes both the Auth RLS issue and Multiple Permissive Policies issue
-- ============================================

-- Drop all possible SELECT policies on conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversation_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "Allow users to view their conversations" ON public.conversations;

-- Create ONE consolidated SELECT policy with proper auth.uid() wrapping
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND public.is_participant(id, (SELECT auth.uid()))
  );

-- Drop ALL existing UPDATE policies and create ONE consolidated policy
DROP POLICY IF EXISTS "Users can update group conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversation_update_policy" ON public.conversations;
DROP POLICY IF EXISTS "Allow users to update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.conversations;

-- Create ONE consolidated UPDATE policy
-- Allows: creator can update any conversation, participants can update group names
CREATE POLICY "Users can update conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      -- Creator can always update
      (SELECT auth.uid()) = created_by
      OR
      -- Participants can update group conversations
      (type = 'group' AND public.is_participant(id, (SELECT auth.uid())))
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      (SELECT auth.uid()) = created_by
      OR
      (type = 'group' AND public.is_participant(id, (SELECT auth.uid())))
    )
  );

-- Fix DELETE policy
DROP POLICY IF EXISTS "Users can delete conversations they created or are admin of" ON public.conversations;
CREATE POLICY "Users can delete conversations they created or are admin of"
  ON public.conversations
  FOR DELETE
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      (SELECT auth.uid()) = created_by
      OR (type = 'group' AND public.is_admin(id, (SELECT auth.uid())))
    )
  );

-- Fix INSERT policy if exists
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = created_by
  );
