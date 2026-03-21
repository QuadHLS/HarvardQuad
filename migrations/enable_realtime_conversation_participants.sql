-- Enable Realtime for conversation_participants
-- Required for messaging: conversation list updates, participant changes

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
