-- Add colon between hours and minutes in meeting_time.
-- e.g. "0300 PM - 0415 PM" -> "03:00 PM - 04:15 PM", "1030 AM - 1145 AM" -> "10:30 AM - 11:45 AM"
-- Only updates rows where meeting_time looks like HHMM AM/PM (skips N/A and already formatted).

UPDATE public.courses
SET meeting_time = regexp_replace(
  meeting_time,
  '(\d{2})(\d{2})\s*(AM|PM)',
  '\1:\2 \3',
  'gi'
)
WHERE meeting_time ~ '\d{4}\s*(AM|PM)'
  AND meeting_time !~ '\d{2}:\d{2}\s*(AM|PM)';
