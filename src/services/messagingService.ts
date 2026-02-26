import { supabase } from '../lib/supabase';

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
    email: string | null;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  attachments?: MessageAttachment[];
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

export class MessagingService {
  // Get all conversations for the current user
  static async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get all conversations where user is a participant
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, joined_at, last_read_at')
      .eq('user_id', user.id);

    if (participantsError) throw participantsError;
    if (!participants || participants.length === 0) return [];

    const conversationIds = participants.map(p => p.conversation_id);

    // Get conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsError) throw conversationsError;
    if (!conversations || conversations.length === 0) return [];

    // Get last message for each conversation (batched with Promise.all for parallel execution)
    const lastMessagesResults = await Promise.all(
      conversations.map(async (conv) => {
        const { data: lastMessageData, error: lastMessageError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          conversationId: conv.id,
          lastMessage: lastMessageError ? null : lastMessageData,
        };
      })
    );

    // Create a map of conversation_id -> last message
    const lastMessagesByConvId = new Map<string, DbMessageRow & { sender?: DbProfileRow | null }>();
    lastMessagesResults.forEach((result) => {
      if (result.lastMessage) {
        lastMessagesByConvId.set(result.conversationId, result.lastMessage as DbMessageRow & { sender?: DbProfileRow | null });
      }
    });

    // Get all unique sender IDs from last messages
    const senderIds = Array.from(lastMessagesByConvId.values())
      .map((msg) => msg.sender_id)
      .filter((id): id is string => !!id);
    const uniqueSenderIds = [...new Set(senderIds)];

    // Batch fetch all sender profiles in one query
    const profilesBySenderId = new Map<string, DbProfileRow>();
    if (uniqueSenderIds.length > 0) {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', uniqueSenderIds);

      if (allProfiles) {
        (allProfiles as DbProfileRow[]).forEach((profile) => {
          profilesBySenderId.set(profile.id, profile);
        });
      }
    }

    // Attach sender profiles to last messages
    lastMessagesByConvId.forEach((lastMessage) => {
      if (lastMessage.sender_id) {
        const senderProfile = profilesBySenderId.get(lastMessage.sender_id);
        if (senderProfile) {
          lastMessage.sender = {
            full_name: senderProfile.full_name,
            email: senderProfile.email,
            avatar_url: senderProfile.avatar_url,
          };
        }
      }
    });

    // Get unread counts for all conversations (batched with Promise.all)
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = lastMessagesByConvId.get(conv.id);
        
