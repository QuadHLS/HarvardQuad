"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  Bell,
  Calendar,
  Compass,
  Home,
  MessageCircle,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
  UsersRound,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Kbd, KbdModifierK } from "@/components/ui/kbd"
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer"
import type { PageId } from "@/components/shell/app-shell"
import { MessagingService, type DmConversationRow } from "@/services/messagingService"
import { ProfilesService, profileDisplayName, profileInitials, type ExploreProfile } from "@/services/profilesService"
import {
  quadSearchFieldClass,
  quadSearchIconClass,
  quadSearchMorphTransition,
  quadSearchSurfaceClass,
} from "@/components/shell/quad-search-surface-styles"

/** Matches ExplorePage tabs — deep-link from quick actions without importing the page. */
export type GlobalSearchExploreTab = "trending" | "people" | "squads"

const MAX_CHATS_SHOWN = 8
/** Fetch one extra row to detect if Messages has more threads than we show. */
const CHATS_FETCH_LIMIT = MAX_CHATS_SHOWN + 1
const MAX_PEOPLE = 50

/** Start dimmer + chrome while the pill is still moving (overlap = one continuous motion). */
const OPEN_CHROME_AFTER_MS = 72
/** After blur/card fades (~0.38s) + buffer before portal unmount. */
const CLOSE_UNMOUNT_AFTER_MS = 430

const EASE_FLUID = [0.16, 1, 0.3, 1] as const

type BlurBackdrop = { backdropFilter: string; WebkitBackdropFilter: string }
const BLUR_BACKDROP_ZERO: BlurBackdrop = {
  backdropFilter: "blur(0px)",
  WebkitBackdropFilter: "blur(0px)",
}
const BLUR_BACKDROP_OPEN: BlurBackdrop = {
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
}

const TRANS_INSTANT = { duration: 0 }
const TRANS_BACKDROP_FULL = { duration: 0.38, ease: EASE_FLUID }
const TRANS_REDUCED = { duration: 0.12 }
const TRANS_LIST_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 40,
  mass: 0.88,
  delay: 0.08,
}
const TRANS_LIST_CLOSE_FULL = { duration: 0.34, delay: 0, ease: EASE_FLUID }
const TRANS_LIST_TWEEN_FULL = { duration: 0.46, delay: 0.1, ease: EASE_FLUID }
const TRANS_FOOTER_FULL = { duration: 0.44, delay: 0.13, ease: EASE_FLUID }

const NAV: Array<{
  page: PageId
  label: string
  hint: string
  icon: typeof Home
  keywords: string
}> = [
  { page: "feed", label: "Home", hint: "Campus feed", icon: Home, keywords: "home feed campus quad" },
  { page: "messages", label: "Messages", hint: "Your chats", icon: MessageCircle, keywords: "messages chats dm dms" },
  { page: "explore", label: "Explore", hint: "Trending & discover", icon: Compass, keywords: "explore discover trending people squads" },
  { page: "squads", label: "Squads", hint: "Your groups", icon: Users, keywords: "squads groups clubs teams" },
  { page: "calendar", label: "Calendar", hint: "Events", icon: Calendar, keywords: "calendar events schedule" },
  { page: "notifications", label: "Notifications", hint: "Alerts & invites", icon: Bell, keywords: "notifications alerts invites" },
  { page: "profile", label: "Profile", hint: "Your page", icon: User, keywords: "profile me account settings" },
]

function convLabel(c: DmConversationRow): string {
  return c.other_display_name?.trim() || c.name?.trim() || "Chat"
}

function convSubtitle(c: DmConversationRow): string {
  if (c.squad_id) return "Squad chat"
  if (c.type === "group") return "Group chat"
  return "Direct message"
}

/** Left column width matches avatars so rows align (Supabase / Reddit–style, no icon tile). */
const paletteIconCol = "flex w-9 shrink-0 justify-center text-muted-foreground"
const paletteIconClass = "size-[17px] shrink-0"

