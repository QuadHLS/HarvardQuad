import { supabase } from "@/lib/supabase"

export type FriendRequestStatus = "pending_sent" | "pending_received" | null

export const FriendsService = {
  async getFriendRequestStatus(viewerId: string, targetId: string): Promise<FriendRequestStatus> {
    const { data, error } = await supabase.rpc("get_friend_request_status", {
      viewer_id: viewerId,
      target_id: targetId,
    })
    if (error) throw error
    return data as FriendRequestStatus
  },

  async areFriends(userA: string, userB: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("are_friends", {
      user_a: userA,
      user_b: userB,
    })
    if (error) throw error
    return !!data
  },

  async getFriendStatusBatch(
    viewerId: string,
    targetIds: string[]
  ): Promise<Record<string, { isFriend: boolean; requestStatus: FriendRequestStatus }>> {
    if (targetIds.length === 0) return {}
    const { data, error } = await supabase.rpc("get_friend_status_batch", {
      viewer_id: viewerId,
      target_ids: targetIds,
    })
    if (error) throw error
    const rows = (data ?? []) as Array<{ target_id: string; is_friend: boolean; request_status: string | null }>
    const map: Record<string, { isFriend: boolean; requestStatus: FriendRequestStatus }> = {}
    for (const r of rows) {
      map[r.target_id] = {
        isFriend: !!r.is_friend,
        requestStatus: (r.request_status as FriendRequestStatus) ?? null,
      }
    }
    return map
  },

  async sendFriendRequest(toUserId: string): Promise<void> {
    const { error } = await supabase.rpc("send_friend_request", { to_user_id_param: toUserId })
    if (error) throw error
  },

  async acceptFriendRequest(fromUserId: string): Promise<void> {
    const { error } = await supabase.rpc("accept_friend_request", { from_user_id_param: fromUserId })
    if (error) throw error
  },

  async declineFriendRequest(fromUserId: string): Promise<void> {
    const { error } = await supabase.rpc("decline_friend_request", { from_user_id_param: fromUserId })
    if (error) throw error
  },

  async removeFriend(friendId: string): Promise<void> {
    const { error } = await supabase.rpc("remove_friend", { friend_id_param: friendId })
    if (error) throw error
  },

  async cancelFriendRequest(toUserId: string): Promise<void> {
    const { error } = await supabase.rpc("cancel_friend_request", { to_user_id_param: toUserId })
    if (error) throw error
  },

  async getFriendIdsForUser(profileUserId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc("get_friend_ids_for_user", {
      profile_user_id: profileUserId,
    })
    if (error) throw error
    return (data ?? []).map((r: { id: string }) => r.id)
  },

  async getFriendCountForUser(profileUserId: string): Promise<number> {
    const { data, error } = await supabase.rpc("get_friend_count_for_user", {
      profile_user_id: profileUserId,
    })
    if (error) throw error
    return Number(data ?? 0)
  },

  async getFriendsForUser(profileUserId: string): Promise<
    Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>
  > {
    const { data, error } = await supabase.rpc("get_friends_for_user", { profile_user_id: profileUserId })
    if (error) throw error
    const rows = (data ?? []) as Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>
    const seen = new Set<string>()
    return rows.filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  },

  async getSentFriendRequests(): Promise<
    Array<{
      to_user_id: string
      full_name: string | null
      public_name: string | null
      avatar_url: string | null
      status: string
      created_at: string
    }>
  > {
    const { data, error } = await supabase.rpc("get_sent_friend_requests")
    if (error) throw error
    return (data ?? []) as Array<{
      to_user_id: string
      full_name: string | null
      public_name: string | null
      avatar_url: string | null
      status: string
      created_at: string
    }>
  },

  async getReceivedFriendRequests(): Promise<
    Array<{
      from_user_id: string
      full_name: string | null
      public_name: string | null
      avatar_url: string | null
      created_at: string
    }>
  > {
    const { data, error } = await supabase.rpc("get_received_friend_requests")
    if (error) throw error
    return (data ?? []) as Array<{
      from_user_id: string
      full_name: string | null
      public_name: string | null
      avatar_url: string | null
      created_at: string
    }>
  },
}
