-- Create squads table
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  info TEXT, -- Description/details about the squad
  category TEXT NOT NULL, -- e.g., 'sports', 'social', 'academic'
  meeting_times TEXT, -- Meeting schedule information
  location TEXT, -- Meeting location
  type TEXT NOT NULL DEFAULT 'open' CHECK (type IN ('open', 'locked', 'private')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL -- Link to auto-created group chat
);

-- Create squad_members table
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  UNIQUE(squad_id, user_id)
);

-- Create squad_documents table for pinned documents/URLs
CREATE TABLE IF NOT EXISTS public.squad_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Display name for the document
  file_path TEXT, -- Path in storage bucket (if stored in Supabase)
  file_url TEXT, -- Direct URL (if external or from storage)
  storage_bucket TEXT, -- Bucket name if stored in Supabase storage
  file_size BIGINT, -- File size in bytes
  mime_type TEXT, -- MIME type of the file
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON public.squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_documents_squad_id ON public.squad_documents(squad_id);
CREATE INDEX IF NOT EXISTS idx_squads_category ON public.squads(category);
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON public.squads(created_by);
CREATE INDEX IF NOT EXISTS idx_squads_conversation_id ON public.squads(conversation_id);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_squads_updated_at ON public.squads;
CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_squad_documents_updated_at ON public.squad_documents;
CREATE TRIGGER update_squad_documents_updated_at
  BEFORE UPDATE ON public.squad_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_documents ENABLE ROW LEVEL SECURITY;
