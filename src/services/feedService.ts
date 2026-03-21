import { supabase } from '../lib/supabase';
import { getSignedUrl, getSignedUrls } from '@/lib/signedStorageUrl';
import { NotificationsService } from './notificationsService';

export type PostType = 'text_pic' | 'social_url' | 'poll' | 'post';
export type SourceType = 'user' | 'squad';

export interface FeedPostRow {
  id: string;
  author_id: string;
  source_type: SourceType;
  source_id: string | null;
  post_type: PostType;
  title: string;
  content: string | null;
  image_path: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
  override_author_name?: string | null;
}

export interface ProfileRow {
  id: string;
  public_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FeedPostWithAuthor extends FeedPostRow {
  author?: ProfileRow | null;
  heart_count?: number;
  reply_count?: number;
  current_user_hearted?: boolean;
  current_user_pinned?: boolean;
  poll_options?: FeedPollOptionWithVotes[];
  current_user_vote_option_id?: string | null;
  /** Signed URL for post image (from resolvePostImageUrls); image_path stays raw for storage. */
  image_url?: string | null;
  /** When source_type is 'squad', the squad's display name for the tag. */
  source_name?: string | null;
  /** When source_type is 'squad', true if the post author is an admin of that squad. */
  is_squad_admin?: boolean;
  /** For trending posts: % change vs previous window. */
  change_pct?: number;
  /** Number of times this post has been shared to chats. */
  share_count?: number;
}

export interface FeedPollOptionRow {
  id: string;
  post_id: string;
  option_text: string;
  sort_order: number;
  created_at: string;
}

export interface FeedPollOptionWithVotes extends FeedPollOptionRow {
  vote_count: number;
}

export interface FeedReplyRow {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface FeedReplyWithAuthor extends FeedReplyRow {
  author?: ProfileRow | null;
  heart_count?: number;
  current_user_hearted?: boolean;
  replies?: FeedReplyWithAuthor[];
}

const AVATAR_COLORS = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771', '#9b87f5', '#85e89d', '#ffa8a8', '#ffd43b'];

function avatarColor(id: string): string {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[Math.abs(i) % AVATAR_COLORS.length];
}

function displayName(profile: ProfileRow | null | undefined): string {
  if (!profile) return 'Unknown';
  return profile.public_name?.trim() || profile.full_name?.trim() || 'Unknown';
}

/** Display name for a post: uses override_author_name when set, otherwise author profile. */
function postAuthorName(post: FeedPostRow & { author?: ProfileRow | null }): string {
  if (post.override_author_name?.trim()) return post.override_author_name.trim();
  return displayName(post.author);
}

/** Initials for post author: uses override_author_name when set, otherwise author profile. */
function postInitials(post: FeedPostRow & { author?: ProfileRow | null }): string {
  if (post.override_author_name?.trim()) return post.override_author_name.trim().slice(0, 2).toUpperCase();
  return initials(post.author);
}

function initials(profile: ProfileRow | null | undefined): string {
  const name = displayName(profile);
  if (name === 'Unknown') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

async function fetchShareCounts(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc('get_post_share_counts', { post_ids: postIds });
  if (error) return new Map();
  const map = new Map<string, number>();
  (data || []).forEach((r: { post_id: string; share_count: number }) => {
    map.set(r.post_id, Number(r.share_count ?? 0));
  });
  return map;
}

export const FeedService = {
  displayName,
  postAuthorName,
  postInitials,
  initials,
  avatarColor,
  timeAgo,

  async listPosts(
    userId: string | undefined,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedPostWithAuthor[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let rows: FeedPostRow[] = [];
    if (userId) {
      const { data, error } = await supabase.rpc('list_campus_feed_posts', {
        limit_val: limit,
        offset_val: offset,
      });
      if (error) throw error;
      rows = (Array.isArray(data) ? data : []) as FeedPostRow[];
    } else {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('source_type', 'user')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      rows = (data || []) as FeedPostRow[];
    }

    if (!rows?.length) return [];

    const postIds = (rows as FeedPostRow[]).map((p) => p.id);
    const authorIds = [...new Set((rows as FeedPostRow[]).map((p) => p.author_id))];
    const pollPostIds = (rows as FeedPostRow[]).filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userPinsRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      userId ? supabase.from('feed_user_pins').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      userId ? supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = (pollData.options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    (pollData.votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const squadIds = [...new Set((rows as FeedPostRow[]).filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const mapped = (rows as FeedPostRow[]).map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      share_count: shareCounts.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
      source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
    }));

    // Sort: pinned first, then newest above older (created_at descending)
    const sorted = mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return this.resolvePostImageUrls(sorted);
  },

  /** Get custom feed config. Returns null when no row. Otherwise { include_campus, squad_ids, known_squad_ids } for auto-select of new squads. */
  async getCustomFeedConfig(): Promise<{ include_campus: boolean; squad_ids: string[]; known_squad_ids: string[] } | null> {
    const { data, error } = await supabase.rpc('get_custom_feed_config');
    if (error || !data?.length) return null;
    const row = data[0] as { include_campus: boolean; squad_ids: string[] | null; known_squad_ids: string[] | null };
    return {
      include_campus: row.include_campus ?? true,
      squad_ids: Array.isArray(row.squad_ids) ? row.squad_ids : [],
      known_squad_ids: Array.isArray(row.known_squad_ids) ? row.known_squad_ids : [],
    };
  },

  /** Set custom feed config. squad_ids must be squads the user is in. */
  async setCustomFeedConfig(include_campus: boolean, squad_ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('set_custom_feed_config', {
      include_campus_param: include_campus,
      squad_ids_param: squad_ids,
    });
    if (error) throw error;
  },

  /** List posts for custom feed (campus + selected squads). */
  async listCustomFeedPosts(
    userId: string | undefined,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedPostWithAuthor[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const { data: rows, error } = await supabase.rpc('list_custom_feed_posts', {
      limit_val: limit,
      offset_val: offset,
    });
    if (error) throw error;
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [];

    const postIds = (list as FeedPostRow[]).map((p) => p.id);
    const authorIds = [...new Set((list as FeedPostRow[]).map((p) => p.author_id))];
    const pollPostIds = (list as FeedPostRow[]).filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userPinsRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      userId ? supabase.from('feed_user_pins').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      userId ? supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = ((pollData as { options?: FeedPollOptionRow[] }).options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    ((pollData as { votes?: { option_id: string; post_id: string; user_id: string }[] }).votes || []).forEach((v) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const squadIds = [...new Set((list as FeedPostRow[]).filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const mapped = (list as FeedPostRow[]).map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      share_count: shareCounts.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
      source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
    }));

    const sorted = mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return this.resolvePostImageUrls(sorted);
  },

  /** Get friends feed config. Returns null when no row. Otherwise { friend_ids, known_friend_ids } for auto-select of new friends. */
  async getFriendsFeedConfig(): Promise<{ friend_ids: string[]; known_friend_ids: string[] } | null> {
    const { data, error } = await supabase.rpc('get_friends_feed_config');
    if (error) return null;
    if (!data?.length) return null;
    const row = data[0] as { friend_ids: string[] | null; known_friend_ids: string[] | null };
    const friendIds = Array.isArray(row?.friend_ids) ? row.friend_ids : [];
    const knownIds = Array.isArray(row?.known_friend_ids) ? row.known_friend_ids : [];
    return { friend_ids: friendIds, known_friend_ids: knownIds };
  },

  /** Set friends feed config. friend_ids = which friends to show; empty = none. */
  async setFriendsFeedConfig(friend_ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('set_friends_feed_config', {
      friend_ids_param: friend_ids,
    });
    if (error) throw error;
  },

  /** List posts from friends (uses list_friends_feed_posts RPC). */
  async listFriendsFeedPosts(
    userId: string | undefined,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedPostWithAuthor[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    if (!userId) return [];

    const { data: rows, error } = await supabase.rpc('list_friends_feed_posts', {
      limit_val: limit,
      offset_val: offset,
    });
    if (error) throw error;
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [];

    const postIds = (list as FeedPostRow[]).map((p) => p.id);
    const authorIds = [...new Set((list as FeedPostRow[]).map((p) => p.author_id))];
    const pollPostIds = (list as FeedPostRow[]).filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userPinsRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      supabase.from('feed_user_pins').select('post_id').eq('user_id', userId).in('post_id', postIds),
      supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = ((pollData as { options?: FeedPollOptionRow[] }).options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    ((pollData as { votes?: { option_id: string; post_id: string; user_id: string }[] }).votes || []).forEach((v) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const listOpt = optionsByPost.get(o.post_id) || [];
      listOpt.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, listOpt);
    });

    const squadIds = [...new Set((list as FeedPostRow[]).filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const mapped = (list as FeedPostRow[]).map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      share_count: shareCounts.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
      source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
    }));

    const sorted = mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return this.resolvePostImageUrls(sorted);
  },

  /** Get post count for a user. Viewer-specific: own profile = all posts, other profile = visible only (campus, open, restricted with non_members_can_view_posts, squads viewer is in). */
  async getPostCountForUser(userId: string, viewerId?: string | null): Promise<number> {
    const viewer = viewerId ?? userId;
    if (!viewer) return 0;
    const { data, error } = await supabase.rpc('get_visible_post_count_for_user', {
      target_user_id: userId,
      viewer_id: viewer,
    });
    if (error) return 0;
    return Number(data ?? 0);
  },

  /** List posts by a specific author, filtered by viewer visibility. Own profile: all posts. Other profile: campus, open, restricted (non_members_can_view_posts), or squads viewer is in. */
  async listPostsByAuthor(
    authorId: string,
    currentUserId: string | undefined,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedPostWithAuthor[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    if (!currentUserId) {
      return [];
    }

    const { data: rows, error } = await supabase.rpc('list_posts_by_author_for_viewer', {
      author_id_param: authorId,
      viewer_id_param: currentUserId,
      limit_val: limit,
      offset_val: offset,
    });

    if (error) throw error;
    const filtered = (rows ?? []) as FeedPostRow[];
    if (!filtered.length) return [];

    const postIds = filtered.map((p) => p.id);
    const authorIds = [...new Set(filtered.map((p) => p.author_id))];
    const pollPostIds = filtered.filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userPinsRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      currentUserId ? supabase.from('feed_user_pins').select('post_id').eq('user_id', currentUserId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      currentUserId ? supabase.from('feed_hearts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = (pollData.options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    (pollData.votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === currentUserId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const squadIds = [...new Set(filtered.filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const mapped = filtered.map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      share_count: shareCounts.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
      source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
    }));

    const sorted = mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return this.resolvePostImageUrls(sorted);
  },

  /** List feed posts for a single squad (source_type = 'squad', source_id = squadId). Same shape and logic as listPosts. */
  async listPostsForSquad(
    squadId: string,
    userId: string | undefined,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedPostWithAuthor[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let rows: FeedPostRow[] = [];
    if (userId) {
      const { data, error } = await supabase.rpc('list_squad_feed_posts', {
        squad_id_param: squadId,
        limit_val: limit,
        offset_val: offset,
      });
      if (error) throw error;
      rows = (Array.isArray(data) ? data : []) as FeedPostRow[];
    } else {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('source_type', 'squad')
        .eq('source_id', squadId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      rows = (data || []) as FeedPostRow[];
    }

    if (!rows?.length) return [];

    const postIds = (rows as FeedPostRow[]).map((p) => p.id);
    const authorIds = [...new Set((rows as FeedPostRow[]).map((p) => p.author_id))];
    const pollPostIds = (rows as FeedPostRow[]).filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userPinsRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      userId ? supabase.from('feed_user_pins').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      userId ? supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = (pollData.options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    (pollData.votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    let squadName: string | null = null;
    const { data: squadRow } = await supabase.from('squads').select('name').eq('id', squadId).maybeSingle();
    if (squadRow && (squadRow as { name?: string }).name) squadName = (squadRow as { name: string }).name;

    const { data: adminRows } = await supabase.from('squad_members').select('user_id').eq('squad_id', squadId).eq('role', 'admin');
    const squadAdminIds = new Set((adminRows || []).map((r: { user_id: string }) => r.user_id));

    const mapped = (rows as FeedPostRow[]).map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      share_count: shareCounts.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
      source_name: squadName,
      is_squad_admin: squadAdminIds.has(p.author_id),
    }));

    const sorted = mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return this.resolvePostImageUrls(sorted);
  },

  /** Squad-level pinned posts (from feed_squad_pins). Returns in pinned_at order. */
  async listPinnedPostsForSquad(
    squadId: string,
    userId: string | undefined
  ): Promise<FeedPostWithAuthor[]> {
    const { data: pins, error: pinsError } = await supabase
      .from('feed_squad_pins')
      .select('post_id')
      .eq('squad_id', squadId)
      .order('pinned_at', { ascending: false });

    if (pinsError || !pins?.length) return [];

    const postIds = pins.map((p) => p.post_id);
    const posts: FeedPostWithAuthor[] = [];
    for (const postId of postIds) {
      const p = await this.getPost(postId, userId);
      if (p) posts.push(p);
    }
    return posts;
  },

  async getPost(postId: string, userId: string | undefined): Promise<FeedPostWithAuthor | null> {
    const { data: post, error } = await supabase.from('feed_posts').select('*').eq('id', postId).single();
    if (error || !post) return null;

    const authorId = (post as FeedPostRow).author_id;
    if (userId && authorId && authorId !== userId) {
      const { data: blocked } = await supabase.rpc('is_user_blocked', { user_a: userId, user_b: authorId });
      if (blocked) return null;
    }

    const [profileRes, heartsRes, repliesRes, optionsRes, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').eq('id', (post as FeedPostRow).author_id).single(),
      supabase.from('feed_hearts').select('id').eq('post_id', postId),
      supabase.from('feed_replies').select('id').eq('post_id', postId),
      (post as FeedPostRow).post_type === 'poll' || (post as FeedPostRow).post_type === 'post' ? supabase.from('feed_poll_options').select('*').eq('post_id', postId).order('sort_order') : Promise.resolve({ data: [] }),
      fetchShareCounts([postId]),
    ]);

    let userHearted = false;
    let userVoteOptionId: string | null = null;
    let currentUserPinned = false;
    if (userId) {
      const [{ data: uh }, { data: uv }, { data: pinRow }] = await Promise.all([
        supabase.from('feed_hearts').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
        (post as FeedPostRow).post_type === 'poll' || (post as FeedPostRow).post_type === 'post' ? supabase.from('feed_poll_votes').select('option_id').eq('post_id', postId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('feed_user_pins').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
      ]);
      userHearted = !!uh;
      userVoteOptionId = (uv as { option_id: string } | null)?.option_id ?? null;
      currentUserPinned = !!pinRow;
    }

    const optionRows = (optionsRes.data || []) as FeedPollOptionRow[];
    const optionIds = optionRows.map((o) => o.id);
    let voteCountByOption: Record<string, number> = {};
    if (optionIds.length > 0) {
      const { data: votes } = await supabase.from('feed_poll_votes').select('option_id').in('option_id', optionIds);
      (votes || []).forEach((v: { option_id: string }) => { voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1; });
    }

    const row = post as FeedPostRow;
    let source_name: string | null = null;
    let is_squad_admin = false;
    if (row.source_type === 'squad' && row.source_id) {
      const [{ data: squadRow }, { data: memberRow }] = await Promise.all([
        supabase.from('squads').select('name').eq('id', row.source_id).maybeSingle(),
        supabase.from('squad_members').select('role').eq('squad_id', row.source_id).eq('user_id', row.author_id).maybeSingle(),
      ]);
      if (squadRow && (squadRow as { name?: string }).name) source_name = (squadRow as { name: string }).name;
      if (memberRow && (memberRow as { role?: string }).role === 'admin') is_squad_admin = true;
    }

    const postWithAuthor: FeedPostWithAuthor = {
      ...row,
      author: (profileRes.data as ProfileRow) ?? null,
      heart_count: (heartsRes.data || []).length,
      reply_count: (repliesRes.data || []).length,
      share_count: shareCounts.get(postId) || 0,
      current_user_hearted: userHearted,
      current_user_pinned: currentUserPinned,
      poll_options: optionRows.map((o) => ({ ...o, vote_count: voteCountByOption[o.id] || 0 })),
      current_user_vote_option_id: userVoteOptionId,
      source_name,
      is_squad_admin,
    };
    const [resolved] = await this.resolvePostImageUrls([postWithAuthor]);
    return resolved;
  },

  async resolvePostImageUrls(posts: FeedPostWithAuthor[]): Promise<FeedPostWithAuthor[]> {
    const withImages = posts.filter((p) => p.image_path?.trim());
    if (withImages.length === 0) return posts;
    const urlMap = await getSignedUrls('feed-post-images', withImages.map((p) => p.image_path!));
    return posts.map((p) => {
      if (!p.image_path) return p;
      const signed = urlMap.get(p.image_path);
      return signed ? { ...p, image_url: signed } : p;
    });
  },

  async createPost(params: {
    author_id: string;
    source_type: SourceType;
    source_id?: string | null;
    post_type: PostType;
    title: string;
    content?: string | null;
    image_path?: string | null;
    url?: string | null;
    override_author_name?: string | null;
    poll_options?: { option_text: string; sort_order: number }[];
  }): Promise<FeedPostRow> {
    const { poll_options, override_author_name, ...rest } = params;
    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        ...rest,
        content: rest.content ?? null,
        image_path: rest.image_path ?? null,
        url: rest.url ?? null,
        override_author_name: override_author_name ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    if (post && poll_options?.length) {
      await supabase.from('feed_poll_options').insert(poll_options.map((o, i) => ({ post_id: post.id, option_text: o.option_text, sort_order: i })));
    }
    if (post?.id && rest.content) {
      const snippet = (rest.title || '').slice(0, 80);
      NotificationsService.createMentionNotifications(post.id, rest.author_id, rest.content, snippet).catch(() => {});
    }
    return post as FeedPostRow;
  },

  /** Create the default welcome post for a new squad (displayed as Quadly). Call after squad creation. */
  async createSquadWelcomePost(squadId: string, authorId: string): Promise<FeedPostRow> {
    return this.createPost({
      author_id: authorId,
      source_type: 'squad',
      source_id: squadId,
      post_type: 'text_pic',
      title: 'Welcome to your squad',
      content: `Post updates, photos, polls, and links here. Open About for squad info, members, and documents. Use Group Chat to message everyone when enabled. Admins can pin posts, add documents, and set community rules.`,
      override_author_name: 'Quadly',
    });
  },

  async updatePost(postId: string, authorId: string, updates: { title?: string; content?: string | null; url?: string | null; image_path?: string | null }): Promise<void> {
    const { error } = await supabase.from('feed_posts').update(updates).eq('id', postId).eq('author_id', authorId);
    if (error) throw error;
  },

  async deletePost(postId: string, authorId: string): Promise<void> {
    const { data: post } = await supabase.from('feed_posts').select('image_path').eq('id', postId).eq('author_id', authorId).maybeSingle();
    if (post?.image_path) {
      const pathMatch = post.image_path.match(/feed-post-images\/(.+)$/);
      const path = pathMatch ? pathMatch[1] : post.image_path;
      try {
        await supabase.storage.from('feed-post-images').remove([path]);
      } catch {
        // Continue with post delete even if storage delete fails (e.g. file already removed)
      }
    }
    const { error } = await supabase.from('feed_posts').delete().eq('id', postId).eq('author_id', authorId);
    if (error) throw error;
  },

  /** List posts pinned by the user. Ordered by most recently pinned first. */
  async listPinnedPosts(userId: string | undefined): Promise<FeedPostWithAuthor[]> {
    if (!userId) return [];
    const { data: pins, error: pinsError } = await supabase
      .from('feed_user_pins')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (pinsError || !pins?.length) return [];
    const postIds = pins.map((p: { post_id: string }) => p.post_id);

    const { data: rows, error } = await supabase
      .from('feed_posts')
      .select('*')
      .in('id', postIds);
    if (error || !rows?.length) return [];

    const authorIds = [...new Set((rows as FeedPostRow[]).map((p) => p.author_id))];
    const pollPostIds = (rows as FeedPostRow[]).filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userHeartsRes, pollData] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));
    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = (pollData.options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    (pollData.votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const squadIds = [...new Set((rows as FeedPostRow[]).filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const postById = new Map<string, FeedPostWithAuthor>();
    (rows as FeedPostRow[]).forEach((p) => {
      postById.set(p.id, {
        ...p,
        author: profileMap.get(p.author_id) ?? null,
        heart_count: heartCountByPost.get(p.id) || 0,
        reply_count: replyCountByPost.get(p.id) || 0,
        current_user_hearted: userHeartedSet.has(p.id),
        current_user_pinned: true,
        poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
        current_user_vote_option_id: userVoteByPost[p.id] || null,
        source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
      });
    });

    let ordered = postIds.map((id) => postById.get(id)).filter(Boolean) as FeedPostWithAuthor[];
    const authorIdsToCheck = [...new Set(ordered.map((p) => p.author_id).filter((id): id is string => !!id && id !== userId))];
    if (authorIdsToCheck.length > 0) {
      const blockedChecks = await Promise.all(
        authorIdsToCheck.map((aid) => supabase.rpc('is_user_blocked', { user_a: userId, user_b: aid }).then((r) => (r.data ? aid : null)))
      );
      const blockedAuthorIds = new Set(blockedChecks.filter((id): id is string => id != null));
      ordered = ordered.filter((p) => !p.author_id || !blockedAuthorIds.has(p.author_id));
    }
    return this.resolvePostImageUrls(ordered);
  },

  /** Top 20 trending posts by weighted engagement (posts=1, hearts=1, replies=2). Base 72h; expands to 7 days if empty. */
  async getTrendingPosts(userId: string | undefined): Promise<{ posts: FeedPostWithAuthor[]; windowHours?: number }> {
    const { data: rows, error } = await supabase.rpc('get_trending_posts');
    if (error || !rows?.length) return { posts: [] };
    const rpcRows = rows as { post_id: string; total_hearts: number; reply_count: number; change_pct?: number; window_hours?: number }[];
    const postIds = rpcRows.map((r) => r.post_id);
    const engagementByPost = new Map(postIds.map((id, i) => [
      id,
      {
        total_hearts: Number(rpcRows[i]?.total_hearts ?? 0),
        reply_count: Number(rpcRows[i]?.reply_count ?? 0),
        change_pct: rpcRows[i]?.change_pct != null ? Number(rpcRows[i].change_pct) : undefined,
      },
    ]));

    const { data: feedRows, error: fetchError } = await supabase
      .from('feed_posts')
      .select('*')
      .in('id', postIds);
    if (fetchError || !feedRows?.length) return { posts: [] };

    const rowsOrdered = postIds.map((id) => (feedRows as FeedPostRow[]).find((p) => p.id === id)).filter(Boolean) as FeedPostRow[];
    const authorIds = [...new Set(rowsOrdered.map((p) => p.author_id))];
    const pollPostIds = rowsOrdered.filter((p) => p.post_type === 'poll' || p.post_type === 'post').map((p) => p.id);

    const [profilesRes, heartsRes, repliesRes, userHeartsRes, pollData, shareCounts] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').in('post_id', postIds),
      supabase.from('feed_replies').select('post_id').in('post_id', postIds),
      userId ? supabase.from('feed_hearts').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] }),
      pollPostIds.length > 0
        ? Promise.all([
            supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order'),
            supabase.from('feed_poll_votes').select('option_id, post_id, user_id').in('post_id', pollPostIds),
          ]).then(([opt, votes]) => ({ options: opt.data || [], votes: votes.data || [] }))
        : Promise.resolve({ options: [], votes: [] }),
      fetchShareCounts(postIds),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));
    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));
    const userHeartedSet = new Set((userHeartsRes.data || []).map((h: { post_id: string }) => h.post_id));

    const optionRows = (pollData.options || []) as FeedPollOptionRow[];
    const voteCountByOption: Record<string, number> = {};
    const userVoteByPost: Record<string, string> = {};
    (pollData.votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
      voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
      if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
    });
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    optionRows.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const squadIds = [...new Set(rowsOrdered.filter((p) => p.source_type === 'squad' && p.source_id).map((p) => p.source_id!))];
    let squadNameById = new Map<string, string>();
    if (squadIds.length > 0) {
      const { data: squads } = await supabase.from('squads').select('id, name').in('id', squadIds);
      (squads || []).forEach((s: { id: string; name: string }) => squadNameById.set(s.id, s.name || ''));
    }

