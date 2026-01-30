-- Add major column to profiles table
-- Stores academic major (e.g. Computer Science, Economics). class_year remains for Freshman/Sophomore/etc.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS major TEXT;
