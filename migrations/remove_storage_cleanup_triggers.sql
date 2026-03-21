-- Remove triggers that delete from storage.objects directly.
-- Supabase blocks direct SQL deletion from storage tables; use Storage API instead.
--
-- App handles all storage cleanup via Storage API:
--   - Squad avatar/cover change/remove: EditSquadFormContent -> removeSquadAvatarOrCover
--   - Squad document delete: SquadsService.deleteSquadDocument
--   - Squad delete (cascade): SquadsService.deleteSquad (avatar, cover, docs, conv avatar, msg attachments)
--   - Message delete: MessagingService.deleteMessage
--   - Conversation delete: MessagingService.deleteConversation
--   - Group avatar change/remove: MessagingService.uploadGroupAvatar, removeGroupAvatar

DROP TRIGGER IF EXISTS cleanup_message_media ON public.messages;
DROP FUNCTION IF EXISTS public.cleanup_message_media_on_delete();

DROP TRIGGER IF EXISTS cleanup_squad_document ON public.squad_documents;
DROP FUNCTION IF EXISTS public.cleanup_squad_document_on_delete();

DROP TRIGGER IF EXISTS cleanup_group_avatar ON public.conversations;
DROP FUNCTION IF EXISTS public.cleanup_group_avatar_on_delete();