    const postById = new Map<string, FeedPostWithAuthor>();
    const engagement = engagementByPost;
    rowsOrdered.forEach((p) => {
      const eng = engagement.get(p.id);
      postById.set(p.id, {
        ...p,
        author: profileMap.get(p.author_id) ?? null,
        heart_count: eng ? eng.total_hearts : (heartCountByPost.get(p.id) || 0),
        reply_count: eng ? eng.reply_count : (replyCountByPost.get(p.id) || 0),
        share_count: shareCounts.get(p.id) || 0,
        change_pct: eng?.change_pct,
        current_user_hearted: userHeartedSet.has(p.id),
        current_user_pinned: false,
        poll_options: (p.post_type === 'poll' || p.post_type === 'post') ? (optionsByPost.get(p.id) || []) : undefined,
        current_user_vote_option_id: userVoteByPost[p.id] || null,
        source_name: p.source_type === 'squad' && p.source_id ? (squadNameById.get(p.source_id) ?? null) : null,
      });
    });

    const ordered = postIds.map((id) => postById.get(id)).filter(Boolean) as FeedPostWithAuthor[];
    const windowHours = rpcRows[0]?.window_hours != null ? Number(rpcRows[0].window_hours) : undefined;
    const posts = await this.resolvePostImageUrls(ordered);
    const filtered = posts.filter((p) => !p.override_author_name?.trim());
    return { posts: filtered, windowHours };
  },

