import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';
import { getSignedUrl, getSignedUrls } from '@/lib/signedStorageUrl';

const RESUMABLE_THRESHOLD = 6 * 1024 * 1024; // 6MB - Supabase recommendation

export interface Conversation {
  id: string;
  name: string | null;
  type: 'dm' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: Participant[];
  last_message?: Message;
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
  profile?: {
    full_name: string | null;
    public_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface SharedPostData {
  post_id: string;
  post_title: string;
  author_name: string;
  author_avatar_url?: string | null;
  source_type: 'user' | 'squad';
  source_id: string | null;
  squad_name: string | null;
  image_path: string | null;
}

export interface SharedSquadData {
  squad_id: string;
  squad_name: string;
  squad_type: 'open' | 'restricted' | 'private';
  member_count?: number;
  post_count?: number;
  category?: string;
  avatar_path?: string | null;
  created_at?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'video' | 'shared_post' | 'shared_squad';
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string | null;
    public_name?: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  attachments?: MessageAttachment[];
  shared_post_data?: SharedPostData | null;
  shared_squad_data?: SharedSquadData | null;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  storage_bucket: string;
  created_at: string;
  url?: string; // Public URL for the file
}

interface DbMessageRow {
  id: string;
  sender_id: string;
  [key: string]: unknown;
}

interface DbProfileRow {
  id: string;
  full_name: string | null;
  public_name?: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface DbAttachmentRow {
  message_id: string;
  file_path: string;
  storage_bucket: string;
  [key: string]: unknown;
}

interface DbParticipantRow {
  conversation_id: string;
  joined_at: string;
  last_read_at?: string | null;
}

export interface DmConversationRow {
  id: string;
  name: string | null;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  other_user_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
  unread_count: number;
  /** Set when this is a squad group chat; UI uses squad layout and no settings. */
  squad_id?: string | null;
  /** When set, user has muted notifications for this conversation. */
  muted_at?: string | null;
}

export class MessagingService {
  // Get DM conversations only (single RPC, efficient). Run add_get_dm_conversations_rpc migration first.
  static async getDmConversations(): Promise<DmConversationRow[]> {
    const { data, error } = await supabase.rpc('get_dm_conversations');
    if (error) {
      if (error.code === '42883') return []; // function does not exist
      throw error;
    }
    return (data || []) as DmConversationRow[];
  }

  private static async attachGroupAvatarSignedUrls(rows: DmConversationRow[]): Promise<DmConversationRow[]> {
    const squadPaths = rows
      .filter((r) => r.type === 'group' && r.squad_id && r.other_avatar_url && !r.other_avatar_url.startsWith('http'))
      .map((r) => r.other_avatar_url!);
    const groupPaths = rows
      .filter((r) => r.type === 'group' && !r.squad_id && r.other_avatar_url && !r.other_avatar_url.startsWith('http'))
      .map((r) => r.other_avatar_url!);
    const [squadUrlMap, groupUrlMap] = await Promise.all([
      squadPaths.length > 0 ? getSignedUrls('squad-avatars', squadPaths) : Promise.resolve(new Map<string, string>()),
      groupPaths.length > 0 ? getSignedUrls('group-chat-avatars', groupPaths) : Promise.resolve(new Map<string, string>()),
    ]);
    return rows.map((r) => {
      if (r.type !== 'group' || !r.other_avatar_url) return r;
      const urlMap = r.squad_id ? squadUrlMap : groupUrlMap;
      return urlMap.has(r.other_avatar_url) ? { ...r, other_avatar_url: urlMap.get(r.other_avatar_url)! } : r;
    });
  }

  // Get all conversations (DMs + groups). Run add_get_all_conversations_rpc migration first.
  static async getAllConversations(): Promise<DmConversationRow[]> {
    const { data, error } = await supabase.rpc('get_all_conversations');
    if (error) {
      if (error.code === '42883') return this.getDmConversations(); // fallback to DMs only
      throw error;
    }
    const rows = (data || []) as DmConversationRow[];
    return this.attachGroupAvatarSignedUrls(rows);
  }

  /** Most recent conversations for global search; capped server-side. Run add_get_recent_conversations.sql first. */
  static async getRecentConversations(limit: number): Promise<DmConversationRow[]> {
    const capped = Math.max(1, Math.min(Math.floor(limit), 100));
    const { data, error } = await supabase.rpc('get_recent_conversations', { p_limit: capped });
    if (error) {
      if (error.code === '42883') {
        const all = await this.getAllConversations();
        return all.slice(0, capped);
      }
      throw error;
    }
    const rows = (data || []) as DmConversationRow[];
    return this.attachGroupAvatarSignedUrls(rows);
  }

  // Unread count for a single conversation (e.g. squad chat badge)
  static async getUnreadCountForConversation(conversationId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('last_read_at, joined_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    const lastReadAt = participant?.last_read_at ?? participant?.joined_at ?? '1970-01-01';
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .gt('created_at', lastReadAt);
    return count ?? 0;
  }

  // Total unread messages across all conversations (for sidebar badge)
  static async getTotalUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase.rpc('get_total_unread_count');
    if (!error && data != null) return Number(data);
    if (error?.code === '42883') {
      const convs = await this.getAllConversations();
      return convs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
    }
    return 0;
  }

  // Get messages for a conversation (most recent first from DB, then reversed for display)
  static async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    return this.getMessagesInternal(conversationId, limit);
  }

  // Get messages older than beforeCreatedAt (for infinite scroll)
  static async getMessagesBefore(
    conversationId: string,
    beforeCreatedAt: string,
    limit: number = 50
  ): Promise<Message[]> {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', beforeCreatedAt)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messagesError) throw messagesError;
    if (!messages || messages.length === 0) return [];

    return this.getMessagesInternal(conversationId, limit, messages as DbMessageRow[]);
  }

  private static async getMessagesInternal(
    conversationId: string,
    limit: number,
    messagesData?: DbMessageRow[]
  ): Promise<Message[]> {
    let messages: DbMessageRow[] | null = messagesData ?? null;
    if (!messages) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      messages = data as DbMessageRow[] | null;
    }
    if (!messages || messages.length === 0) return [];

    // Get attachments for all messages in one query
    const messageIds = (messages as DbMessageRow[]).map((m) => m.id);
    const { data: allAttachments } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', messageIds);

    // Group attachments by message_id
    const attachmentsByMessageId = new Map<string, (DbAttachmentRow & { url?: string })[]>();
    if (allAttachments) {
      (allAttachments as DbAttachmentRow[]).forEach((att) => {
        if (!attachmentsByMessageId.has(att.message_id)) {
          attachmentsByMessageId.set(att.message_id, []);
        }
        attachmentsByMessageId.get(att.message_id)!.push(att);
      });
    }

    // Get all unique sender IDs and fetch all profiles in one query
    const uniqueSenderIds = [...new Set((messages as DbMessageRow[]).map((m) => m.sender_id))];
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, public_name, email, avatar_url')
      .in('id', uniqueSenderIds);

    // Create a map of sender_id -> profile for quick lookup
    const profilesBySenderId = new Map<string, DbProfileRow>();
    if (allProfiles) {
      (allProfiles as DbProfileRow[]).forEach((profile) => {
        profilesBySenderId.set(profile.id, profile);
      });
    }

    // Batch signed URLs by bucket (1 API call per bucket vs 1 per attachment)
    const bucketToPaths = new Map<string, Array<{ att: DbAttachmentRow; path: string }>>();
    for (const msg of messages as DbMessageRow[]) {
      for (const att of attachmentsByMessageId.get(msg.id) || []) {
        if (!att.storage_bucket || !att.file_path) continue;
        const path = att.file_path;
        const list = bucketToPaths.get(att.storage_bucket) ?? [];
        list.push({ att, path });
        bucketToPaths.set(att.storage_bucket, list);
      }
    }
    const signedUrlMap = new Map<string, string>();
    for (const [bucket, items] of bucketToPaths) {
      const urls = await getSignedUrls(bucket, items.map((i) => i.path));
      for (const { att, path } of items) {
        const signed = urls.get(path) ?? urls.get(att.file_path);
        if (signed) signedUrlMap.set(`${att.message_id}:${att.file_path}`, signed);
      }
    }

    const messagesWithSenders = (messages as DbMessageRow[]).map((msg) => {
      const profile = profilesBySenderId.get(msg.sender_id) || null;
      const attachmentsWithUrls = (attachmentsByMessageId.get(msg.id) || []).map((att: DbAttachmentRow) => ({
        ...att,
        url: signedUrlMap.get(`${att.message_id}:${att.file_path}`) ?? att.file_path ?? '',
      }));
      return {
        ...msg,
        sender: profile ? { full_name: profile.full_name, public_name: profile.public_name, email: profile.email, avatar_url: profile.avatar_url } : null,
        attachments: attachmentsWithUrls,
      };
    });

    return (messagesWithSenders as Message[]).reverse();
  }

  // Send a shared post message
  static async sendSharedPostMessage(
    conversationId: string,
    sharedPostData: SharedPostData,
    caption?: string | null
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption?.trim() || null,
        message_type: 'shared_post',
        shared_post_data: sharedPostData,
      })
      .select('*')
      .single();

