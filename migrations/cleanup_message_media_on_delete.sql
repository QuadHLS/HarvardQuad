-- When messages are deleted (e.g. via squad deletion cascading to conversation -> messages),
-- delete the associated files from storage (message-media bucket).
-- message_attachments has ON DELETE CASCADE from messages, so we must run BEFORE messages are deleted
-- to still have access to the attachment rows.

CREATE OR REPLACE FUNCTION public.cleanup_message_media_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  att RECORD;
BEGIN
  FOR att IN
    SELECT storage_bucket, file_path
    FROM public.message_attachments
    WHERE message_id = OLD.id
      AND storage_bucket IS NOT NULL
      AND file_path IS NOT NULL
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = att.storage_bucket
      AND name = att.file_path;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_message_media ON public.messages;
CREATE TRIGGER cleanup_message_media
  BEFORE DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_message_media_on_delete();

-- When squad_documents are deleted (e.g. via squad deletion CASCADE), delete files from storage.

CREATE OR REPLACE FUNCTION public.cleanup_squad_document_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF OLD.file_path IS NOT NULL AND OLD.storage_bucket IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = OLD.storage_bucket
      AND name = OLD.file_path;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_squad_document ON public.squad_documents;
CREATE TRIGGER cleanup_squad_document
  BEFORE DELETE ON public.squad_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_squad_document_on_delete();
