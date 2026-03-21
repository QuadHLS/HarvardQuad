import { supabase } from '../lib/supabase';
import { getSignedUrl, getSignedUrls } from '@/lib/signedStorageUrl';

export interface Squad {
  id: string;
  name: string;
  info: string | null;
  category: string;
  meeting_times: string | null;
  location: string | null;
  type: 'open' | 'restricted' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  conversation_id: string | null;
  chat_enabled: boolean;
  avatar_url: string | null;
  /** Storage path for avatar (before signing). Use for SharedSquadData.avatar_path. */
  avatar_path?: string | null;
  cover_url?: string | null;
  rules?: string | null;
  /** Restricted squads only: when true, non-members can view posts (chat always members-only) */
  non_members_can_view_posts?: boolean;
  post_count?: number;
  member_count?: number;
  is_joined?: boolean;
  /** For restricted squads: 'pending' | 'approved' | 'denied' | null if not requested */
  join_request_status?: 'pending' | 'approved' | 'denied' | null;
  is_admin?: boolean;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
  profile?: {
    full_name: string | null;
    public_name: string | null;
    avatar_url: string | null;
  };
}

export interface SquadDocument {
  id: string;
  squad_id: string;
  name: string;
  file_path: string | null;
  file_url: string | null;
  storage_bucket: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class SquadsService {
  /** Batch sign avatar/cover URLs for multiple squads. Skips paths that already look like http URLs. */
  private static async applySquadSignedUrls<T extends { avatar_url?: string | null; cover_url?: string | null }>(
    items: T[],
    bucket: string
  ): Promise<T[]> {
    const paths: string[] = [];
    for (const item of items) {
      if (item.avatar_url && !item.avatar_url.startsWith('http')) paths.push(item.avatar_url);
      if (item.cover_url && !item.cover_url.startsWith('http')) paths.push(item.cover_url);
    }
    if (paths.length === 0) return items;
    const urlMap = await getSignedUrls(bucket, paths);
    return items.map((item) => {
      let avatar_url = item.avatar_url;
      let cover_url = item.cover_url;
      if (avatar_url && !avatar_url.startsWith('http') && urlMap.has(avatar_url)) avatar_url = urlMap.get(avatar_url)!;
      if (cover_url && !cover_url.startsWith('http') && urlMap.has(cover_url)) cover_url = urlMap.get(cover_url)!;
      return { ...item, avatar_url, cover_url };
    });
  }

  // Create a new squad
  static async createSquad(
    name: string,
    info: string | null,
    category: string,
    meetingTimes: string | null,
    location: string | null,
    privacyType: 'open' | 'restricted' | 'private' = 'open',
    chatEnabled: boolean = false
  ): Promise<Squad> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: squadId, error } = await supabase.rpc('create_squad', {
      squad_name: name,
      squad_info: info,
      squad_category: category,
      meeting_times: meetingTimes,
      squad_location: location,
      privacy_type: privacyType,
      enable_chat: chatEnabled,
    });

    if (error) throw error;
    if (!squadId) throw new Error('Failed to create squad');

    // Fetch the created squad
    const { data: squad, error: fetchError } = await supabase
      .from('squads')
      .select('*')
      .eq('id', squadId)
      .single();

    if (fetchError) throw fetchError;

