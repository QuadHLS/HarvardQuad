-- RLS for feed_reports. Run after creating feed_reports table.
-- Users can insert their own reports; users can only read their own reports.
-- No UPDATE/DELETE (reports are immutable for audit trail).

ALTER TABLE public.feed_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feed reports: reporter can insert own" ON public.feed_reports;
CREATE POLICY "Feed reports: reporter can insert own"
ON public.feed_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Feed reports: reporter can read own" ON public.feed_reports;
CREATE POLICY "Feed reports: reporter can read own"
ON public.feed_reports FOR SELECT
USING (auth.uid() = reporter_id);
