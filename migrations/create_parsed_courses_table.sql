-- Table for parsed course data (read-only for authenticated users)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_number TEXT,
  course_title TEXT,
  meeting_days TEXT,
  meeting_time TEXT,
  instructor TEXT,
  course_id TEXT,
  term TEXT,
  credits NUMERIC,
  course_description TEXT,
  distribution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_courses_course_id ON public.courses(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_term ON public.courses(term);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Auth: allow SELECT only for authenticated users (no INSERT/UPDATE/DELETE via anon/authenticated)
CREATE POLICY "Allow select for authenticated users"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (true);
