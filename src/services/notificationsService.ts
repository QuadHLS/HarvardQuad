import { supabase } from '@/lib/supabase';

const UUID_REGEX = /data-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/gi;

export type NotificationType =
  | 'like'
  | 'reply'
  | 'mention'
  | 'dm'
  | 'group_message'
  | 'follow'
  | 'event'
  | 'squad_invite'
  | 'invite_accepted'
  | 'invite_declined'
  | 'join_request'
  | 'join_request_approved'
  | 'join_request_denied'
  | 'squad_join'
  | 'friend_request'
  | 'friend_accepted';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  read_at: string | null;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationWithActor extends NotificationRow {
  actor?: {
    full_name: string | null;
    public_name: string | null;
    avatar_url: string | null;
  } | null;
}

/** Extract mentioned user IDs from Tiptap HTML content (data-id="uuid" in mention nodes). */
export function extractMentionIds(html: string | null | undefined): string[] {
  if (!html?.trim()) return [];
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(UUID_REGEX.source, 'gi');
  while ((m = re.exec(html)) !== null) {
    ids.add(m[1].toLowerCase());
  }
  return [...ids];
}

/** Chat alerts use Messages tab + conversation unread; excluded from notification inbox. */
const EXCLUDED_INBOX_TYPES: NotificationType[] = ['dm', 'group_message'];

export const NotificationsService = {
  async list(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<NotificationWithActor[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let q = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);
    for (const t of EXCLUDED_INBOX_TYPES) {
      q = q.not('type', 'eq', t);
    }
    const { data: rows, error } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!rows?.length) return [];

    const actorIds = [...new Set((rows as NotificationRow[]).map((r) => r.actor_id).filter(Boolean))] as string[];
    const profileMap = new Map<string, { full_name: string | null; public_name: string | null; avatar_url: string | null }>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, public_name, avatar_url')
        .in('id', actorIds);
      (profiles || []).forEach((p) => profileMap.set(p.id, { full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url }));
    }

    return (rows as NotificationRow[]).map((r) => ({
      ...r,
      actor: r.actor_id ? profileMap.get(r.actor_id) ?? null : null,
    }));
  },

  async getUnreadCount(userId: string): Promise<number> {
    let q = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    for (const t of EXCLUDED_INBOX_TYPES) {
      q = q.not('type', 'eq', t);
    }
    const { count, error } = await q;

    if (error) throw error;
    return count ?? 0;
  },

  async markRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async markReadMany(notificationIds: string[], userId: string): Promise<void> {
    if (notificationIds.length === 0) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) throw error;
  },

  async markAllRead(userId: string, types?: NotificationType[]): Promise<void> {
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (types?.length) {
      query = query.in('type', types);
    }

    const { error } = await query;
    if (error) throw error;
  },

  async delete(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async deleteMany(notificationIds: string[], userId: string): Promise<void> {
    if (notificationIds.length === 0) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) throw error;
  },

  /** Insert mention notifications. Excludes author. */
  async createMentionNotifications(
    targetId: string,
    authorId: string,
    content: string | null | undefined,
    snippet?: string,
    targetType: string = 'post'
  ): Promise<void> {
    const ids = extractMentionIds(content);
    if (ids.length === 0) return;

    const toNotify = ids.filter((id) => id !== authorId.toLowerCase());
    if (toNotify.length === 0) return;

    const rows = toNotify.map((user_id) => ({
      user_id,
      type: 'mention',
      actor_id: authorId,
      target_type: targetType,
      target_id: targetId,
      metadata: { snippet: snippet ?? '' },
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;
  },
};
