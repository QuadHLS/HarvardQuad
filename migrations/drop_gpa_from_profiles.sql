-- Remove GPA column from profiles.
-- Run this in the Supabase SQL Editor after deploying the app changes.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gpa;
