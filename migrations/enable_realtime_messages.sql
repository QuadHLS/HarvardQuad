-- Enable Realtime for the messages table
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events

-- First, check if the table is already in the publication
-- If not, add it

-- Add messages table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Note: If you get an error that the table is already in the publication,
-- you can ignore it - realtime is already enabled for messages.
