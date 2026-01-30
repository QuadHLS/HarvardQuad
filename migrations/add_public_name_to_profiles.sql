-- Add public_name column to profiles table
-- Stores the name shown to other users (from onboarding)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS public_name TEXT;

-- Add onboarding_completed column to profiles table
-- Tracks whether the user has finished the onboarding flow

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
