-- Restrict squad type to only public (open) and private.
-- Restrict squad category to only the 4 selectable: sports, social, academic, hobbies.

-- Migrate any existing 'locked' squads to 'open' (public)
UPDATE public.squads SET type = 'open' WHERE type = 'locked';

-- Drop the old type constraint (PostgreSQL names it squads_type_check for inline CHECK)
ALTER TABLE public.squads DROP CONSTRAINT IF EXISTS squads_type_check;

-- Only allow open (public) and private
ALTER TABLE public.squads
  ADD CONSTRAINT squads_type_check CHECK (type IN ('open', 'private'));

-- Ensure default stays valid
ALTER TABLE public.squads ALTER COLUMN type SET DEFAULT 'open';

-- Restrict category to the 4 selectable options only
-- First fix any existing invalid categories to 'social' as fallback (or leave as-is if already valid)
UPDATE public.squads
SET category = 'social'
WHERE category IS NULL OR trim(category) = ''
   OR category NOT IN ('sports', 'social', 'academic', 'hobbies');

ALTER TABLE public.squads
  DROP CONSTRAINT IF EXISTS squads_category_check;

ALTER TABLE public.squads
  ADD CONSTRAINT squads_category_check CHECK (
    category IN ('sports', 'social', 'academic', 'hobbies')
  );