        // Get unread count - messages created after last_read_at (or joined_at if never read)
        const participant = participants.find(p => p.conversation_id === conv.id) as DbParticipantRow | undefined;
        const lastReadAt = participant?.last_read_at ?? participant?.joined_at ?? '1970-01-01';
        
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id) // Don't count own messages
          .gt('created_at', lastReadAt);

        return {
          ...conv,
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        };
      })
    );

    return conversationsWithMessages as Conversation[];
  }

  // Get messages for a conversation
  static async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    // First get messages without nested select to avoid 406 errors
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (messagesError) throw messagesError;
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
      .select('id, full_name, email, avatar_url')
      .in('id', uniqueSenderIds);

    // Create a map of sender_id -> profile for quick lookup
    const profilesBySenderId = new Map<string, DbProfileRow>();
    if (allProfiles) {
      (allProfiles as DbProfileRow[]).forEach((profile) => {
        profilesBySenderId.set(profile.id, profile);
      });
    }

    // Build messages with profiles and attachments
    const messagesWithSenders = (messages as DbMessageRow[]).map((msg) => {
      const profile = profilesBySenderId.get(msg.sender_id) || null;

      let attachmentsWithUrls = attachmentsByMessageId.get(msg.id) || [];
      if (attachmentsWithUrls.length > 0) {
        attachmentsWithUrls = attachmentsWithUrls.map((att) => {
          const { data } = supabase.storage
            .from(att.storage_bucket)
            .getPublicUrl(att.file_path);

          return {
            ...att,
            url: data.publicUrl,
          };
        });
      }

      return {
        ...msg,
        sender: profile ? {
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        } : null,
        attachments: attachmentsWithUrls,
      };
    });

    return messagesWithSenders as Message[];
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
      .select('full_name, email, avatar_url')
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

  // Send a message with image
  static async sendImageMessage(
    conversationId: string,
    file: File,
    caption?: string
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload image to storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-images')
      .getPublicUrl(fileName);

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption || null,
        message_type: 'image',
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    // Create attachment record
    await supabase
      .from('message_attachments')
      .insert({
        message_id: message.id,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: 'message-images',
      });

    // Update conversation
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...message,
      attachments: [{
        id: '',
        message_id: message.id,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: 'message-images',
        created_at: new Date().toISOString(),
        url: publicUrl,
      }],
    } as Message;
  }

  // Send a message with file
  static async sendFileMessage(
    conversationId: string,
    file: File,
    caption?: string
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload file to storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-files')
      .getPublicUrl(fileName);

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption || null,
        message_type: 'file',
      })
      .select('*')
      .single();

    if (messageError) throw messageError;

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    // Create attachment record
    await supabase
      .from('message_attachments')
      .insert({
        message_id: message.id,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: 'message-files',
      });

    // Update conversation
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
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        storage_bucket: 'message-files',
        created_at: new Date().toISOString(),
        url: publicUrl,
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

  // Update group name
  static async updateGroupName(conversationId: string, newName: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is a participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      throw new Error('You are not a member of this group');
    }

    const { error } = await supabase
      .from('conversations')
      .update({ name: newName.trim() })
      .eq('id', conversationId)
      .eq('type', 'group');

    if (error) throw error;
  }

  // Mark messages as read for the current user in a conversation
  static async markAsRead(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();
    
    // Update last_read_at timestamp for this user in this conversation
    const { data, error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('Error marking messages as read:', error);
      console.error('Conversation ID:', conversationId, 'User ID:', user.id);
      throw error;
    }

    if (data && data.length === 0) {
      console.warn('No participant record found to update for conversation:', conversationId);
    }
  }

  // Get participants for a conversation
  static async getParticipants(conversationId: string): Promise<Participant[]> {
    // First get participants
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);

    if (participantsError) throw participantsError;
    if (!participants) return [];

    // Then get profiles for each participant
    const participantsWithProfiles = await Promise.all(
      participants.map(async (p) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', p.user_id)
          .single();

        return {
          ...p,
          profile: profile || null,
        };
      })
    );

    return participantsWithProfiles as Participant[];
  }

  // Search users by email or name
  static async searchUsers(query: string): Promise<{ data: Array<{ id: string; email: string; full_name: string | null; avatar_url: string | null }> | null; error: Error | null }> {
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
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

  // Remove participant from group chat (admin or self)
  static async removeParticipant(conversationId: string, userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Users can always remove themselves
    if (user.id === userId) {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return;
    }

    // For removing others: Check if target is an admin
    // Only admins can remove other admins
    const { data: targetParticipant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (targetParticipant?.role === 'admin') {
      // Only admins can remove other admins
      const { data: currentParticipant } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (currentParticipant?.role !== 'admin') {
        throw new Error('Only admins can remove other admins');
      }
    }

    // All members can remove non-admins (RLS policy will enforce this)
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Check if user is admin of a conversation
  static async isAdmin(conversationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    return participant?.role === 'admin';
  }

  // Delete a conversation (admin only, or creator for groups)
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

    // For groups, allow creator or admin to delete (regular groups have no admin; creator can delete)
    if (conversation.type === 'group') {
      const isAdmin = await this.isAdmin(conversationId);
      const isCreator = conversation.created_by === user.id;
      if (!isAdmin && !isCreator) {
        throw new Error('Only the creator or an admin can delete this group');
      }
    } else {
      // For DMs, check if user is the creator (though DMs typically shouldn't be deletable)
      if (conversation.created_by !== user.id) {
        throw new Error('Only the creator can delete this conversation');
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
          const message = payload.new as Message;
          // Fetch full message with attachments
          const { data: fullMessage } = await supabase
            .from('messages')
            .select('*, attachments:message_attachments(*)')
            .eq('id', message.id)
            .single();

          // Get sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', fullMessage.sender_id)
            .single();

          if (fullMessage) {
            // Get URLs for attachments
            let attachmentsWithUrls = fullMessage.attachments || [];
            if (attachmentsWithUrls.length > 0) {
              attachmentsWithUrls = await Promise.all(
                attachmentsWithUrls.map(async (att: DbAttachmentRow) => {
                  const { data } = supabase.storage
                    .from(att.storage_bucket)
                    .getPublicUrl(att.file_path);
                  return { ...att, url: data.publicUrl };
                })
              );
            }
            callback({ 
              ...fullMessage, 
              sender: senderProfile || null,
              attachments: attachmentsWithUrls 
            } as Message);
          }
        }
      )
      .subscribe();
  }

  // Unsubscribe from messages
  static unsubscribeFromMessages(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  // Subscribe to conversation updates (for conversation list)
  // Only listens to INSERT/DELETE on participant changes for the current user
  // (not UPDATE, which happens when marking messages as read and would cause constant reloads)
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
        () => {
          callback();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();
  }

  // Unsubscribe from conversations
  static unsubscribeFromConversations(channel: ReturnType<typeof supabase.channel>) {
    supabase.removeChannel(channel);
  }

  // Subscribe to participant changes for a specific conversation
  static subscribeToParticipants(
    conversationId: string,
    callback: () => void
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
        () => {
          callback();
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

  // Block a user
  static async blockUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('block_user', { target_user_id: userId });
    if (error) throw error;
    return data;
  }

  // Unblock a user
  static async unblockUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('unblock_user', { target_user_id: userId });
    if (error) throw error;
    return data;
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
