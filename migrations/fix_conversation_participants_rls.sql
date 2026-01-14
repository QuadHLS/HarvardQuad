-- Fix infinite recursion in conversation_participants RLS policies
-- The issue is that policies are checking the same table they're protecting

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can remove any participant" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can add participants" ON public.conversation_participants;

-- Create a security definer function to check if user is a participant
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_participant(conv_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = user_uuid
  );
$$;

-- Create a security definer function to check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(conv_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = user_uuid
    AND role = 'admin'
  );
$$;

-- Recreate SELECT policy using the function (avoids recursion)
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_participant(conversation_id, auth.uid())
  );

-- Recreate DELETE policy for admins using the function
CREATE POLICY "Admins can remove any participant"
  ON public.conversation_participants
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_admin(conversation_id, auth.uid())
  );

-- Recreate INSERT policy for admins using the function
CREATE POLICY "Admins can add participants"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_admin(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.type = 'group'
    )
  );
