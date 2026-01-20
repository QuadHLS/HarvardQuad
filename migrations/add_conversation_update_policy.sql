-- Add UPDATE policy for conversations table
-- Allows group members to update group name

CREATE POLICY "Users can update group conversations they participate in"
  ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND type = 'group'
    AND public.is_participant(id, auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND type = 'group'
    AND public.is_participant(id, auth.uid())
  );
