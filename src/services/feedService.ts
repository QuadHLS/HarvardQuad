import { supabase } from '../lib/supabase';

export type PostType = 'text_pic' | 'social_url' | 'poll';
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

const AVATAR_COLORS = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74', '#9b87f5', '#85e89d', '#ffa8a8', '#ffd43b'];

function avatarColor(id: string): string {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[Math.abs(i) % AVATAR_COLORS.length];
}

function displayName(profile: ProfileRow | null | undefined): string {
  if (!profile) return 'Unknown';
  return profile.public_name?.trim() || profile.full_name?.trim() || 'Unknown';
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

export const FeedService = {
  displayName,
  initials,
  avatarColor,
  timeAgo,

  async listPosts(userId: string | undefined): Promise<FeedPostWithAuthor[]> {
    // Newer posts first (above older posts)
    const { data: rows, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rows?.length) return [];

    const authorIds = [...new Set((rows as FeedPostRow[]).map((p) => p.author_id))];
    const [profilesRes, heartsRes, repliesRes, userPinsRes] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').in('id', authorIds),
      supabase.from('feed_hearts').select('post_id').not('post_id', 'is', null),
      supabase.from('feed_replies').select('post_id'),
      userId ? supabase.from('feed_user_pins').select('post_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    const heartCountByPost = new Map<string, number>();
    (heartsRes.data || []).forEach((h: { post_id: string }) => heartCountByPost.set(h.post_id, (heartCountByPost.get(h.post_id) || 0) + 1));
    const replyCountByPost = new Map<string, number>();
    (repliesRes.data || []).forEach((r: { post_id: string }) => replyCountByPost.set(r.post_id, (replyCountByPost.get(r.post_id) || 0) + 1));

    const userPinnedSet = new Set((userPinsRes.data || []).map((row: { post_id: string }) => row.post_id));

    let userHearts: { post_id: string }[] = [];
    if (userId) {
      const { data: uh } = await supabase.from('feed_hearts').select('post_id').eq('user_id', userId).not('post_id', 'is', null);
      userHearts = uh || [];
    }
    const userHeartedSet = new Set(userHearts.map((h) => h.post_id));

    const pollPostIds = (rows as FeedPostRow[]).filter((p) => p.post_type === 'poll').map((p) => p.id);
    let options: FeedPollOptionRow[] = [];
    let voteCountByOption: Record<string, number> = {};
    let userVoteByPost: Record<string, string> = {};
    if (pollPostIds.length > 0) {
      const { data: optRows } = await supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds).order('sort_order');
      options = (optRows || []) as FeedPollOptionRow[];
      const optionIds = options.map((o) => o.id);
      const { data: votes } = await supabase.from('feed_poll_votes').select('option_id, post_id, user_id');
      (votes || []).forEach((v: { option_id: string; post_id: string; user_id: string }) => {
        voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
        if (v.user_id === userId) userVoteByPost[v.post_id] = v.option_id;
      });
    }
    const optionsByPost = new Map<string, FeedPollOptionWithVotes[]>();
    options.forEach((o) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ ...o, vote_count: voteCountByOption[o.id] || 0 });
      optionsByPost.set(o.post_id, list);
    });

    const mapped = (rows as FeedPostRow[]).map((p) => ({
      ...p,
      author: profileMap.get(p.author_id) ?? null,
      heart_count: heartCountByPost.get(p.id) || 0,
      reply_count: replyCountByPost.get(p.id) || 0,
      current_user_hearted: userHeartedSet.has(p.id),
      current_user_pinned: userPinnedSet.has(p.id),
      poll_options: p.post_type === 'poll' ? (optionsByPost.get(p.id) || []) : undefined,
      current_user_vote_option_id: userVoteByPost[p.id] || null,
    }));

    // Sort: pinned first, then newest above older (created_at descending)
    return mapped.sort((a, b) => {
      const aPinned = a.current_user_pinned ? 1 : 0;
      const bPinned = b.current_user_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getPost(postId: string, userId: string | undefined): Promise<FeedPostWithAuthor | null> {
    const { data: post, error } = await supabase.from('feed_posts').select('*').eq('id', postId).single();
    if (error || !post) return null;

    const [profileRes, heartsRes, repliesRes, optionsRes] = await Promise.all([
      supabase.from('profiles').select('id, public_name, full_name, avatar_url').eq('id', (post as FeedPostRow).author_id).single(),
      supabase.from('feed_hearts').select('id').eq('post_id', postId),
      supabase.from('feed_replies').select('id').eq('post_id', postId),
      (post as FeedPostRow).post_type === 'poll' ? supabase.from('feed_poll_options').select('*').eq('post_id', postId).order('sort_order') : Promise.resolve({ data: [] }),
    ]);

    let userHearted = false;
    let userVoteOptionId: string | null = null;
    let currentUserPinned = false;
    if (userId) {
      const [{ data: uh }, { data: uv }, { data: pinRow }] = await Promise.all([
        supabase.from('feed_hearts').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
        (post as FeedPostRow).post_type === 'poll' ? supabase.from('feed_poll_votes').select('option_id').eq('post_id', postId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
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

    return {
      ...(post as FeedPostRow),
      author: (profileRes.data as ProfileRow) ?? null,
      heart_count: (heartsRes.data || []).length,
      reply_count: (repliesRes.data || []).length,
      current_user_hearted: userHearted,
      current_user_pinned: currentUserPinned,
      poll_options: optionRows.map((o) => ({ ...o, vote_count: voteCountByOption[o.id] || 0 })),
      current_user_vote_option_id: userVoteOptionId,
    };
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
    poll_options?: { option_text: string; sort_order: number }[];
  }): Promise<FeedPostRow> {
    const { poll_options, ...rest } = params;
    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({ ...rest, content: rest.content ?? null, image_path: rest.image_path ?? null, url: rest.url ?? null })
      .select()
      .single();
    if (error) throw error;
    if (post && poll_options?.length) {
      await supabase.from('feed_poll_options').insert(poll_options.map((o, i) => ({ post_id: post.id, option_text: o.option_text, sort_order: i })));
    }
    return post as FeedPostRow;
  },

  async updatePost(postId: string, authorId: string, updates: { title?: string; content?: string | null; url?: string | null; image_path?: string | null }): Promise<void> {
    const { error } = await supabase.from('feed_posts').update(updates).eq('id', postId).eq('author_id', authorId);
    if (error) throw error;
  },

  async deletePost(postId: string, authorId: string): Promise<void> {
    const { error } = await supabase.from('feed_posts').delete().eq('id', postId).eq('author_id', authorId);
    if (error) throw error;
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
    return data as FeedReplyRow;
  },

  async updateReply(replyId: string, authorId: string, content: string): Promise<void> {
    const { error } = await supabase.from('feed_replies').update({ content }).eq('id', replyId).eq('author_id', authorId);
    if (error) throw error;
  },

  async deleteReply(replyId: string, authorId: string): Promise<void> {
    const { error } = await supabase.from('feed_replies').delete().eq('id', replyId).eq('author_id', authorId);
    if (error) throw error;
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
    const { data } = supabase.storage.from('feed-post-images').getPublicUrl(path);
    return data.publicUrl;
  },
};
