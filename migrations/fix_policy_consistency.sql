-- Fix policy consistency: Use helper functions instead of direct queries
-- This ensures all policies use SECURITY DEFINER functions for consistency and safety

-- ============================================
-- 1. Fix conversations SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND public.is_participant(conversations.id, (select auth.uid()))
  );

-- ============================================
-- 2. Fix conversations DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can delete conversations they created or are admin of" ON public.conversations;

CREATE POLICY "Users can delete conversations they created or are admin of"
  ON public.conversations
  FOR DELETE
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      -- Creator can always delete
      (select auth.uid()) = created_by
      OR
      -- Admin can delete group conversations
      (
        type = 'group'
        AND public.is_admin(conversations.id, (select auth.uid()))
      )
    )
  );

-- ============================================
-- 3. Fix messages SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    AND public.is_participant(messages.conversation_id, (select auth.uid()))
  );

-- ============================================
-- 4. Fix messages INSERT policy
-- ============================================
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = sender_id
    AND public.is_participant(messages.conversation_id, (select auth.uid()))
  );
