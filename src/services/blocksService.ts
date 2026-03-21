import { supabase } from "@/lib/supabase"

export const BlocksService = {
  async blockUser(blockedId: string): Promise<void> {
    const { error } = await supabase.rpc("block_user", { blocked_id_param: blockedId })
    if (error) throw error
  },

  async unblockUser(blockedId: string): Promise<void> {
    const { error } = await supabase.rpc("unblock_user", { blocked_id_param: blockedId })
    if (error) throw error
  },

  async isBlockedByMe(blockedId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_blocked_by_me", { blocked_id_param: blockedId })
    if (error) throw error
    return !!data
  },

  /** True if either user has blocked the other (both directions). */
  async isBlockedEither(myId: string, otherId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_user_blocked", {
      user_a: myId,
      user_b: otherId,
    })
    if (error) throw error
    return !!data
  },

  async getBlockedUsers(): Promise<
    Array<{ blocked_id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>
  > {
    const { data, error } = await supabase.rpc("get_blocked_users")
    if (error) throw error
    return (data ?? []) as Array<{
      blocked_id: string
      full_name: string | null
      public_name: string | null
      avatar_url: string | null
    }>
  },
}
