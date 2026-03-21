-- Delete squad avatar and cover from storage when:
-- 1. Squad is deleted
-- 2. Avatar or cover is changed (replaced) - delete the old file

CREATE OR REPLACE FUNCTION public.cleanup_squad_avatar_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Squad deleted: remove avatar and cover
    IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url NOT LIKE 'http%' THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'squad-avatars' AND name = OLD.avatar_url;
    END IF;
    IF OLD.cover_url IS NOT NULL AND OLD.cover_url NOT LIKE 'http%' THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'squad-avatars' AND name = OLD.cover_url;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Avatar changed: remove old file
    IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
       AND OLD.avatar_url IS NOT NULL AND OLD.avatar_url NOT LIKE 'http%' THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'squad-avatars' AND name = OLD.avatar_url;
    END IF;
    -- Cover changed: remove old file
    IF OLD.cover_url IS DISTINCT FROM NEW.cover_url
       AND OLD.cover_url IS NOT NULL AND OLD.cover_url NOT LIKE 'http%' THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'squad-avatars' AND name = OLD.cover_url;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_squad_avatar_cover ON public.squads;
CREATE TRIGGER cleanup_squad_avatar_cover
  BEFORE DELETE OR UPDATE OF avatar_url, cover_url ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_squad_avatar_cover();
