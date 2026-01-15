-- Fix conversation delete policy to allow admins to delete group conversations
-- The current policy only allows creators to delete, but admins should also be able to delete groups

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete conversations they created" ON public.conversations;

-- Create new policy that allows:
-- 1. Creators to delete any conversation they created
-- 2. Admins to delete group conversations (even if they didn't create them)
CREATE POLICY "Users can delete conversations they created or are admin of"
  ON public.conversations
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Creator can always delete
      auth.uid() = created_by
      OR
      -- Admin can delete group conversations
      (
        type = 'group'
        AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = conversations.id
          AND cp.user_id = auth.uid()
          AND cp.role = 'admin'
        )
      )
    )
  );
