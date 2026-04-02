-- Chat unread + Messages tab are the source of truth for DMs / group chats.
-- Stop inserting notifications rows on each message (avoids dead rows and duplicate surfaces).

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Optional cleanup: remove legacy rows no longer shown in the notification inbox
DELETE FROM public.notifications
WHERE type IN ('dm', 'group_message');
