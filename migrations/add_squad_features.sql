-- Squad features: more categories, rules, post_count, pinned posts, request-to-join (private squads visible)

-- ── 1. More categories ──
ALTER TABLE public.squads DROP CONSTRAINT IF EXISTS squads_category_check;
ALTER TABLE public.squads ADD CONSTRAINT squads_category_check CHECK (
  category IN ('sports', 'social', 'academic', 'hobbies', 'creative', 'business', 'wellness')
);

-- Update create_squad to accept new categories
CREATE OR REPLACE FUNCTION public.create_squad(
  squad_name text,
  squad_info text,
  squad_category text,
  meeting_times text,
  squad_location text,
  privacy_type text DEFAULT 'open'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_id uuid;
  conv_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF squad_name IS NULL OR trim(squad_name) = '' THEN RAISE EXCEPTION 'Squad name cannot be empty'; END IF;
  IF squad_category IS NULL OR trim(squad_category) = '' THEN RAISE EXCEPTION 'Squad category cannot be empty'; END IF;
  IF squad_category NOT IN ('sports', 'social', 'academic', 'hobbies', 'creative', 'business', 'wellness') THEN
    RAISE EXCEPTION 'Invalid squad category';
  END IF;
  IF privacy_type NOT IN ('open', 'private') THEN RAISE EXCEPTION 'Privacy type must be open or private'; END IF;

  INSERT INTO conversations (name, type, created_by)
  VALUES (trim(squad_name), 'group', current_user_id)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, current_user_id, 'admin');

  INSERT INTO squads (name, info, category, meeting_times, location, type, created_by, conversation_id)
  VALUES (trim(squad_name), squad_info, trim(squad_category), meeting_times, squad_location, privacy_type, current_user_id, conv_id)
  RETURNING id INTO squad_id;

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (squad_id, current_user_id, 'admin');

  RETURN squad_id;
END;
$$;

-- ── 2. Squad rules column ──
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS rules text;

-- ── 3. Post count column + trigger ──
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS post_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_squad_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.source_type = 'squad' AND NEW.source_id IS NOT NULL THEN
    UPDATE squads SET post_count = post_count + 1 WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' AND OLD.source_type = 'squad' AND OLD.source_id IS NOT NULL THEN
    UPDATE squads SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.source_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_squad_post_count ON public.feed_posts;
CREATE TRIGGER trigger_update_squad_post_count
  AFTER INSERT OR DELETE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_squad_post_count();

-- Backfill post_count: single pass over feed_posts, one UPDATE (squads with no posts keep DEFAULT 0)
UPDATE public.squads s
SET post_count = ct.cnt
FROM (
  SELECT source_id AS squad_id, COUNT(*)::int AS cnt
  FROM feed_posts
  WHERE source_type = 'squad' AND source_id IS NOT NULL
  GROUP BY source_id
) ct
WHERE s.id = ct.squad_id;

-- ── 4. Squad pinned posts ──
CREATE TABLE IF NOT EXISTS public.feed_squad_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(squad_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_squad_pins_squad_id ON public.feed_squad_pins(squad_id);

ALTER TABLE public.feed_squad_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Squad members can view squad pins" ON public.feed_squad_pins;
CREATE POLICY "Squad members can view squad pins" ON public.feed_squad_pins FOR SELECT
USING (auth.uid() IS NOT NULL AND (
  public.is_squad_member(squad_id, auth.uid())
  OR EXISTS (SELECT 1 FROM squads WHERE id = squad_id AND type = 'open')
));

DROP POLICY IF EXISTS "Squad admins can pin posts" ON public.feed_squad_pins;
CREATE POLICY "Squad admins can pin posts" ON public.feed_squad_pins FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = pinned_by AND public.is_squad_admin(squad_id, auth.uid()));

DROP POLICY IF EXISTS "Squad admins can unpin posts" ON public.feed_squad_pins;
CREATE POLICY "Squad admins can unpin posts" ON public.feed_squad_pins FOR DELETE
USING (auth.uid() IS NOT NULL AND public.is_squad_admin(squad_id, auth.uid()));

