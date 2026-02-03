-- Add Instagram and LinkedIn URL columns to profiles table
ALTER TABLE profiles
ADD COLUMN instagram_url TEXT,
ADD COLUMN linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.instagram_url IS 'User Instagram profile URL';
COMMENT ON COLUMN profiles.linkedin_url IS 'User LinkedIn profile URL';