export function GlobalSearch({
  open,
  onOpenChange,
  isMobile,
  userId,
  onNavigate,
  onNavigateToExploreTab,
  onOpenConversation,
  onViewProfile,
  onOpenProfileSettings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  userId: string | undefined
  onNavigate: (page: PageId) => void
  onNavigateToExploreTab: (tab: GlobalSearchExploreTab) => void
  onOpenConversation: (conversationId: string) => void
  onViewProfile: (userId: string) => void
  onOpenProfileSettings: () => void
}) {
  const reduceMotion = useReducedMotion()
  /** Only skip shared `layoutId` when reduced motion is explicitly on (`null` = unknown → allow morph). */
  const desktopSearchLayoutId = !isMobile && reduceMotion !== true ? "quad-search-surface" : undefined
  const [overlayMounted, setOverlayMounted] = useState(false)
  const [shellRevealed, setShellRevealed] = useState(false)
  const [conversations, setConversations] = useState<DmConversationRow[]>([])
  const [people, setPeople] = useState<ExploreProfile[]>([])
  const [chatsLoading, setChatsLoading] = useState(false)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [chatsHasMore, setChatsHasMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const peopleShown = useMemo(() => people.slice(0, MAX_PEOPLE), [people])

  useLayoutEffect(() => {
    if (isMobile || !open) return
    setOverlayMounted(true)
  }, [isMobile, open])

  /** Portal is desktop-only; clear stale mount if user crosses the breakpoint (avoids a ghost overlay). */
  useEffect(() => {
    if (isMobile) setOverlayMounted(false)
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return
    if (open || !overlayMounted) return
    const t = window.setTimeout(() => setOverlayMounted(false), CLOSE_UNMOUNT_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [isMobile, open, overlayMounted])

  useEffect(() => {
    if (!open) {
      setShellRevealed(false)
      return
    }
    if (!desktopSearchLayoutId) {
      setShellRevealed(true)
      return
    }
    setShellRevealed(false)
    const t = window.setTimeout(() => setShellRevealed(true), OPEN_CHROME_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [open, desktopSearchLayoutId])

  useEffect(() => {
    if (!open || !userId) {
      setConversations([])
      setPeople([])
      setChatsHasMore(false)
      setChatsLoading(false)
      setPeopleLoading(false)
      return
    }
    let cancelled = false
    setChatsLoading(true)
    setPeopleLoading(true)

    void MessagingService.getRecentConversations(CHATS_FETCH_LIMIT)
      .then((convs) => {
        if (cancelled) return
        setChatsHasMore(convs.length > MAX_CHATS_SHOWN)
        setConversations(convs.slice(0, MAX_CHATS_SHOWN))
      })
      .catch(() => {
        if (!cancelled) {
          setConversations([])
          setChatsHasMore(false)
        }
      })
      .finally(() => {
        if (!cancelled) setChatsLoading(false)
      })

    void ProfilesService.listProfilesForExplore(userId)
      .then((profs) => {
        if (cancelled) return
        setPeople(profs.filter((p) => p.id !== userId))
      })
      .catch(() => {
        if (!cancelled) setPeople([])
      })
      .finally(() => {
        if (!cancelled) setPeopleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, userId])

  useEffect(() => {
    if (!open || !shellRevealed) return
    if (isMobile) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(t)
    }
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, shellRevealed, isMobile])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, close])

  useEffect(() => {
    if (isMobile) return
    if (!open && !overlayMounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobile, open, overlayMounted])

  const desktopSearchPillInner = (
    <>
      <Search className={quadSearchIconClass} aria-hidden strokeWidth={1.75} />
      <CommandInput
        ref={inputRef}
        placeholder="People, chats, pages…"
        className={cn(quadSearchFieldClass, "rounded-full pr-2")}
      />
      <button
        type="button"
        onClick={close}
        className="relative z-10 mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/40 active:bg-secondary/55"
        aria-label="Close"
      >
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </>
  )

  const commandList = useMemo(
    () => (
    <CommandList className="min-h-0 min-w-0 max-h-none flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5 pt-1">
            <CommandEmpty>No results.</CommandEmpty>

            {userId && (
              <CommandGroup heading="Quick actions">
                <CommandItem
                  value="open messages chat dm direct message inbox quick action"
                  onSelect={() => {
                    onNavigate("messages")
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <MessageCircle className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">Open Messages</span>
                    <span className="block text-xs leading-snug text-muted-foreground">Chats &amp; DMs</span>
                  </span>
                </CommandItem>
                <CommandItem
                  value="trending explore discover campus feed quick action"
                  onSelect={() => {
                    onNavigateToExploreTab("trending")
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <TrendingUp className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">What&apos;s trending</span>
                    <span className="block text-xs leading-snug text-muted-foreground">Explore · campus picks</span>
                  </span>
                </CommandItem>
                <CommandItem
                  value="find people profiles students explore quick action"
                  onSelect={() => {
                    onNavigateToExploreTab("people")
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <Users className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">Find people</span>
                    <span className="block text-xs leading-snug text-muted-foreground">Browse campus profiles</span>
                  </span>
                </CommandItem>
                <CommandItem
                  value="squads groups clubs browse discover quick action"
                  onSelect={() => {
                    onNavigateToExploreTab("squads")
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <UsersRound className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">Browse squads</span>
                    <span className="block text-xs leading-snug text-muted-foreground">Discover groups</span>
                  </span>
                </CommandItem>
                <CommandItem
                  value="quad-settings"
                  keywords={[
                    "settings",
                    "account",
                    "privacy",
                    "theme",
                    "appearance",
                    "blocked",
                    "preferences",
                  ]}
                  onSelect={() => {
                    onOpenProfileSettings()
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <Settings className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">Settings</span>
                    <span className="block text-xs leading-snug text-muted-foreground">Account, privacy &amp; theme</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {userId && <CommandSeparator />}

            {userId && (
              <CommandGroup heading="Your chats">
                {chatsLoading ? (
                  <div className="px-2.5 py-2.5 text-center text-sm text-muted-foreground">Loading chats…</div>
                ) : conversations.length === 0 ? (
                  <div className="px-2.5 py-2 text-sm text-muted-foreground">No chats yet. Open Messages to start one.</div>
                ) : (
                  conversations.map((c) => {
                    const title = convLabel(c)
                    const subtitle = convSubtitle(c)
                    const last = c.last_message_content?.trim() ?? ""
                    return (
                    <CommandItem
                      key={c.id}
                      value={`quad-conv-${c.id}`}
                      keywords={[title, subtitle, last].filter((x) => x.length > 0)}
                      onSelect={() => {
                        onOpenConversation(c.id)
                        close()
                      }}
                    >
                      <Avatar className="size-9 shrink-0">
                        {c.other_avatar_url ? <AvatarImage src={c.other_avatar_url} alt="" /> : null}
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {title.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-medium leading-snug text-foreground">{title}</span>
                          {c.squad_id && (
                            <span className="shrink-0 rounded bg-primary/12 px-1 py-0.5 text-[10px] font-medium text-primary">
                              Squad
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-1 text-xs leading-snug text-muted-foreground">
                          {last || subtitle}
                        </span>
                      </span>
                    </CommandItem>
                    )
                  })
                )}
                {chatsHasMore && !chatsLoading && conversations.length > 0 && (
                  <CommandItem
                    value="quad-more-chats"
                    keywords={[
                      "more",
                      "chats",
                      "messages",
                      "inbox",
                      "all",
                      "threads",
                      "see everything",
                    ]}
                    onSelect={() => {
                      onNavigate("messages")
                      close()
                    }}
                  >
                    <span className={paletteIconCol} aria-hidden />
                    <span className="min-w-0 flex-1 text-left text-xs text-muted-foreground">
                      More chats in Messages →
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}

            {userId && <CommandSeparator />}

            {userId && (
              <CommandGroup heading="People on campus">
                {peopleLoading ? (
                  <div className="px-2.5 py-2.5 text-center text-sm text-muted-foreground">Loading people…</div>
                ) : peopleShown.length === 0 ? (
                  <div className="px-2.5 py-2 text-sm text-muted-foreground">No profiles to show yet.</div>
                ) : (
                  peopleShown.map((p) => {
                    const name = profileDisplayName(p)
                    const bioKw = p.bio?.trim().slice(0, 280) ?? ""
                    return (
                      <CommandItem
                        key={p.id}
                        value={`quad-person-${p.id}`}
                        keywords={[
                          name,
                          p.full_name?.trim(),
                          p.public_name?.trim(),
                          p.major?.trim(),
                          p.class_year?.trim(),
                          bioKw || undefined,
                        ].filter((x): x is string => Boolean(x))}
                        onSelect={() => {
                          onViewProfile(p.id)
                          close()
                        }}
                      >
                        <Avatar className="size-9 shrink-0">
                          {p.avatar_url ? <AvatarImage src={p.avatar_url} alt="" /> : null}
                          <AvatarFallback className="bg-muted text-xs font-semibold">{profileInitials(p)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-[15px] font-medium leading-snug text-foreground">{name}</span>
                          {(p.major || p.class_year) && (
                            <span className="block truncate text-xs leading-snug text-muted-foreground">
                              {[p.major, p.class_year].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    )
                  })
                )}
              </CommandGroup>
            )}

            {userId ? <CommandSeparator /> : null}

            <CommandGroup heading="More places">
              {NAV.map(({ page, label, hint, icon: Icon, keywords }) => (
                <CommandItem
                  key={page}
                  value={`${label} ${hint} ${keywords} nav-${page}`}
                  onSelect={() => {
                    onNavigate(page)
                    close()
                  }}
                >
                  <span className={paletteIconCol} aria-hidden>
                    <Icon className={paletteIconClass} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[15px] font-medium leading-snug text-foreground">{label}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{hint}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
    </CommandList>
    ),
    [
      userId,
      peopleShown,
      conversations,
      chatsLoading,
      peopleLoading,
      chatsHasMore,
      close,
      onNavigate,
      onNavigateToExploreTab,
      onOpenConversation,
      onViewProfile,
      onOpenProfileSettings,
    ]
  )

  const reduced = reduceMotion === true
  const uiDuration = reduced ? 0.12 : 0.22
  const openEase = reduced ? undefined : EASE_FLUID
  /** Animate blur radius — parent opacity would keep backdrop-filter invisible in WebKit until ~opaque. */
  const backdropBlurTransition = reduced ? TRANS_REDUCED : TRANS_BACKDROP_FULL
  const openListSpring = reduced ? TRANS_REDUCED : TRANS_LIST_SPRING
  const openListTween = reduced ? TRANS_REDUCED : TRANS_LIST_TWEEN_FULL
  const openListClose = reduced ? TRANS_REDUCED : TRANS_LIST_CLOSE_FULL
  const openFooter = reduced ? TRANS_REDUCED : TRANS_FOOTER_FULL
  const openFooterClose = reduced ? TRANS_REDUCED : TRANS_LIST_CLOSE_FULL

  const desktopDialogTransition = useMemo(
    () => ({
      duration: reduced ? uiDuration : desktopSearchLayoutId ? 0.42 : 0.38,
      delay: reduced ? 0 : desktopSearchLayoutId ? 0.05 : 0,
      ...(openEase ? { ease: openEase } : {}),
    }),
    [reduced, uiDuration, desktopSearchLayoutId, openEase]
  )

  const listHiddenYOffset = desktopSearchLayoutId ? 5 : 4
  const listRevealTransition = shellRevealed
    ? desktopSearchLayoutId
      ? openListSpring
      : openListTween
    : openListClose

  const listBodyDesktop = (
    <motion.div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      initial={false}
      animate={{
        opacity: shellRevealed ? 1 : 0,
        y: shellRevealed ? 0 : listHiddenYOffset,
      }}
      transition={listRevealTransition}
    >
      {commandList}
    </motion.div>
  )

  const portalVisible = open || overlayMounted

  if (typeof document === "undefined") return null

  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={onOpenChange}
        showHeader={false}
        title="Quad search"
        variant="inputStable"
        maxHeightClassName="max-h-[92dvh]"
        scrollBody={false}
        contentClassName="z-[100]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-4 pt-0">
          <Command
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-transparent shadow-none"
            shouldFilter
            label="Quad search"
            loop
          >
            <div className="shrink-0 pt-1 pb-2">
              <div
                className={cn(
                  quadSearchSurfaceClass,
                  "flex min-h-10 items-center transition-colors hover:border-primary/55 hover:bg-secondary/40"
                )}
              >
                {desktopSearchPillInner}
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{commandList}</div>
          </Command>
          <div className="shrink-0 border-t border-border/60 bg-muted/25 px-2 py-2 text-center text-xs text-muted-foreground">
            <div className="mx-2 mb-2 h-px bg-border" aria-hidden />
            <span>Swipe down to close · Results filter as you type</span>
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }

  return createPortal(
    <AnimatePresence>
      {portalVisible ? (
        <motion.div
          key="global-search-overlay"
          className="fixed inset-0 z-[100]"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={TRANS_INSTANT}
        >
          {/*
            Blur: animate backdrop-filter strength, not layer opacity (Safari/Chrome hide backdrop-filter under faded opacity).
            Transparent hit-target is a sibling so it is not inside a filtered/fading wrapper.
          */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-transparent will-change-[backdrop-filter] transform-gpu"
            initial={BLUR_BACKDROP_ZERO}
            animate={open ? BLUR_BACKDROP_OPEN : BLUR_BACKDROP_ZERO}
            transition={backdropBlurTransition}
          />
          <button
            type="button"
            className={cn(
              "absolute inset-0 z-[1] cursor-default bg-transparent",
              !open && "pointer-events-none"
            )}
            aria-label="Close Quad search"
            onClick={close}
          />
          <div className="absolute inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none md:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="global-search-title"
              className={cn(
                "pointer-events-auto flex min-h-0 w-full max-w-[37.5rem] max-h-[min(78dvh,calc(100dvh-2rem))] flex-col rounded-xl",
                /* overflow-visible so layoutId morph from header is not clipped; list scrolls inside inner shell */
                desktopSearchLayoutId ? "overflow-visible" : "overflow-hidden",
                !reduced &&
                  "transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                shellRevealed
                  ? "border border-border bg-card shadow-2xl"
                  : "border border-transparent bg-transparent shadow-none"
              )}
              initial={
                reduced ? false : desktopSearchLayoutId ? false : { opacity: 0, scale: 0.985 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={desktopDialogTransition}
            >
              <h2 id="global-search-title" className="sr-only">
                Quad search
              </h2>

              <Command
                className={cn(
                  "flex min-h-0 min-w-0 flex-1 flex-col rounded-none bg-transparent shadow-none",
                  desktopSearchLayoutId ? "overflow-visible" : "overflow-hidden"
                )}
                shouldFilter
                label="Quad search"
                loop
              >
                <div className="shrink-0 px-3 pt-1.5 pb-2">
                  {desktopSearchLayoutId ? (
                    <motion.div
                      layoutId={desktopSearchLayoutId}
                      className={cn(
                        quadSearchSurfaceClass,
                        "flex min-h-10 items-center transition-colors hover:border-primary/55 hover:bg-secondary/40"
                      )}
                      transition={quadSearchMorphTransition}
                    >
                      {desktopSearchPillInner}
                    </motion.div>
                  ) : (
                    <div
                      className={cn(
                        quadSearchSurfaceClass,
                        "flex min-h-10 items-center transition-colors hover:border-primary/55 hover:bg-secondary/40"
                      )}
                    >
                      {desktopSearchPillInner}
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col",
                    desktopSearchLayoutId && "overflow-hidden rounded-b-xl"
                  )}
                >
                  {listBodyDesktop}
                </div>
              </Command>

              <motion.div
                className="shrink-0 bg-muted/25 px-3 pb-2 pt-2 text-center text-xs text-muted-foreground md:text-sm"
                initial={false}
                animate={{ opacity: shellRevealed ? 1 : 0 }}
                transition={shellRevealed ? openFooter : openFooterClose}
              >
                <div className="mx-2 mb-2 h-px bg-border md:mx-3" aria-hidden />
                <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  <span>to move ·</span>
                  <Kbd>Enter</Kbd>
                  <span>to open ·</span>
                  <Kbd>Esc</Kbd>
                  <span>to close ·</span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <KbdModifierK />
                    <span>anytime</span>
                  </span>
                </span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
