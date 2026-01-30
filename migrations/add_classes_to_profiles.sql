-- Add classes column to profiles table
-- Stores multiple classes data as JSONB array (e.g. [{ "course_id": "...", "course_title": "...", ... }])

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS classes JSONB DEFAULT '[]'::jsonb;

-- Optional: index for querying by course_id inside the array
CREATE INDEX IF NOT EXISTS idx_profiles_classes_gin ON public.profiles USING GIN (classes);
