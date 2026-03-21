import { supabase } from "@/lib/supabase"

export type ExploreProfile = {
  id: string
  public_name: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  major: string | null
  class_year: string | null
  location: string | null
}

export function profileDisplayName(p: ExploreProfile | null | undefined): string {
  if (!p) return "Unknown"
  return p.public_name?.trim() || p.full_name?.trim() || "Unknown"
}

export function profileInitials(p: ExploreProfile | null | undefined): string {
  const name = profileDisplayName(p)
  if (name === "Unknown") return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export const ProfilesService = {
  async listProfilesForExplore(userId: string | undefined): Promise<ExploreProfile[]> {
    const { data, error } = await supabase.rpc("list_profiles_for_explore", {
      viewer_id_param: userId ?? null,
    })

    if (error) throw error
    if (!data?.length) return []

    return data as ExploreProfile[]
  },
}
