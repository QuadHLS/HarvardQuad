-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations they created" ON public.conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can remove any participant" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can add participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can update attachments for their messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their messages" ON public.message_attachments;

-- Conversations RLS Policies
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Users can update conversations they created"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Users can delete conversations they created"
  ON public.conversations
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Conversation Participants RLS Policies
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from conversations"
  ON public.conversation_participants
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can remove any participant"
  ON public.conversation_participants
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
  );

CREATE POLICY "Admins can add participants"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.type = 'group'
    )
  );

-- Messages RLS Policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = sender_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = sender_id);

-- Message Attachments RLS Policies
CREATE POLICY "Users can view attachments in their conversations"
  ON public.message_attachments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments for their messages"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  );

-- Additional policies for message_attachments
CREATE POLICY "Users can update attachments for their messages"
  ON public.message_attachments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments for their messages"
  ON public.message_attachments
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  );