-- ── 5. Request to join (private squads) ──
CREATE TABLE IF NOT EXISTS public.squad_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

-- UNIQUE(squad_id, user_id) covers squad_id lookups; partial index for common "pending" query
CREATE INDEX IF NOT EXISTS idx_squad_join_requests_user_id ON public.squad_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_join_requests_pending ON public.squad_join_requests(squad_id) WHERE status = 'pending';

ALTER TABLE public.squad_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON public.squad_join_requests;
CREATE POLICY "Users can view own requests" ON public.squad_join_requests FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view squad requests" ON public.squad_join_requests;
CREATE POLICY "Admins can view squad requests" ON public.squad_join_requests FOR SELECT
USING (auth.uid() IS NOT NULL AND public.is_squad_admin(squad_id, auth.uid()));

DROP POLICY IF EXISTS "Users can request to join private squad" ON public.squad_join_requests;
CREATE POLICY "Users can request to join private squad" ON public.squad_join_requests FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM squads s WHERE s.id = squad_id AND s.type = 'private')
  AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update request status" ON public.squad_join_requests;
CREATE POLICY "Admins can update request status" ON public.squad_join_requests FOR UPDATE
USING (public.is_squad_admin(squad_id, auth.uid()))
WITH CHECK (public.is_squad_admin(squad_id, auth.uid()));

-- ── 6. RLS: Private squads visible for discovery ──
DROP POLICY IF EXISTS "Users can view squads" ON public.squads;
CREATE POLICY "Users can view squads" ON public.squads FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ── 7. RLS: Squad posts only visible to members for private squads ──
DROP POLICY IF EXISTS "Feed posts: auth can read" ON public.feed_posts;
CREATE POLICY "Feed posts: auth can read" ON public.feed_posts FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    source_type = 'user'
    OR (source_type = 'squad' AND source_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM squads s WHERE s.id = source_id AND s.type = 'open')
      OR public.is_squad_member(source_id, auth.uid())
    ))
  )
);

-- ── 8. RPCs for request-to-join ──
CREATE OR REPLACE FUNCTION public.request_to_join_squad(squad_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  squad_type_val text;
  request_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT type INTO squad_type_val FROM squads WHERE id = squad_id_param;
  IF squad_type_val IS NULL THEN RAISE EXCEPTION 'Squad not found'; END IF;
  IF squad_type_val != 'private' THEN RAISE EXCEPTION 'Only private squads require a join request'; END IF;
  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = squad_id_param AND user_id = current_user_id) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  INSERT INTO squad_join_requests (squad_id, user_id, status)
  VALUES (squad_id_param, current_user_id, 'pending')
  ON CONFLICT (squad_id, user_id) DO UPDATE SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_squad_join_request(request_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT sjr.squad_id, sjr.user_id, s.conversation_id INTO r
  FROM squad_join_requests sjr
  JOIN squads s ON s.id = sjr.squad_id
  WHERE sjr.id = request_id_param AND sjr.status = 'pending';

  IF r.squad_id IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  IF NOT public.is_squad_admin(r.squad_id, auth.uid()) THEN RAISE EXCEPTION 'Only squad admins can approve'; END IF;

  UPDATE squad_join_requests SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id_param;

  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES (r.squad_id, r.user_id, 'member')
  ON CONFLICT (squad_id, user_id) DO NOTHING;

  IF r.conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (r.conversation_id, r.user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_squad_join_request(request_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;

  SELECT squad_id INTO r FROM squad_join_requests WHERE id = request_id_param AND status = 'pending';
  IF r.squad_id IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  IF NOT public.is_squad_admin(r.squad_id, auth.uid()) THEN RAISE EXCEPTION 'Only squad admins can deny'; END IF;

  UPDATE squad_join_requests
  SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_to_join_squad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_squad_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_squad_join_request(uuid) TO authenticated;