    return squad as Squad;
  }

  // Get all squads (filtered by RLS)
  static async getSquads(): Promise<Squad[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: squads, error } = await supabase
      .from('squads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const squadIds = (squads || []).map((s) => s.id);
    const restrictedSquadIds = (squads || []).filter((s) => s.type === 'restricted').map((s) => s.id);

    const [postRes, memberRes, myMemberRes, joinRequestRes] = await Promise.all([
      squadIds.length > 0
        ? supabase.from('feed_posts').select('source_id').eq('source_type', 'squad').in('source_id', squadIds)
        : Promise.resolve({ data: [] as { source_id: string | null }[] }),
      squadIds.length > 0
        ? supabase.from('squad_members').select('squad_id').in('squad_id', squadIds)
        : Promise.resolve({ data: [] as { squad_id: string }[] }),
      squadIds.length > 0
        ? supabase.from('squad_members').select('squad_id').eq('user_id', user.id).in('squad_id', squadIds)
        : Promise.resolve({ data: [] as { squad_id: string }[] }),
      restrictedSquadIds.length > 0
        ? supabase.from('squad_join_requests').select('squad_id, status').eq('user_id', user.id).in('squad_id', restrictedSquadIds)
        : Promise.resolve({ data: [] as { squad_id: string; status: string }[] }),
    ]);

    const postCountBySquad: Record<string, number> = {};
    for (const r of postRes.data || []) {
      if (r.source_id) postCountBySquad[r.source_id] = (postCountBySquad[r.source_id] ?? 0) + 1;
    }

    const memberCountBySquad: Record<string, number> = {};
    for (const r of memberRes.data || []) {
      memberCountBySquad[r.squad_id] = (memberCountBySquad[r.squad_id] ?? 0) + 1;
    }

    const mySquadIds = new Set((myMemberRes.data || []).map((r) => r.squad_id));

    const joinRequestBySquad: Record<string, 'pending' | 'approved' | 'denied'> = {};
    for (const r of joinRequestRes.data || []) {
      joinRequestBySquad[r.squad_id] = r.status as 'pending' | 'approved' | 'denied';
    }

    const withUrls = await this.applySquadSignedUrls(squads || [], SquadsService.AVATAR_BUCKET);
    return withUrls.map((squad) => {
      const membership = mySquadIds.has(squad.id);
      const join_request_status = squad.type === 'restricted' && !membership
        ? (joinRequestBySquad[squad.id] ?? null)
        : null;
      return {
        ...squad,
        member_count: memberCountBySquad[squad.id] ?? 0,
        post_count: postCountBySquad[squad.id] ?? 0,
        is_joined: membership,
        join_request_status,
      } as Squad;
    });
  }

  /** Get squads the current user has joined, ordered by most recently joined first. */
  static async getJoinedSquads(): Promise<Squad[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: memberships, error: memError } = await supabase
      .from('squad_members')
      .select('squad_id, joined_at')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (memError || !memberships?.length) return [];

    const squadIds = memberships.map((m) => m.squad_id);
    const memberCountBySquad: Record<string, number> = {};
    const { data: memberRows } = await supabase
      .from('squad_members')
      .select('squad_id')
      .in('squad_id', squadIds);
    for (const r of memberRows || []) {
      memberCountBySquad[r.squad_id] = (memberCountBySquad[r.squad_id] ?? 0) + 1;
    }

    const { data: postRows } = await supabase
      .from('feed_posts')
      .select('source_id')
      .eq('source_type', 'squad')
      .in('source_id', squadIds);
    const postCountBySquad: Record<string, number> = {};
    for (const r of postRows || []) {
      if (r.source_id) postCountBySquad[r.source_id] = (postCountBySquad[r.source_id] ?? 0) + 1;
    }

    const { data: squads, error } = await supabase
      .from('squads')
      .select('*')
      .in('id', squadIds);

    if (error || !squads?.length) return [];

    const squadById = Object.fromEntries(squads.map((s) => [s.id, s]));
    const orderedSquads = squadIds.map((id) => squadById[id]).filter(Boolean);

    const withUrls = await this.applySquadSignedUrls(orderedSquads, SquadsService.AVATAR_BUCKET);
    return withUrls.map((squad) => ({
      ...squad,
      member_count: memberCountBySquad[squad.id] ?? 0,
      post_count: postCountBySquad[squad.id] ?? 0,
      is_joined: true,
    })) as Squad[];
  }

  /** Get squad post access for current user: is_member, can_view, squad_name, squad_type. */
  static async getSquadPostAccess(squadId: string): Promise<{ is_member: boolean; can_view: boolean; squad_name: string; squad_type: string } | null> {
    const { data, error } = await supabase.rpc('get_squad_post_access', { squad_id_param: squadId });
    if (error || !data?.length) return null;
    const row = data[0] as { is_member: boolean; can_view: boolean; squad_name: string; squad_type: string };
    return row;
  }

  /** Get squad count for a user (lightweight, for header display). */
  static async getSquadCountForUser(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_squad_count_for_user', {
      target_user_id: userId,
    });
    if (error) throw error;
    return Number(data ?? 0);
  }

  /** Get squad IDs a user is a member of (lightweight, for membership checks). */
  static async getSquadIdsForUser(userId: string): Promise<string[]> {
    const { data: rows, error } = await supabase.rpc('get_squad_ids_for_user', {
      target_user_id: userId,
    });
    if (error || !rows?.length) return [];
    return rows.map((r: { squad_id: string }) => r.squad_id);
  }

  /** Get squads a specific user is a member of (for viewing other users' profiles). Open and restricted always; private only when viewer is also a member (RLS enforces). */
  static async getSquadsForUser(userId: string): Promise<Squad[]> {
    const { data: rpcRows, error: rpcError } = await supabase.rpc('get_squad_ids_for_user', {
      target_user_id: userId,
    });

    if (rpcError || !rpcRows?.length) return [];

    const squadIds = rpcRows.map((r: { squad_id: string }) => r.squad_id);
    const memberCountBySquad: Record<string, number> = {};
    for (const r of rpcRows) {
      memberCountBySquad[r.squad_id] = Number(r.member_count ?? 0);
    }

    const { data: squads, error } = await supabase
      .from('squads')
      .select('*')
      .in('id', squadIds);

    if (error || !squads?.length) return [];

    const { data: postRows } = await supabase.from('feed_posts').select('source_id').eq('source_type', 'squad').in('source_id', squadIds);
    const postCountBySquad: Record<string, number> = {};
    for (const r of postRows || []) {
      if (r.source_id) postCountBySquad[r.source_id] = (postCountBySquad[r.source_id] ?? 0) + 1;
    }

    const withUrls = await this.applySquadSignedUrls(squads, SquadsService.AVATAR_BUCKET);
    return withUrls.map((squad) => ({
      ...squad,
      member_count: memberCountBySquad[squad.id] ?? 0,
      post_count: postCountBySquad[squad.id] ?? 0,
      is_joined: true,
    })) as Squad[];
  }

  /** Get squads the current user is NOT a member of (for Discover tab). */
  static async getSquadsForDiscover(): Promise<Squad[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: rows, error } = await supabase.rpc('get_squads_for_discover');
    if (error || !rows) return [];
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [];

    const items = list.map((r: Record<string, unknown>) => ({
      ...r,
      avatar_url: (r.avatar_url as string) || null,
      cover_url: (r.cover_url as string) || null,
    }));
    const withUrls = await this.applySquadSignedUrls(items, SquadsService.AVATAR_BUCKET);
    const squadsWithDetails = await Promise.all(
      withUrls.map(async (r) => {
        let join_request_status: 'pending' | 'approved' | 'denied' | null = null;
        if (r.type === 'restricted' || r.type === 'private') {
          const { data: req } = await supabase
            .from('squad_join_requests')
            .select('status')
            .eq('squad_id', r.id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (req) join_request_status = req.status as 'pending' | 'approved' | 'denied';
        }
        return {
          id: r.id,
          name: r.name,
          info: r.info,
          category: r.category,
          meeting_times: r.meeting_times,
          location: r.location,
          type: r.type as 'open' | 'restricted' | 'private',
          created_by: r.created_by,
          created_at: r.created_at,
          updated_at: r.updated_at,
          conversation_id: r.conversation_id,
          chat_enabled: r.chat_enabled ?? false,
          avatar_url: r.avatar_url,
          cover_url: r.cover_url,
          rules: r.rules ?? null,
          member_count: Number(r.member_count ?? 0),
          post_count: Number(r.post_count ?? 0),
          is_joined: false,
          join_request_status,
        } as Squad;
      })
    );
    return squadsWithDetails;
  }

  /** Top 20 trending squads by weighted engagement (posts=1, hearts=1, replies=2). Window: 24h → 48h → 72h until data. */
  static async getTrendingSquads(): Promise<
    Array<{
      id: string;
      name: string;
      category: string | null;
      avatar_url: string | null;
      cover_url: string | null;
      type: 'open' | 'restricted';
      is_joined: boolean;
      join_request_status: 'pending' | 'approved' | 'denied' | null;
      member_count: number;
      post_count: number;
      engagement_24h: number;
      change_pct: number;
      window_hours?: number;
      posts_in_window: number;
      replies_in_window: number;
      hearts_in_window: number;
    }>
  > {
    const { data: rows, error } = await supabase.rpc('get_trending_squads');
    if (error || !rows?.length) return [];

    const items = rows.map((r: { avatar_url?: string | null; cover_url?: string | null; [k: string]: unknown }) => ({
      ...r,
      avatar_url: r.avatar_url ?? null,
      cover_url: r.cover_url ?? null,
    }));
    const withUrls = await this.applySquadSignedUrls(items, SquadsService.AVATAR_BUCKET);
    const withAvatars = withUrls.map((r) => ({
      id: r.id,
      name: r.name,
      category: (r.category as string) ?? null,
      avatar_url: r.avatar_url ?? null,
      cover_url: r.cover_url ?? null,
      type: (r.type === 'restricted' ? 'restricted' : 'open') as 'open' | 'restricted',
      is_joined: !!r.is_joined,
      join_request_status: (r.join_request_status === 'pending' || r.join_request_status === 'approved' || r.join_request_status === 'denied' ? r.join_request_status : null) as 'pending' | 'approved' | 'denied' | null,
      member_count: Number(r.member_count ?? 0),
      post_count: Number(r.post_count ?? 0),
      engagement_24h: Number(r.engagement_24h ?? 0),
      change_pct: Number(r.change_pct ?? 0),
      window_hours: r.window_hours != null ? Number(r.window_hours) : undefined,
      posts_in_window: Number(r.posts_in_window ?? 0),
      replies_in_window: Number(r.replies_in_window ?? 0),
      hearts_in_window: Number(r.hearts_in_window ?? 0),
    }));
    return withAvatars;
  }

  /** Top 4 public squads by post count in last 24h. (Legacy; prefer getTrendingSquads for Explore.) */
  static async getTrendingSquads24h(): Promise<
    Array<{ id: string; name: string; avatar_url: string | null; post_count_24h: number; member_count: number }>
  > {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await supabase
      .from('feed_posts')
      .select('source_id')
      .eq('source_type', 'squad')
      .not('source_id', 'is', null)
      .gte('created_at', yesterday);

    if (error || !rows?.length) return [];

    const countBySquad: Record<string, number> = {};
    for (const r of rows) {
      if (r.source_id) countBySquad[r.source_id] = (countBySquad[r.source_id] ?? 0) + 1;
    }
    const sorted = Object.entries(countBySquad)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const squadIds = sorted.map(([id]) => id);
    if (squadIds.length === 0) return [];

    const { data: squads, error: squadError } = await supabase
      .from('squads')
      .select('id, name, avatar_url')
      .in('id', squadIds)
      .eq('type', 'open');

    if (squadError || !squads?.length) return [];

    const withUrls = await this.applySquadSignedUrls(squads, SquadsService.AVATAR_BUCKET);
    const squadsWithAvatars = withUrls;

    const { data: members } = await supabase
      .from('squad_members')
      .select('squad_id')
      .in('squad_id', squadIds);

    const memberCountBySquad: Record<string, number> = {};
    for (const m of members || []) {
      memberCountBySquad[m.squad_id] = (memberCountBySquad[m.squad_id] ?? 0) + 1;
    }

    const countMap = Object.fromEntries(sorted);
    return squadsWithAvatars
      .map((s) => ({
        id: s.id,
        name: s.name,
        avatar_url: s.avatar_url ?? null,
        post_count_24h: countMap[s.id] ?? 0,
        member_count: memberCountBySquad[s.id] ?? 0,
      }))
      .sort((a, b) => b.post_count_24h - a.post_count_24h)
      .slice(0, 4);
  }

  // Get a single squad by ID
  static async getSquad(squadId: string): Promise<Squad> {
    const { data: squad, error } = await supabase
      .from('squads')
      .select('*')
      .eq('id', squadId)
      .single();

    if (error) throw error;
    if (!squad) throw new Error('Squad not found');

    const { count: memberCount } = await supabase
      .from('squad_members')
      .select('*', { count: 'exact', head: true })
      .eq('squad_id', squadId);

    const avatar_path = squad.avatar_url ?? null;
    let avatar_url = squad.avatar_url;
    let cover_url = squad.cover_url;
    if (avatar_url) {
      const signed = await getSignedUrl(SquadsService.AVATAR_BUCKET, avatar_url);
      if (signed) avatar_url = signed;
    }
    if (cover_url) {
      const signed = await getSignedUrl(SquadsService.AVATAR_BUCKET, cover_url);
      if (signed) cover_url = signed;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = user
      ? await supabase.from('squad_members').select('role').eq('squad_id', squadId).eq('user_id', user.id).maybeSingle()
      : { data: null } as { data: { role: string } | null };
    let join_request_status: 'pending' | 'approved' | 'denied' | null = null;
    if (user && (squad.type === 'restricted' || squad.type === 'private') && !membership) {
      const { data: req } = await supabase
        .from('squad_join_requests')
        .select('status')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (req) join_request_status = req.status as 'pending' | 'approved' | 'denied';
    }

    return {
      ...squad,
      avatar_url,
      avatar_path,
      cover_url,
      member_count: memberCount || 0,
      is_joined: !!membership,
      is_admin: membership?.role === 'admin',
      join_request_status,
    } as Squad;
  }

  /** Invite user to open squad (any member). Creates notification; invitee accepts/declines from inbox. */
  static async inviteSquadMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('invite_squad_member', {
      squad_id_param: squadId,
      invitee_id_param: userId,
    });
    if (error) throw error;
  }

  /** Accept squad invite (invitee). Adds to squad, notifies inviter. */
  static async acceptSquadInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('accept_squad_invite', {
      invite_id_param: inviteId,
    });
    if (error) throw error;
  }

  /** Decline squad invite (invitee). Notifies inviter. */
  static async declineSquadInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('decline_squad_invite', {
      invite_id_param: inviteId,
    });
    if (error) throw error;
  }

  /** Cancel/unsend squad invite (inviter). Removes invite and invitee's notification. */
  static async cancelSquadInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_squad_invite', {
      invite_id_param: inviteId,
    });
    if (error) throw error;
  }

  // Add members to a squad (creator/admins only). Also adds them to the squad's group chat.
  static async addSquadMembers(squadId: string, userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    const { error } = await supabase.rpc('add_squad_members', {
      squad_id_param: squadId,
      user_ids_param: userIds,
    });
    if (error) throw error;
  }

  // Join a squad. Treats "already a member" as success (idempotent).
  static async joinSquad(squadId: string): Promise<void> {
    const { error } = await supabase.rpc('join_squad', {
      squad_id_param: squadId,
    });

    if (error) {
      const msg = (error as { message?: string }).message ?? '';
      const details = (error as { details?: string }).details ?? '';
      const isAlreadyMember =
        (error as { code?: string }).code === 'P0001' ||
        /already a member/i.test(msg);
      if (isAlreadyMember) return;
      throw new Error(msg || details || 'Failed to join squad');
    }
  }

  // Leave a squad
  static async leaveSquad(squadId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_squad', {
      squad_id_param: squadId,
    });

    if (error) throw error;
  }

  // Remove a member from a squad (admins only; enforced by RPC)
  static async removeSquadMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_squad_member', {
      squad_id_param: squadId,
      user_id_to_remove: userId,
    });
    if (error) throw error;
  }

  /** Pending invites you've sent for a squad. */
  static async getPendingInvitesForSquad(squadId: string): Promise<Array<{
    id: string;
    invitee_id: string;
    created_at: string;
    profile: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null;
  }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows, error } = await supabase
      .from('squad_invites')
      .select('id, invitee_id, created_at')
      .eq('squad_id', squadId)
      .eq('inviter_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !rows?.length) return [];

    const ids = rows.map((r) => r.invitee_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, public_name, avatar_url')
      .in('id', ids);
    const profileMap = new Map<string, { full_name: string | null; public_name: string | null; avatar_url: string | null }>();
    (profiles || []).forEach((p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => {
      profileMap.set(p.id, { full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url });
    });

    return rows.map((r) => ({
      id: r.id,
      invitee_id: r.invitee_id,
      created_at: r.created_at,
      profile: profileMap.get(r.invitee_id) ?? null,
    }));
  }

  /** All pending invites you've sent (across squads). */
  static async getPendingInvitesSent(): Promise<Array<{
    id: string;
    squad_id: string;
    squad_name: string;
    invitee_id: string;
    created_at: string;
    profile: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null;
  }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows, error } = await supabase
      .from('squad_invites')
      .select('id, squad_id, invitee_id, created_at')
      .eq('inviter_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !rows?.length) return [];

    const squadIds = [...new Set(rows.map((r) => r.squad_id))];
    const inviteeIds = [...new Set(rows.map((r) => r.invitee_id))];

    const [squadsRes, profilesRes] = await Promise.all([
      supabase.from('squads').select('id, name').in('id', squadIds),
      supabase.from('profiles').select('id, full_name, public_name, avatar_url').in('id', inviteeIds),
    ]);

    const squadMap = new Map<string, string>();
    (squadsRes.data || []).forEach((s: { id: string; name: string }) => squadMap.set(s.id, s.name || ''));
    const profileMap = new Map<string, { full_name: string | null; public_name: string | null; avatar_url: string | null }>();
    (profilesRes.data || []).forEach((p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => {
      profileMap.set(p.id, { full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url });
    });

    return rows.map((r) => ({
      id: r.id,
      squad_id: r.squad_id,
      squad_name: squadMap.get(r.squad_id) || '',
      invitee_id: r.invitee_id,
      created_at: r.created_at,
      profile: profileMap.get(r.invitee_id) ?? null,
    }));
  }

  // Get squad members
  static async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    const { data: members, error } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squadId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    if (!members) return [];

    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, public_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, { full_name: string | null; public_name: string | null; avatar_url: string | null }>();
    (profiles || []).forEach((p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => {
      profileMap.set(p.id, { full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url });
    });

    return members.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) || null,
    })) as SquadMember[];
  }

  // Get squad documents
  static async getSquadDocuments(squadId: string): Promise<SquadDocument[]> {
    const { data: documents, error } = await supabase
      .from('squad_documents')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const docs = (documents || []) as SquadDocument[];
    const byBucket = new Map<string, Array<{ path: string; doc: SquadDocument }>>();
    for (const d of docs) {
      if (d.file_path && d.storage_bucket) {
        const list = byBucket.get(d.storage_bucket) ?? [];
        list.push({ path: d.file_path, doc: d });
        byBucket.set(d.storage_bucket, list);
      }
    }
    const urlMaps = await Promise.all(
      Array.from(byBucket.entries()).map(([bucket, list]) =>
        getSignedUrls(bucket, list.map((x) => x.path))
      )
    );
    const pathToUrl = new Map<string, string>();
    let idx = 0;
    for (const [bucket, list] of byBucket.entries()) {
      const map = urlMaps[idx++];
      for (const { path } of list) {
        const url = map.get(path);
        if (url) pathToUrl.set(`${bucket}:${path}`, url);
      }
    }
    return docs.map((d) => {
      if (d.file_path && d.storage_bucket) {
        const signed = pathToUrl.get(`${d.storage_bucket}:${d.file_path}`);
        return { ...d, file_url: signed ?? d.file_url };
      }
      return d;
    });
  }

  // Add a squad document (admins only; name + optional URL or storage metadata)
  static async addSquadDocument(
    squadId: string,
    name: string,
    fileUrl: string | null = null,
    opts?: { file_path?: string | null; file_size?: number | null; mime_type?: string | null; storage_bucket?: string | null }
  ): Promise<SquadDocument> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const row: Record<string, unknown> = {
      squad_id: squadId,
      name: name.trim(),
      file_url: fileUrl?.trim() || null,
      created_by: user.id,
    };
    if (opts?.file_path !== undefined) row.file_path = opts.file_path;
    if (opts?.file_size !== undefined) row.file_size = opts.file_size;
    if (opts?.mime_type !== undefined) row.mime_type = opts.mime_type;
    if (opts?.storage_bucket !== undefined) row.storage_bucket = opts.storage_bucket;
    const { data, error } = await supabase
      .from('squad_documents')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as SquadDocument;
  }

  static readonly BUCKET = 'squad-documents';

  // Upload a file to squad storage and add a squad document (admins only). displayName is the label shown in the list; defaults to file.name.
  static async uploadAndAddSquadDocument(squadId: string, file: File, displayName?: string): Promise<SquadDocument> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const name = (displayName?.trim() || file.name).trim() || file.name;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${squadId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(SquadsService.BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadError) throw uploadError;
    return SquadsService.addSquadDocument(squadId, name, null, {
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      storage_bucket: SquadsService.BUCKET,
    });
  }

  static readonly AVATAR_BUCKET = 'squad-avatars';

  /** Upload squad avatar (admins only). Replaces existing. Returns public URL. */
  static async uploadSquadAvatar(squadId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${squadId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(SquadsService.AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;
    return path;
  }

  /** Remove file from squad-avatars bucket. Path = storage path (e.g. squadId/avatar.jpg), not full URL. */
  static async removeSquadAvatarOrCover(path: string): Promise<void> {
    if (!path || path.startsWith("http")) return;
    const { error } = await supabase.storage.from(SquadsService.AVATAR_BUCKET).remove([path]);
    if (error) throw error;
  }

  /** Upload squad cover/banner (admins only). Replaces existing. Returns storage path. */
  static async uploadSquadCover(squadId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${squadId}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(SquadsService.AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;
    return path;
  }

  // Update squad (admins only; name, info, category, type, avatar_url, cover_url, rules)
  static async updateSquad(
    squadId: string,
    updates: { name?: string; info?: string | null; category?: string; type?: 'open' | 'restricted' | 'private'; avatar_url?: string | null; cover_url?: string | null; rules?: string | null; meeting_times?: string | null; location?: string | null; non_members_can_view_posts?: boolean }
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.info !== undefined) payload.info = updates.info?.trim() || null;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url?.trim() || null;
    if (updates.cover_url !== undefined) payload.cover_url = updates.cover_url?.trim() || null;
    if (updates.rules !== undefined) payload.rules = updates.rules?.trim() || null;
    if (updates.meeting_times !== undefined) payload.meeting_times = updates.meeting_times?.trim() || null;
    if (updates.location !== undefined) payload.location = updates.location?.trim() || null;
    if (updates.non_members_can_view_posts !== undefined) payload.non_members_can_view_posts = updates.non_members_can_view_posts;
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from('squads').update(payload).eq('id', squadId);
    if (error) throw error;
  }

  /** Enable squad group chat. Creates the conversation if needed and adds all members. */
  static async enableSquadChat(squadId: string): Promise<string> {
    const { data: convId, error } = await supabase.rpc('enable_squad_chat', {
      squad_id_param: squadId,
    });
    if (error) throw error;
    return convId as string;
  }

  /** Disable squad group chat (hides the button, doesn't delete the chat). */
  static async disableSquadChat(squadId: string): Promise<void> {
    const { error } = await supabase.from('squads').update({ chat_enabled: false }).eq('id', squadId);
    if (error) throw error;
  }

  /** Request to join a restricted squad. Idempotent: re-request resets status to pending. */
  static async requestToJoinSquad(squadId: string): Promise<string> {
    const { data: requestId, error } = await supabase.rpc('request_to_join_squad', {
      squad_id_param: squadId,
    });
    if (error) throw error;
    return requestId as string;
  }

  /** Approve a join request (admins only). */
  static async approveSquadJoinRequest(requestId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_squad_join_request', {
      request_id_param: requestId,
    });
    if (error) throw error;
  }

  /** Deny a join request (admins only). */
  static async denySquadJoinRequest(requestId: string): Promise<void> {
    const { error } = await supabase.rpc('deny_squad_join_request', {
      request_id_param: requestId,
    });
    if (error) throw error;
  }

  /** Get pending join requests for a squad (admins only). */
  static async getSquadJoinRequests(squadId: string): Promise<Array<{ id: string; user_id: string; status: string; created_at: string; profile?: { full_name: string | null; public_name: string | null; avatar_url: string | null } }>> {
    const { data: rows, error } = await supabase
      .from('squad_join_requests')
      .select('id, user_id, status, created_at')
      .eq('squad_id', squadId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!rows?.length) return [];

    const userIds = rows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, public_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, { full_name: string | null; public_name: string | null; avatar_url: string | null }>();
    (profiles || []).forEach((p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => {
      profileMap.set(p.id, { full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url });
    });

    return rows.map((r) => ({
      ...r,
      profile: profileMap.get(r.user_id) || null,
    }));
  }

  /** Pin a post to squad feed (admins only). */
  static async pinSquadPost(squadId: string, postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { error } = await supabase.from('feed_squad_pins').insert({
      squad_id: squadId,
      post_id: postId,
      pinned_by: user.id,
    });
    if (error) throw error;
  }

  /** Unpin a post from squad feed (admins only). */
  static async unpinSquadPost(squadId: string, postId: string): Promise<void> {
    const { error } = await supabase.from('feed_squad_pins').delete().eq('squad_id', squadId).eq('post_id', postId);
    if (error) throw error;
  }

  // Delete a squad (admins only; RLS enforces). Cleans up storage before delete since triggers are removed.
  static async deleteSquad(squadId: string): Promise<void> {
    const { data: squad, error: squadErr } = await supabase
      .from('squads')
      .select('avatar_url, cover_url, conversation_id')
      .eq('id', squadId)
      .single();

    if (squadErr || !squad) {
      const { error } = await supabase.from('squads').delete().eq('id', squadId);
      if (error) throw error;
      return;
    }

    const remove = async (bucket: string, path: string) => {
      if (!path || path.startsWith('http')) return;
      try {
        await supabase.storage.from(bucket).remove([path]);
      } catch {
        // Continue on failure
      }
    };

    if (squad.avatar_url) await remove(SquadsService.AVATAR_BUCKET, squad.avatar_url);
    if (squad.cover_url) await remove(SquadsService.AVATAR_BUCKET, squad.cover_url);

    const { data: docs } = await supabase
      .from('squad_documents')
      .select('storage_bucket, file_path')
      .eq('squad_id', squadId);
    for (const d of docs || []) {
      if (d.storage_bucket && d.file_path) await remove(d.storage_bucket, d.file_path);
    }

    // Clean up feed post images (no FK cascade from feed_posts.source_id → squads)
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id, image_path')
      .eq('source_type', 'squad')
      .eq('source_id', squadId);
    for (const p of (posts || []) as Array<{ id: string; image_path: string | null }>) {
      if (p.image_path) {
        const pathMatch = p.image_path.match(/feed-post-images\/(.+)$/);
        await remove('feed-post-images', pathMatch ? pathMatch[1] : p.image_path);
      }
    }
    if (posts?.length) {
      await supabase.from('feed_posts').delete().eq('source_type', 'squad').eq('source_id', squadId);
    }

    if (squad.conversation_id) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('avatar_url')
        .eq('id', squad.conversation_id)
        .single();
      const avatarPath = (conv as { avatar_url?: string | null } | null)?.avatar_url;
      if (avatarPath) await remove('group-chat-avatars', avatarPath);

      const { data: messages } = await supabase
        .from('messages')
        .select('id, attachments:message_attachments(storage_bucket, file_path)')
        .eq('conversation_id', squad.conversation_id);
      for (const m of (messages || []) as Array<{ attachments?: Array<{ storage_bucket: string; file_path: string }> }>) {
        for (const att of m.attachments || []) {
          if (att.storage_bucket && att.file_path) await remove(att.storage_bucket, att.file_path);
        }
      }
    }

    const { error } = await supabase.from('squads').delete().eq('id', squadId);
    if (error) throw error;
  }

  // Delete a squad document (admins only). Also removes the file from storage if present.
  static async deleteSquadDocument(squadId: string, documentId: string): Promise<void> {
    const { data: doc, error: fetchError } = await supabase
      .from('squad_documents')
      .select('file_path, storage_bucket')
      .eq('id', documentId)
      .eq('squad_id', squadId)
      .single();

    if (fetchError || !doc) throw new Error('Document not found');

    if (doc.file_path && doc.storage_bucket) {
      try {
        await supabase.storage.from(doc.storage_bucket as string).remove([doc.file_path as string]);
      } catch {
        // Continue to delete row even if storage delete fails (e.g. file already removed)
      }
    }

    const { error: deleteError } = await supabase
      .from('squad_documents')
      .delete()
      .eq('id', documentId)
      .eq('squad_id', squadId);

    if (deleteError) throw deleteError;
  }
}
