-- Enable Realtime for the notifications table
-- Allows clients to subscribe to INSERT, UPDATE, DELETE for real-time notification updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
