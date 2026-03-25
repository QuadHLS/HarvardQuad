import type { PageId } from "@/components/shell/app-shell"
import {
  mobileHeaderCloudBackdropClass,
  mobileHeaderCloudBackdropMaskStyle,
  mobileHeaderCloudTintPositionClass,
  mobileHeaderCloudTintStyle,
} from "@/components/shell/mobile-chrome-cloud"
import { Search, Bell, Sun, Moon, Monitor, User, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/contexts/ProfileContext"
import { supabase } from "@/lib/supabase"
import {
  quadSearchFieldClass,
  quadSearchIconClass,
  quadSearchMobileChipClass,
  quadSearchMobileChipInnerClass,
  quadSearchMobileIconClass,
  quadSearchMorphTransition,
  quadSearchSurfaceClass,
} from "@/components/shell/quad-search-surface-styles"

interface TopBarProps {
  activePage: PageId
  onNavigate?: (page: PageId) => void
  onGoToMyProfile?: () => void
  onOpenProfileSettings?: () => void
  profile?: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null
  notificationsUnreadCount?: number
  onOpenSearch?: () => void
  /** While global search is open on desktop — hide the header pill so the palette keeps the only `layoutId`. */
  suppressDesktopSearchPill?: boolean
}

export function TopBar({
  activePage: _activePage,
  onNavigate,
  onGoToMyProfile,
  onOpenProfileSettings,
  profile,
  notificationsUnreadCount = 0,
  onOpenSearch,
  suppressDesktopSearchPill = false,
}: TopBarProps) {
  const reduceMotion = useReducedMotion()
  const { user, signOut } = useAuth()
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
      {/* Desktop Search - centered; shared layoutId morphs into global search panel */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden w-full max-w-[min(32rem,calc(100vw-20rem))] -translate-x-1/2 -translate-y-1/2 md:flex">
        {!suppressDesktopSearchPill &&
          (reduceMotion === true ? (
            <div className={cn(quadSearchSurfaceClass, "pointer-events-auto transition-colors hover:border-primary/55 hover:bg-secondary/40")}>
              <Search className={quadSearchIconClass} />
              <button
                type="button"
                onClick={() => onOpenSearch?.()}
                className={cn(
                  quadSearchFieldClass,
                  "w-full rounded-full !px-11 !text-center transition-colors hover:bg-secondary/40"
                )}
                aria-label="Quad search"
              >
                Quad search
              </button>
            </div>
          ) : (
            <motion.div
              layoutId="quad-search-surface"
              className={cn(quadSearchSurfaceClass, "pointer-events-auto transition-colors hover:border-primary/55 hover:bg-secondary/40")}
              transition={quadSearchMorphTransition}
            >
              <Search className={quadSearchIconClass} />
              <button
                type="button"
                onClick={() => onOpenSearch?.()}
                className={cn(
                  quadSearchFieldClass,
                  "w-full rounded-full !px-11 !text-center transition-colors hover:bg-secondary/40"
                )}
                aria-label="Quad search"
              >
                Quad search
              </button>
            </motion.div>
          ))}
      </div>
      {/*
        Desktop: this row is flex-1 and comes after the absolutely centered search in the DOM.
        Same z-index would stack it on top and steal clicks over the search pill — use
        md:pointer-events-none here and re-enable on actual controls.
      */}
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pl-4 pr-2 md:pointer-events-none md:justify-end md:gap-4 md:px-6">
        {/* Mobile: opens same search sheet */}
        <div className="relative min-w-0 flex-1 md:hidden">
          <Search className={quadSearchMobileIconClass} aria-hidden strokeWidth={1.75} />
          <button
            type="button"
            onClick={() => onOpenSearch?.()}
            className={cn(quadSearchMobileChipClass, quadSearchMobileChipInnerClass)}
            aria-label="Quad search"
          >
            Quad search
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 md:pointer-events-auto">
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

        {/* Profile — mobile: tap opens profile; desktop: account menu */}
        <div className="md:hidden">
          <button
            type="button"
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
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-lg outline-offset-2 hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Account menu"
              >
                <Avatar className="size-8 cursor-pointer">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {(profile?.public_name?.trim() || profile?.full_name?.trim() || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                My account
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => {
                  if (onGoToMyProfile) onGoToMyProfile()
                  else onNavigate?.("profile")
                }}
              >
                <User />
                Your profile
              </DropdownMenuItem>
              {onOpenProfileSettings ? (
                <DropdownMenuItem onSelect={() => onOpenProfileSettings()}>
                  <Settings />
                  Settings
                </DropdownMenuItem>
              ) : null}
              {user ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </header>
  )
}
