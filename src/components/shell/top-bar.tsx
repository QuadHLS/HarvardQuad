import type { PageId } from "@/components/shell/app-shell"
import {
  mobileHeaderCloudBackdropClass,
  mobileHeaderCloudBackdropMaskStyle,
  mobileHeaderCloudTintPositionClass,
  mobileHeaderCloudTintStyle,
} from "@/components/shell/mobile-chrome-cloud"
import { Search, Bell, Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/contexts/ProfileContext"
import { supabase } from "@/lib/supabase"

interface TopBarProps {
  activePage: PageId
  onNavigate?: (page: PageId) => void
  onGoToMyProfile?: () => void
  profile?: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null
  notificationsUnreadCount?: number
}

export function TopBar({ activePage, onNavigate, onGoToMyProfile, profile, notificationsUnreadCount = 0 }: TopBarProps) {
  const { user } = useAuth()
  const { invalidate } = useProfile()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleThemeChange = async (next: "light" | "dark" | "system") => {
    setTheme(next)
    if (user) {
      await supabase.from("profiles").update({ theme: next, updated_at: new Date().toISOString() }).eq("id", user.id)
      invalidate()
    }
  }

  return (
    <header
      className={cn(
        /* z-20 on mobile so backdrop/tint bleed below h-14 paints above main (later DOM sibling). */
        "relative z-20 isolate flex h-14 shrink-0 items-center gap-2 overflow-visible border-b-0 bg-transparent",
        "md:z-10 md:h-16 md:gap-4 md:border-b md:border-border md:bg-background"
      )}
    >
      <div
        className={mobileHeaderCloudBackdropClass}
        style={mobileHeaderCloudBackdropMaskStyle}
        aria-hidden
      />
      <div className={mobileHeaderCloudTintPositionClass} style={mobileHeaderCloudTintStyle} aria-hidden />
      {/* Logo - desktop only (hidden on mobile) */}
      <div className="relative z-10 hidden md:flex w-[250px] shrink-0 items-center justify-start pl-4">
        <button
          type="button"
          onClick={() => onNavigate?.("feed")}
          className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Quad home"
        >
          <img src="/QUAD.svg" alt="" className="h-10 md:h-12 w-auto rounded-none" />
        </button>
      </div>
      {/* Desktop Search - centered in full header */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden w-full max-w-[min(32rem,calc(100vw-20rem))] -translate-x-1/2 -translate-y-1/2 md:flex">
        <div className="relative w-full pointer-events-auto">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search people, squads, posts..."
            className="h-10 w-full rounded-full border border-primary/40 bg-background pl-11 pr-5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search"
          />
        </div>
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pl-4 pr-2 md:justify-end md:gap-4 md:px-6">
        {/* Mobile: same search field as desktop, inline */}
        <div className="relative min-w-0 flex-1 md:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search people, squads, posts..."
            className="h-9 w-full rounded-full border border-primary/25 bg-background/45 py-2 pl-10 pr-3 text-sm text-foreground shadow-none backdrop-blur-md placeholder:text-muted-foreground focus:outline-none dark:bg-background/35"
            aria-label="Search"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
        {/* Notifications */}
        <button
          onClick={() => onNavigate?.("notifications")}
          className="relative flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80 transition-colors"
          aria-label={notificationsUnreadCount > 0 ? `Notifications (${notificationsUnreadCount} ${notificationsUnreadCount === 1 ? "unread notification" : "unread notifications"})` : "Notifications"}
        >
          <Bell className="size-5" />
          {notificationsUnreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
              {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle - cycles light → dark → system */}
        {mounted && (
          <button
            onClick={() => {
              const current = theme ?? "system"
              const next = (current === "light" ? "dark" : current === "dark" ? "system" : "light") as "light" | "dark" | "system"
              handleThemeChange(next)
            }}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80 transition-colors"
            aria-label={`Theme: ${theme ?? "system"} — click to cycle`}
          >
            {(theme ?? "system") === "light" ? (
              <Sun className="size-5" />
            ) : (theme ?? "system") === "dark" ? (
              <Moon className="size-5" />
            ) : (
              <Monitor className="size-5" />
            )}
          </button>
        )}

        {/* Profile - avatar, click navigates to own profile */}
        <button
          onClick={() => (onGoToMyProfile ? onGoToMyProfile() : onNavigate?.("profile"))}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
          aria-label="Your profile"
        >
          <Avatar className="size-8 cursor-pointer">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {(profile?.public_name?.trim() || profile?.full_name?.trim() || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        </div>
      </div>
    </header>
  )
}
