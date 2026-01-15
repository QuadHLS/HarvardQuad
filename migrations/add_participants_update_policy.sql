-- Add UPDATE policy for conversation_participants to allow users to update their own last_read_at

CREATE POLICY "Users can update their own participant record"
  ON public.conversation_participants
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