  /** Per-user pin: any user can pin/unpin any post for themselves. Returns new pinned state. */
  async togglePinPost(postId: string, userId: string): Promise<{ pinned: boolean }> {
    const { data: existing } = await supabase.from('feed_user_pins').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('feed_user_pins').delete().eq('post_id', postId).eq('user_id', userId);
      return { pinned: false };
    }
    await supabase.from('feed_user_pins').insert({ post_id: postId, user_id: userId });
    return { pinned: true };
  },

  async listReplies(postId: string, userId: string | undefined): Promise<FeedReplyWithAuthor[]> {
    const { data: rows, error } = await supabase.from('feed_replies').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) throw error;
    if (!rows?.length) return [];

    const authorIds = [...new Set((rows as FeedReplyRow[]).map((r) => r.author_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds);
    const profileMap = new Map<string, ProfileRow>();
    (profiles || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const replyIds = (rows as FeedReplyRow[]).map((r) => r.id);
    const { data: hearts } = await supabase.from('feed_hearts').select('reply_id').not('reply_id', 'is', null);
    const heartCountByReply = new Map<string, number>();
    (hearts || []).forEach((h: { reply_id: string }) => heartCountByReply.set(h.reply_id, (heartCountByReply.get(h.reply_id) || 0) + 1));
    let userHearts: { reply_id: string }[] = [];
    if (userId) {
      const { data: uh } = await supabase.from('feed_hearts').select('reply_id').eq('user_id', userId).not('reply_id', 'is', null);
      userHearts = uh || [];
    }
    const userHeartedSet = new Set(userHearts.map((h) => h.reply_id));

    const topLevel = (rows as FeedReplyRow[]).filter((r) => !r.parent_reply_id);
    const byParent = new Map<string, FeedReplyRow[]>();
    (rows as FeedReplyRow[]).forEach((r) => {
      if (r.parent_reply_id) {
        const list = byParent.get(r.parent_reply_id) || [];
        list.push(r);
        byParent.set(r.parent_reply_id, list);
      }
    });

    function toReplyWithAuthor(r: FeedReplyRow): FeedReplyWithAuthor {
      const children = (byParent.get(r.id) || []).map(toReplyWithAuthor);
      return {
        ...r,
        author: profileMap.get(r.author_id) ?? null,
        heart_count: heartCountByReply.get(r.id) || 0,
        current_user_hearted: userHeartedSet.has(r.id),
        replies: children.length ? children : undefined,
      };
    }
    return topLevel.map(toReplyWithAuthor);
  },

  async createReply(postId: string, authorId: string, content: string, parentReplyId?: string | null): Promise<FeedReplyRow> {
    const { data, error } = await supabase.from('feed_replies').insert({ post_id: postId, author_id: authorId, content: content.trim(), parent_reply_id: parentReplyId || null }).select().single();
    if (error) throw error;
    const reply = data as FeedReplyRow;
    if (reply.id && content) {
      const snippet = content.slice(0, 80);
      NotificationsService.createMentionNotifications(reply.id, authorId, content, snippet, 'reply').catch(() => {});
    }
    return reply;
  },

  async updateReply(replyId: string, authorId: string, content: string): Promise<void> {
    const { error } = await supabase.from('feed_replies').update({ content }).eq('id', replyId).eq('author_id', authorId);
    if (error) throw error;
  },

  async deleteReply(replyId: string, authorId: string): Promise<void> {
    const { error } = await supabase.from('feed_replies').delete().eq('id', replyId).eq('author_id', authorId);
    if (error) throw error;
  },

  /** Report a post. Idempotent: duplicate report from same user is treated as success. */
  async reportPost(postId: string, userId: string, reason?: string | null): Promise<void> {
    const { error } = await supabase.from('feed_reports').insert({
      reporter_id: userId,
      post_id: postId,
      reply_id: null,
      reason: reason?.trim() || null,
    });
    if (error) {
      if ((error as { code?: string }).code === '23505') return; // unique violation = already reported
      throw error;
    }
  },

  /** Report a reply. Idempotent: duplicate report from same user is treated as success. */
  async reportReply(replyId: string, userId: string, reason?: string | null): Promise<void> {
    const { error } = await supabase.from('feed_reports').insert({
      reporter_id: userId,
      post_id: null,
      reply_id: replyId,
      reason: reason?.trim() || null,
    });
    if (error) {
      if ((error as { code?: string }).code === '23505') return; // unique violation = already reported
      throw error;
    }
  },

  async toggleHeartPost(postId: string, userId: string): Promise<{ hearted: boolean }> {
    const { data: existing } = await supabase.from('feed_hearts').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('feed_hearts').delete().eq('post_id', postId).eq('user_id', userId);
      return { hearted: false };
    }
    await supabase.from('feed_hearts').insert({ post_id: postId, user_id: userId });
    return { hearted: true };
  },

  async toggleHeartReply(replyId: string, userId: string): Promise<{ hearted: boolean }> {
    const { data: existing } = await supabase.from('feed_hearts').select('id').eq('reply_id', replyId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('feed_hearts').delete().eq('reply_id', replyId).eq('user_id', userId);
      return { hearted: false };
    }
    await supabase.from('feed_hearts').insert({ reply_id: replyId, user_id: userId });
    return { hearted: true };
  },

  async votePoll(postId: string, optionId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('feed_poll_votes').upsert({ post_id: postId, option_id: optionId, user_id: userId }, { onConflict: 'post_id,user_id' });
    if (error) throw error;
  },

  async uploadPostImage(userId: string, postId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${postId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('feed-post-images').upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  },

  /** Subscribe to feed_posts changes. For home pass squadId=null (listens to all posts for Campus/Custom/Friends); for squad pass squadId. Callback is invoked so caller can refetch. */
  subscribeToFeedPosts(
    squadId: string | null,
    onPostsChange: () => void
  ): ReturnType<typeof supabase.channel> {
    const channelName = squadId ? `feed-posts:squad:${squadId}` : 'feed-posts:home';
    const config = squadId
      ? { event: '*' as const, schema: 'public', table: 'feed_posts', filter: `source_id=eq.${squadId}` }
      : { event: 'INSERT' as const, schema: 'public', table: 'feed_posts' };
    return supabase
      .channel(channelName)
      .on('postgres_changes', config, () => onPostsChange())
      .subscribe();
  },

  unsubscribeFromFeedPosts(channel: ReturnType<typeof supabase.channel>): void {
    supabase.removeChannel(channel);
  },

  /** Subscribe to feed_posts changes for a specific author. For profile page. */
  subscribeToAuthorPosts(
    authorId: string,
    onPostsChange: () => void
  ): ReturnType<typeof supabase.channel> {
    return supabase
      .channel(`feed-posts:author:${authorId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feed_posts',
        filter: `author_id=eq.${authorId}`,
      }, () => onPostsChange())
      .subscribe();
  },

  /**
   * Subscribe to feed_replies, feed_poll_votes for the feed list.
   * Refetches when replies or poll votes change. Hearts excluded to avoid like-count glitches.
   * Callback is throttled (default 2s). For home pass squadId=null.
   */
  subscribeToFeedAuxiliary(
    squadId: string | null,
    onRefresh: () => void,
    options?: { throttleMs?: number }
  ): { unsubscribe: () => void } {
    const throttleMs = options?.throttleMs ?? 2000;
    let lastCall = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        onRefresh();
        return;
      }
      if (timeout == null) {
        timeout = setTimeout(() => {
          timeout = null;
          lastCall = Date.now();
          onRefresh();
        }, throttleMs - (now - lastCall));
      }
    };
    const channelName = squadId ? `feed-aux:squad:${squadId}` : 'feed-aux:home';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_replies' }, throttled)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_poll_votes' }, throttled)
      .subscribe();
    return {
      unsubscribe: () => {
        if (timeout != null) clearTimeout(timeout);
        supabase.removeChannel(channel);
      },
    };
  },

  /** Subscribe to feed_replies for a post. Callback so caller can refetch replies. */
  subscribeToFeedReplies(
    postId: string,
    onRepliesChange: () => void
  ): ReturnType<typeof supabase.channel> {
    return supabase
      .channel(`feed-replies:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_replies', filter: `post_id=eq.${postId}` },
        () => onRepliesChange()
      )
      .subscribe();
  },

  unsubscribeFromFeedReplies(channel: ReturnType<typeof supabase.channel>): void {
    supabase.removeChannel(channel);
  },

  /** Subscribe to feed_hearts for a post; callback is throttled (default every 4s). Call returned .unsubscribe() on cleanup. */
  subscribeToFeedHearts(
    postId: string,
    onHeartsChange: () => void,
    options?: { throttleMs?: number }
  ): { channel: ReturnType<typeof supabase.channel>; unsubscribe: () => void } {
    const throttleMs = options?.throttleMs ?? 4000;
    let lastCall = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        onHeartsChange();
        return;
      }
      if (timeout == null) {
        timeout = setTimeout(() => {
          timeout = null;
          lastCall = Date.now();
          onHeartsChange();
        }, throttleMs - (now - lastCall));
      }
    };
    const channel = supabase
      .channel(`feed-hearts:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_hearts', filter: `post_id=eq.${postId}` },
        throttled
      )
      .subscribe();
    return {
      channel,
      unsubscribe: () => {
        if (timeout != null) clearTimeout(timeout);
        supabase.removeChannel(channel);
      },
    };
  },

  /** Subscribe to feed_poll_options for a post (option text/order changes). Call unsubscribe on cleanup. */
  subscribeToFeedPollOptions(
    postId: string,
    onPollOptionsChange: () => void
  ): ReturnType<typeof supabase.channel> {
    return supabase
      .channel(`feed-poll-options:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_poll_options', filter: `post_id=eq.${postId}` },
        () => onPollOptionsChange()
      )
      .subscribe();
  },

  unsubscribeFromFeedPollOptions(channel: ReturnType<typeof supabase.channel>): void {
    supabase.removeChannel(channel);
  },

  /** Subscribe to feed_poll_votes for a post; callback is throttled (default every 4s). Call returned .unsubscribe() on cleanup. */
  subscribeToFeedPollVotes(
    postId: string,
    onPollVotesChange: () => void,
    options?: { throttleMs?: number }
  ): { channel: ReturnType<typeof supabase.channel>; unsubscribe: () => void } {
    const throttleMs = options?.throttleMs ?? 4000;
    let lastCall = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        onPollVotesChange();
        return;
      }
      if (timeout == null) {
        timeout = setTimeout(() => {
          timeout = null;
          lastCall = Date.now();
          onPollVotesChange();
        }, throttleMs - (now - lastCall));
      }
    };
    const channel = supabase
      .channel(`feed-poll-votes:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_poll_votes', filter: `post_id=eq.${postId}` },
        throttled
      )
      .subscribe();
    return {
      channel,
      unsubscribe: () => {
        if (timeout != null) clearTimeout(timeout);
        supabase.removeChannel(channel);
      },
    };
  },
};