    if (error) throw error;

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, public_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      sender: senderProfile || null,
      shared_post_data: message.shared_post_data,
    } as Message;
  }

  static async sendSharedSquadMessage(
    conversationId: string,
    sharedSquadData: SharedSquadData,
    caption?: string | null
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption?.trim() || null,
        message_type: 'shared_squad',
        shared_squad_data: sharedSquadData,
      })
      .select('*')
      .single();

    if (error) throw error;

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, public_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      sender: senderProfile || null,
      shared_squad_data: message.shared_squad_data,
    } as Message;
  }

  // Send a text message
  static async sendTextMessage(conversationId: string, content: string): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: 'text',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, public_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      sender: senderProfile || null,
    } as Message;
  }

  static readonly MEDIA_BUCKET = 'message-media';

  // Send a message with image
  static async sendImageMessage(
    conversationId: string,
    file: File,
    caption?: string,
    onProgress?: (pct: number) => void
  ): Promise<Message> {
    return this.sendMediaMessage(conversationId, file, 'image', caption, onProgress);
  }

  // Send a message with file
  static async sendFileMessage(
    conversationId: string,
    file: File,
    caption?: string,
    onProgress?: (pct: number) => void
  ): Promise<Message> {
    return this.sendMediaMessage(conversationId, file, 'file', caption, onProgress);
  }

  private static uploadResumable(
    file: File,
    filePath: string,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const storageUrl = supabaseUrl.replace('.supabase.co', '.storage.supabase.co');
      const endpoint = `${storageUrl}/storage/v1/upload/resumable`;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) {
          reject(new Error('Not authenticated'));
          return;
        }

        const upload = new tus.Upload(file, {
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${session.access_token}` },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: this.MEDIA_BUCKET,
            objectName: filePath,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            if (bytesTotal > 0 && onProgress) {
              onProgress((bytesUploaded / bytesTotal) * 100);
            }
          },
          onSuccess: () => resolve(),
        });

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
          upload.start();
        });
      });
    });
  }

  // Send a message with video
  static async sendVideoMessage(
    conversationId: string,
    file: File,
    caption?: string,
    onProgress?: (pct: number) => void
  ): Promise<Message> {
    return this.sendMediaMessage(conversationId, file, 'video', caption, onProgress);
  }

  private static async sendMediaMessage(
    conversationId: string,
    file: File,
    messageType: 'image' | 'file' | 'video',
    caption?: string,
    onProgress?: (pct: number) => void
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const prefix = messageType === 'image' ? 'images' : messageType === 'video' ? 'videos' : 'files';
    // Supabase Storage rejects [ ] and some other chars in object keys
    const safeName = file.name.replace(/[\u005b\u005d{}|\\<>~`"#%^]/g, '-').replace(/-+/g, '-');
    const filePath = `${prefix}/${user.id}/${Date.now()}_${safeName}`;

    const useResumable = file.size > RESUMABLE_THRESHOLD;

    if (useResumable) {
      await this.uploadResumable(file, filePath, onProgress);
    } else {
      const { error: uploadError } = await supabase.storage
        .from(this.MEDIA_BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
    }

    const signedUrl = await getSignedUrl(this.MEDIA_BUCKET, filePath);

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption || null,
        message_type: messageType,
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, public_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    await supabase.from('message_attachments').insert({
      message_id: message.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      storage_bucket: this.MEDIA_BUCKET,
    });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      sender: senderProfile || null,
      attachments: [{
        id: '',
        message_id: message.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: this.MEDIA_BUCKET,
        created_at: new Date().toISOString(),
        url: signedUrl ?? filePath,
      }],
    } as Message;
  }

  // Create a direct message conversation
  static async createDM(otherUserId: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use the database function to create DM (bypasses RLS issues)
    const { data: conversationId, error: functionError } = await supabase
      .rpc('create_dm_conversation', { other_user_id: otherUserId });

    if (functionError) throw functionError;
    if (!conversationId) throw new Error('Failed to create DM conversation');

    // Fetch the created conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    return conversation as Conversation;
  }

  // Create a group chat
  static async createGroupChat(name: string, userIds: string[]): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use the database function to create group (bypasses RLS issues)
    const { data: conversationId, error: functionError } = await supabase
      .rpc('create_group_conversation', { 
        group_name: name,
        participant_user_ids: userIds
      });

    if (functionError) throw functionError;
    if (!conversationId) throw new Error('Failed to create group conversation');

    // Fetch the created conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    return conversation as Conversation;
  }

  static readonly GROUP_AVATAR_BUCKET = 'group-chat-avatars';

  // Update group name and/or avatar
  static async updateGroup(
    conversationId: string,
    updates: { name?: string; avatar_url?: string | null }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participant) throw new Error('You are not a member of this group');

    const payload: { name?: string; avatar_url?: string | null } = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase
      .from('conversations')
      .update(payload)
      .eq('id', conversationId)
      .eq('type', 'group');

    if (error) throw error;
  }

  static async updateGroupName(conversationId: string, newName: string): Promise<void> {
    return this.updateGroup(conversationId, { name: newName });
  }

  static async uploadGroupAvatar(conversationId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participant) throw new Error('You are not a member of this group');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${conversationId}/avatar.${ext}`;

    const { data: existing } = await supabase
      .from('conversations')
      .select('avatar_url')
      .eq('id', conversationId)
      .eq('type', 'group')
      .single();

    const oldPath = (existing as { avatar_url?: string | null } | null)?.avatar_url;
    if (oldPath && oldPath !== path) {
      await supabase.storage.from(this.GROUP_AVATAR_BUCKET).remove([oldPath]);
    }

    const { error } = await supabase.storage
      .from(this.GROUP_AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });

    if (error) throw error;

    await this.updateGroup(conversationId, { avatar_url: path });
    return path;
  }

  static async removeGroupAvatar(conversationId: string): Promise<void> {
    const { data } = await supabase
      .from('conversations')
      .select('avatar_url')
      .eq('id', conversationId)
      .eq('type', 'group')
      .single();

    const path = (data as { avatar_url?: string | null } | null)?.avatar_url;
    if (path && !path.startsWith('http')) {
      await supabase.storage.from(this.GROUP_AVATAR_BUCKET).remove([path]);
    }
    await this.updateGroup(conversationId, { avatar_url: null });
  }

  // Get other participant's last_read_at (for DM read receipts)
  static async getOtherParticipantLastReadAt(conversationId: string, otherUserId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', otherUserId)
      .maybeSingle();
    if (error || !data) return null;
    return data.last_read_at ?? null;
  }

  // Mark messages as read for the current user in a conversation
  static async markAsRead(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    
    // Update last_read_at timestamp for this user in this conversation
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking messages as read:', error);
      console.error('Conversation ID:', conversationId, 'User ID:', user.id);
      throw error;
    }

  }

  // Get participants for a conversation
  static async getParticipants(conversationId: string): Promise<Participant[]> {
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);

    if (participantsError) throw participantsError;
    if (!participants || participants.length === 0) return [];

    const userIds = participants.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, public_name, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, DbProfileRow>();
    if (profiles) {
      (profiles as DbProfileRow[]).forEach((p) => profileMap.set(p.id, p));
    }

    return participants.map((p) => {
      const profile = profileMap.get(p.user_id);
      return {
        ...p,
        profile: profile ? { full_name: profile.full_name, public_name: profile.public_name ?? null, email: profile.email, avatar_url: profile.avatar_url } : null,
      };
    }) as Participant[];
  }

  // Search users by email, full_name, or public_name (for New Message picker)
  static async searchUsers(query: string): Promise<{ data: Array<{ id: string; email: string; full_name: string | null; public_name: string | null; avatar_url: string | null }> | null; error: Error | null }> {
    if (!query.trim()) return { data: [], error: null };
    const searchTerm = `%${query.trim()}%`;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, public_name, avatar_url')
      .or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm},public_name.ilike.${searchTerm}`)
      .limit(10);

    return { data, error };
  }

  // Add participant to group chat (all members can add)
  static async addParticipant(conversationId: string, userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Prevent users from adding themselves
    if (user.id === userId) {
      throw new Error('You cannot add yourself to a group');
    }

    // Check if user is a participant (any role)
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      throw new Error('Only group members can add participants');
    }

    const { error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member',
      });

    if (error) throw error;
  }

  // Hide conversation from list (stay as participant; new messages bring it back)
  static async hideConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.rpc('hide_conversation', { conv_id: conversationId });
    if (error) throw error;
  }

  static async getHiddenConversations(): Promise<DmConversationRow[]> {
    const { data, error } = await supabase.rpc('get_hidden_conversations');
    if (error) {
      if (error.code === '42883') return [];
      throw error;
    }
    const rows = (data || []) as DmConversationRow[];
    const squadPaths = rows
      .filter((r) => r.type === 'group' && r.squad_id && r.other_avatar_url && !r.other_avatar_url.startsWith('http'))
      .map((r) => r.other_avatar_url!);
    const groupPaths = rows
      .filter((r) => r.type === 'group' && !r.squad_id && r.other_avatar_url && !r.other_avatar_url.startsWith('http'))
      .map((r) => r.other_avatar_url!);
    const [squadUrlMap, groupUrlMap] = await Promise.all([
      squadPaths.length > 0 ? getSignedUrls('squad-avatars', squadPaths) : Promise.resolve(new Map<string, string>()),
      groupPaths.length > 0 ? getSignedUrls('group-chat-avatars', groupPaths) : Promise.resolve(new Map<string, string>()),
    ]);
    return rows.map((r) => {
      if (r.type !== 'group' || !r.other_avatar_url) return r;
      const urlMap = r.squad_id ? squadUrlMap : groupUrlMap;
      return urlMap.has(r.other_avatar_url) ? { ...r, other_avatar_url: urlMap.get(r.other_avatar_url)! } : r;
    });
  }

  static async unhideConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.rpc('unhide_conversation', { conv_id: conversationId });
    if (error) throw error;
  }

  static async toggleMuteConversation(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_mute_conversation', { conv_id: conversationId });
    if (error) throw error;
    return data === true;
  }

  static async getMuteStateForConversation(conversationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('conversation_participants')
      .select('muted_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    return !!data?.muted_at;
  }

  // Remove participant from group chat (any participant can remove any other; self can always leave)
  static async removeParticipant(conversationId: string, userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { count } = await supabase
      .from('conversation_participants')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (count !== null && count <= 2) {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, attachments:message_attachments(*)')
        .eq('conversation_id', conversationId);

      if (messages?.length) {
        for (const message of messages as Array<{ attachments?: MessageAttachment[] }>) {
          if (message.attachments?.length) {
            for (const att of message.attachments) {
              try {
                await supabase.storage.from(att.storage_bucket).remove([att.file_path]);
              } catch {
                // Continue; file may already be gone
              }
            }
          }
        }
      }
    }

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Delete a conversation (creator only for groups; no admin role)
  static async deleteConversation(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get conversation to check type and creator
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('type, created_by')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;
    if (!conversation) throw new Error('Conversation not found');

    // For groups, only creator can delete
    if (conversation.type === 'group') {
      if (conversation.created_by !== user.id) {
        throw new Error('Only the creator can delete this group');
      }
    } else {
      // For DMs, check if user is the creator (though DMs typically shouldn't be deletable)
      if (conversation.created_by !== user.id) {
        throw new Error('Only the creator can delete this conversation');
      }
    }

    // Delete group avatar from storage
    if (conversation.type === 'group') {
      const { data: conv } = await supabase
        .from('conversations')
        .select('avatar_url')
        .eq('id', conversationId)
        .single();
      const avatarPath = (conv as { avatar_url?: string | null } | null)?.avatar_url;
      if (avatarPath && !avatarPath.startsWith('http')) {
        try {
          await supabase.storage.from(this.GROUP_AVATAR_BUCKET).remove([avatarPath]);
        } catch {
          // Continue
        }
      }
    }

    // Get all messages with attachments before deleting
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, attachments:message_attachments(*)')
      .eq('conversation_id', conversationId);

    if (messagesError) throw messagesError;

    // Delete all attachment files from storage
    if (messages && messages.length > 0) {
      for (const message of messages as Array<{ id: string; attachments?: MessageAttachment[] }>) {
        if (message.attachments && message.attachments.length > 0) {
          for (const att of message.attachments) {
            try {
              await supabase.storage
                .from(att.storage_bucket)
                .remove([att.file_path]);
            } catch (storageError) {
              // Log but don't fail - file might already be deleted
              console.warn(`Failed to delete file ${att.file_path} from ${att.storage_bucket}:`, storageError);
            }
          }
        }
      }
    }

    // Delete conversation (cascade will delete participants, messages, and attachments from DB)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  }

  // Delete a message
  static async deleteMessage(messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get message to verify ownership
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id, attachments:message_attachments(*)')
      .eq('id', messageId)
      .single();

    if (!message || message.sender_id !== user.id) {
      throw new Error('You can only delete your own messages');
    }

    // Delete attachments from storage
    if (message.attachments && message.attachments.length > 0) {
      for (const att of message.attachments) {
        await supabase.storage
          .from(att.storage_bucket)
          .remove([att.file_path]);
      }
    }

    // Delete message (cascade will delete attachments)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }

  // Subscribe to new messages in a conversation
  static subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const senderId = raw?.sender_id as string;
          if (!senderId) return;

          const messageType = raw?.message_type as string;
          let base = raw as Record<string, unknown>;
          let attachmentsWithUrls: (DbAttachmentRow & { url?: string })[] = [];

          if (messageType === 'image' || messageType === 'file' || messageType === 'video') {
            const { data: fullMessage } = await supabase
              .from('messages')
              .select('*, message_attachments(*)')
              .eq('id', raw.id)
              .single();
            base = (fullMessage || raw) as Record<string, unknown>;
            const attachments = base?.message_attachments as DbAttachmentRow[] | undefined;
            if (Array.isArray(attachments) && attachments.length > 0) {
              const byBucket = new Map<string, Array<{ att: DbAttachmentRow; path: string }>>();
              for (const att of attachments) {
                if (att.storage_bucket && att.file_path) {
                  const list = byBucket.get(att.storage_bucket) ?? [];
                  list.push({ att, path: att.file_path });
                  byBucket.set(att.storage_bucket, list);
                }
              }
              const urlMaps = await Promise.all(
                Array.from(byBucket.entries()).map(([bucket, items]) =>
                  getSignedUrls(bucket, items.map((i) => i.path))
                )
              );
              const pathToUrl = new Map<string, string>();
              let idx = 0;
              for (const [, items] of byBucket.entries()) {
                const map = urlMaps[idx++];
                for (const { att, path } of items) {
                  const url = map.get(path) ?? map.get(att.file_path);
                  if (url) pathToUrl.set(`${att.storage_bucket}:${path}`, url);
                }
              }
              attachmentsWithUrls = attachments.map((att: DbAttachmentRow) => ({
                ...att,
                url: (att.storage_bucket && att.file_path && pathToUrl.get(`${att.storage_bucket}:${att.file_path}`)) ?? att.file_path ?? '',
              }));
            }
          }

          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, public_name, email, avatar_url')
            .eq('id', senderId)
            .single();

          callback({ ...base, sender: senderProfile || null, attachments: attachmentsWithUrls } as unknown as Message);
        }
      )
      .subscribe();
  }

  // Subscribe to any new message (for conversation list refresh). Debounced.
  static subscribeToNewMessagesForListRefresh(callback: () => void): { unsubscribe: () => void } {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const debounced = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        if (!cancelled) callback();
      }, 400);
    };
    const channel = supabase
      .channel('messages:list-refresh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        debounced
      )
      .subscribe();
    return {
      unsubscribe: () => {
        cancelled = true;
        if (timeout) clearTimeout(timeout);
        supabase.removeChannel(channel);
      },
    };
  }

  // Unsubscribe from messages
  static unsubscribeFromMessages(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  // Subscribe to conversation updates (for conversation list)
  // INSERT/DELETE: new conversations or leaving. UPDATE: last_read_at when marking as read.
  static subscribeToConversations(
    userId: string,
    callback: () => void
  ) {
    return supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => callback()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => callback()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => callback()
      )
      .subscribe();
  }

  // Unsubscribe from conversations
  static unsubscribeFromConversations(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  // Subscribe to new messages (for unread badge refresh)
  static subscribeToNewMessages(callback: () => void) {
    return supabase
      .channel('messages:unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => callback())
      .subscribe();
  }

  // Subscribe to new messages in a specific conversation (for squad chat badge)
  static subscribeToConversationMessages(conversationId: string, callback: () => void) {
    return supabase
      .channel(`messages:conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => callback()
      )
      .subscribe();
  }

  static unsubscribeFromNewMessages(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  static unsubscribeFromConversationMessages(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  /** Payload from postgres_changes on `conversation_participants` (shape we use). */
  static subscribeToParticipants(
    conversationId: string,
    callback: (payload: {
      new?: { user_id?: string } | null
      old?: { user_id?: string } | null
    }) => void
  ) {
    return supabase
      .channel(`participants:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload as { new?: { user_id?: string } | null; old?: { user_id?: string } | null })
        }
      )
      .subscribe();
  }

  // Unsubscribe from participants
  static unsubscribeFromParticipants(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  /** Typing presence payload we track per user */
  static typingPresencePayload(userId: string, displayName: string, typing: boolean) {
    return { user_id: userId, display_name: displayName, typing };
  }

  /**
   * Subscribe to typing presence for a conversation. Returns { setTyping, unsubscribe }.
   * Call setTyping(true) when user is typing (debounced), setTyping(false) when they stop.
   * onTyping(users) is called with list of { id, name } for others currently typing (excluding currentUserId).
   */
  static subscribeToTypingPresence(
    conversationId: string,
    currentUserId: string,
    displayName: string,
    onTyping: (users: { id: string; name: string }[]) => void
  ): { setTyping: (typing: boolean) => void; unsubscribe: () => void } {
    const channelName = `typing:${conversationId}`;
    const channel = supabase.channel(channelName);

    const emitTypingState = () => {
      const state = channel.presenceState();
      const typingUsers: { id: string; name: string }[] = [];
      Object.values(state).forEach((presences) => {
        (presences || []).forEach((p: Record<string, unknown>) => {
          if (p.user_id && p.typing === true && p.user_id !== currentUserId) {
            typingUsers.push({
              id: p.user_id as string,
              name: (p.display_name as string) || 'Someone',
            });
          }
        });
      });
      onTyping(typingUsers);
    };

    channel
      .on('presence', { event: 'sync' }, () => emitTypingState())
      .on('presence', { event: 'join' }, () => emitTypingState())
      .on('presence', { event: 'leave' }, () => emitTypingState())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(MessagingService.typingPresencePayload(currentUserId, displayName, false));
        }
      });

    return {
      setTyping: (typing: boolean) => {
        channel.track(MessagingService.typingPresencePayload(currentUserId, displayName, typing));
      },
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  }

  // Check if a user is blocked (either direction)
  static async isUserBlocked(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data, error } = await supabase.rpc('is_user_blocked', { 
      user_a: user.id, 
      user_b: userId 
    });
    if (error) {
      console.error('Error checking block status:', error);
      return false;
    }
    return data;
  }

  // Get list of blocked users
  static async getBlockedUsers(): Promise<Array<{
    blocked_id: string;
    blocked_at: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>> {
    const { data, error } = await supabase.rpc('get_blocked_users');
    if (error) throw error;
    return data || [];
  }

  // Check if can send message in a DM (respects blocks)
  static async canSendDmMessage(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_send_dm_message', { 
      conv_id: conversationId 
    });
    if (error) {
      console.error('Error checking if can send DM:', error);
      return true; // Default to allowing in case of error
    }
    return data;
  }
}
