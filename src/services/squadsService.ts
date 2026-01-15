import { supabase } from '../lib/supabase';

export interface Squad {
  id: string;
  name: string;
  info: string | null;
  category: string;
  meeting_times: string | null;
  location: string | null;
  type: 'open' | 'locked' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  conversation_id: string | null;
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
    privacyType: 'open' | 'locked' | 'private' = 'open'
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

  // Join a squad
  static async joinSquad(squadId: string): Promise<void> {
    const { error } = await supabase.rpc('join_squad', {
      squad_id_param: squadId,
    });

    if (error) throw error;
  }

  // Leave a squad
  static async leaveSquad(squadId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_squad', {
      squad_id_param: squadId,
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

  // Delete a squad (only creator can delete)
  static async deleteSquad(squadId: string): Promise<void> {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId);

    if (error) throw error;
  }
}
