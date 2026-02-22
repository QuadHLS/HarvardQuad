import { supabase } from '../lib/supabase';

export interface Squad {
  id: string;
  name: string;
  info: string | null;
  category: string;
  meeting_times: string | null;
  location: string | null;
  type: 'open' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  conversation_id: string | null;
  avatar_url: string | null;
  member_count?: number;
  is_joined?: boolean;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
  profile?: {
    full_name: string | null;
    email: string | null;
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
  // Create a new squad
  static async createSquad(
    name: string,
    info: string | null,
    category: string,
    meetingTimes: string | null,
    location: string | null,
    privacyType: 'open' | 'private' = 'open'
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

    // Get member counts and join status
    const squadsWithDetails = await Promise.all(
      (squads || []).map(async (squad) => {
        // Get member count
        const { count: memberCount } = await supabase
          .from('squad_members')
          .select('*', { count: 'exact', head: true })
          .eq('squad_id', squad.id);

        // Check if current user is a member
        const { data: membership } = await supabase
          .from('squad_members')
          .select('id')
          .eq('squad_id', squad.id)
          .eq('user_id', user.id)
          .single();

        return {
          ...squad,
          member_count: memberCount || 0,
          is_joined: !!membership,
        } as Squad;
      })
    );

    return squadsWithDetails;
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

    // Get member count
    const { count: memberCount } = await supabase
      .from('squad_members')
      .select('*', { count: 'exact', head: true })
      .eq('squad_id', squadId);

    return {
      ...squad,
      member_count: memberCount || 0,
    } as Squad;
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

  // Get squad members
  static async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    const { data: members, error } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squadId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    if (!members) return [];

    // Get profiles for each member
    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', member.user_id)
          .single();

        return {
          ...member,
          profile: profile || null,
        };
      })
    );

    return membersWithProfiles as SquadMember[];
  }

  // Get squad documents
  static async getSquadDocuments(squadId: string): Promise<SquadDocument[]> {
    const { data: documents, error } = await supabase
      .from('squad_documents')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (documents || []) as SquadDocument[];
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
    const { data: { publicUrl } } = supabase.storage.from(SquadsService.BUCKET).getPublicUrl(path);
    return SquadsService.addSquadDocument(squadId, name, publicUrl, {
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
    const { data } = supabase.storage.from(SquadsService.AVATAR_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // Update squad (admins only; name, info, category, type, avatar_url)
  static async updateSquad(
    squadId: string,
    updates: { name?: string; info?: string | null; category?: string; type?: 'open' | 'private'; avatar_url?: string | null }
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.info !== undefined) payload.info = updates.info?.trim() || null;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url?.trim() || null;
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from('squads').update(payload).eq('id', squadId);
    if (error) throw error;
  }

  // Delete a squad (admins only; RLS enforces)
  static async deleteSquad(squadId: string): Promise<void> {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId);

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
