import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "@/lib/supabase"

export type ProfileData = {
  id: string
  full_name: string | null
  public_name: string | null
  avatar_url: string | null
  cover_url: string | null
  theme: string | null
  class_year: string | null
  major: string | null
  bio: string | null
  location: string | null
  created_at: string | null
  instagram_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  github_url: string | null
  is_public: boolean | null
}

const PROFILE_COLS =
  "full_name, public_name, avatar_url, cover_url, theme, class_year, major, bio, location, created_at, instagram_url, linkedin_url, twitter_url, github_url, is_public"

type ProfileContextType = {
  profile: ProfileData | null
  loading: boolean
  invalidate: () => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", user.id)
      .maybeSingle()
    if (data) {
      setProfile({
        id: user.id,
        full_name: data.full_name ?? null,
        public_name: data.public_name ?? null,
        avatar_url: data.avatar_url ?? null,
        cover_url: data.cover_url ?? null,
        theme: data.theme ?? null,
        class_year: data.class_year ?? null,
        major: data.major ?? null,
        bio: data.bio ?? null,
        location: data.location ?? null,
        created_at: data.created_at ?? null,
        instagram_url: data.instagram_url ?? null,
        linkedin_url: data.linkedin_url ?? null,
        twitter_url: data.twitter_url ?? null,
        github_url: data.github_url ?? null,
        is_public: data.is_public ?? true,
      })
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const invalidate = useCallback(() => {
    fetchProfile()
  }, [fetchProfile])

  return (
    <ProfileContext.Provider value={{ profile, loading, invalidate }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (ctx === undefined) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}
