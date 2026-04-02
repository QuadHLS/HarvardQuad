import { useState, useEffect, useRef, useCallback } from "react"
import { LayoutGroup } from "framer-motion"
import { GlobalSearch } from "@/components/shell/global-search"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { BlocksService } from "@/services/blocksService"
import { useProfile } from "@/contexts/ProfileContext"
import { useUnreadMessagesCount } from "@/hooks/use-unread-messages-count"
import { useUnreadNotificationsCount } from "@/hooks/use-unread-notifications-count"
import { useNotificationToasts } from "@/hooks/use-notification-toasts"
import { useTheme } from "next-themes"
import { useIsMobile } from "@/hooks/use-mobile"
import { PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { DesktopSidebar } from "@/components/shell/desktop-sidebar"
import { TopBar } from "@/components/shell/top-bar"
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav"
import { SubViewProvider, useSubView } from "@/hooks/use-sub-view"
import { HomeFeed } from "@/components/pages/home-feed"
import { SquadsPage } from "@/components/pages/squads-page"
import { MessagesPage } from "@/components/pages/messages-page"
import { CalendarPage } from "@/components/pages/calendar-page"
import { ProfilePage, type ProfilePageInitialTab } from "@/components/pages/profile-page"
import { NotificationsPage } from "@/components/pages/notifications-page"
import { ExplorePage } from "@/components/pages/explore-page"

export type PageId = "feed" | "squads" | "messages" | "calendar" | "profile" | "notifications" | "explore"

function AppShellInner() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [activePage, setActivePage] = useState<PageId>("feed")
  const messagesUnreadCount = useUnreadMessagesCount()
  const notificationsUnreadCount = useUnreadNotificationsCount(activePage === "notifications")
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [profileReturnToPage, setProfileReturnToPage] = useState<PageId | null>(null)
  const [squadToOpenId, setSquadToOpenId] = useState<string | null>(null)
  const [postToOpenId, setPostToOpenId] = useState<string | null>(null)
  const [conversationIdToOpen, setConversationIdToOpen] = useState<string | null>(null)
  const [exploreInitialTab, setExploreInitialTab] = useState<"trending" | "people" | "squads" | null>(null)
  const [profileInitialTab, setProfileInitialTab] = useState<ProfilePageInitialTab | null>(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  useEffect(() => {
    if (activePage !== "profile") setProfileInitialTab(null)
  }, [activePage])

  const navigate = useCallback((p: PageId) => {
    setPostToOpenId((prev) => (p !== "feed" ? null : prev))
    setConversationIdToOpen((prev) => (p !== "messages" ? null : prev))
    setViewingUserId((prev) => (p !== "profile" ? null : prev))
    setActivePage(p)
  }, [])

  const openMessagesWithConversation = useCallback((conversationId: string) => {
    setConversationIdToOpen(conversationId)
    navigate("messages")
  }, [navigate])

  const goToMyProfile = useCallback(() => {
    setViewingUserId(null)
    setActivePage("profile")
  }, [])

  const openProfileSettings = useCallback(() => {
    setViewingUserId(null)
    setProfileInitialTab("settings")
    navigate("profile")
  }, [navigate])

  const handleViewUserProfile = useCallback(
    async (id: string, returnToPage: PageId) => {
      if (id === user?.id) {
        setViewingUserId(id)
        setProfileReturnToPage(returnToPage)
        navigate("profile")
        return
      }
      if (!user?.id) {
        setViewingUserId(id)
        setProfileReturnToPage(returnToPage)
        navigate("profile")
        return
      }
      try {
        const blocked = await BlocksService.isBlockedEither(user.id, id)
        if (blocked) {
          toast.error("You cannot view this profile. Unblock in Settings.")
          return
        }
      } catch {
        toast.error("Failed to load profile")
        return
      }
      setViewingUserId(id)
      setProfileReturnToPage(returnToPage)
      navigate("profile")
    },
    [user?.id, navigate]
  )

  useNotificationToasts(navigate, activePage, openMessagesWithConversation)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarHoverMode, setSidebarHoverMode] = useState(false)
  const SIDEBAR_COLLAPSE_BREAKPOINT = 1200
  const { isSubView } = useSubView()
  const isMobile = useIsMobile()
  const { setTheme } = useTheme()
  const appliedInitialTheme = useRef(false)

  useEffect(() => {
    if (!appliedInitialTheme.current && profile?.theme && ["light", "dark", "system"].includes(profile.theme)) {
      setTheme(profile.theme as "light" | "dark" | "system")
      appliedInitialTheme.current = true
    }
  }, [profile?.theme, setTheme])

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < SIDEBAR_COLLAPSE_BREAKPOINT) {
        setSidebarOpen(false)
        setSidebarHoverMode(true)
      } else if (activePage === "messages" || activePage === "calendar") {
        setSidebarOpen(false)
        setSidebarHoverMode(true)
      } else {
        setSidebarOpen(true)
        setSidebarHoverMode(false)
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activePage])

  // Messages & Calendar: auto-close desktop sidebar when navigating in (same rail space as messages)
  const prevPageRef = useRef<PageId>(activePage)
  useEffect(() => {
    if (
      (activePage === "messages" || activePage === "calendar") &&
      prevPageRef.current !== activePage &&
      window.innerWidth >= SIDEBAR_COLLAPSE_BREAKPOINT
    ) {
      setSidebarOpen(false)
      setSidebarHoverMode(true)
    }
    prevPageRef.current = activePage
  }, [activePage])

  const globalSearchOpenRef = useRef(globalSearchOpen)
  globalSearchOpenRef.current = globalSearchOpen

  useEffect(() => {
    if (!user) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setGlobalSearchOpen(!globalSearchOpenRef.current)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [user])

  return (
    <LayoutGroup id="quad-search">
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      {/* iOS safe area top fill - matches background behind Dynamic Island / notch */}
      <div className="h-safe-top shrink-0 bg-background md:hidden" />

      {!(isSubView && isMobile) && (
      <TopBar
        activePage={activePage}
        onNavigate={navigate}
        onGoToMyProfile={goToMyProfile}
        onOpenProfileSettings={openProfileSettings}
        profile={profile}
        notificationsUnreadCount={notificationsUnreadCount}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        suppressDesktopSearchPill={globalSearchOpen}
      />
      )}

      {user && (
        <GlobalSearch
          open={globalSearchOpen}
          onOpenChange={setGlobalSearchOpen}
          isMobile={isMobile}
          userId={user.id}
          onNavigate={navigate}
          onNavigateToExploreTab={(tab) => {
            setExploreInitialTab(tab)
            navigate("explore")
          }}
          onOpenConversation={(id) => {
            setConversationIdToOpen(id)
            navigate("messages")
          }}
          onViewProfile={(id) => handleViewUserProfile(id, activePage)}
          onOpenProfileSettings={openProfileSettings}
        />
      )}

      <div className="flex flex-1 min-h-0 md:overflow-hidden max-md:overflow-visible">
        {/* Desktop Sidebar + toggle rail - hidden on mobile */}
        <div
          className="hidden md:flex shrink-0 relative"
          onMouseEnter={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const y = e.clientY - rect.top
            if (y < rect.height * 0.1) return
            sidebarHoverMode && setSidebarOpen(true)
          }}
          onMouseLeave={() => sidebarHoverMode && setSidebarOpen(false)}
        >
          <div
            className={cn(
              "flex h-full transition-[width] duration-300 ease-in-out",
              sidebarOpen ? "w-[250px] overflow-visible" : "w-0 overflow-hidden"
            )}
          >
            <DesktopSidebar
              activePage={activePage}
              onNavigate={navigate}
              onGoToMyProfile={goToMyProfile}
              profile={profile}
              messagesUnreadCount={messagesUnreadCount}
              notificationsUnreadCount={notificationsUnreadCount}
            />
          </div>
          <div
            className={cn(
              "relative flex shrink-0 overflow-visible transition-all duration-300 ease-in-out",
              sidebarOpen ? "w-px" : "w-8 ml-8"
            )}
          >
            <div className={cn("absolute inset-0 w-px bg-border", !sidebarOpen && "left-1/2 -translate-x-1/2")} />
            <button
              type="button"
              onClick={() => {
                setSidebarOpen((o) => {
                  if (o) setSidebarHoverMode(true)
                  else setSidebarHoverMode(false)
                  return !o
                })
              }}
              className="absolute left-1/2 top-4 z-10 flex size-[35px] -translate-x-1/2 items-center justify-center rounded-full bg-background border border-border text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-colors"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
            </button>
          </div>
          {/* Buffer zone: overlay so layout matches click-expand; cursor must cross into content before sidebar closes */}
          {sidebarHoverMode && sidebarOpen && (
            <div className="absolute left-full top-0 bottom-0 w-8 shrink-0" aria-hidden />
          )}
        </div>

        {/* Main Content Area - shift left when sidebar closed so Hidden section lines touch vertical separator */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden max-md:overflow-visible md:pl-4",
            !sidebarOpen && "md:-ml-4"
          )}
        >
          <main
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain",
              /* Scroll surface extends under frosted header so there is no hard seam (mirrors content behind bottom nav). */
              !(isSubView && isMobile) && "max-md:-mt-14 max-md:scroll-pt-14 max-md:pt-14"
            )}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {activePage === "feed" && (
              <HomeFeed
                initialPostId={postToOpenId}
                onViewUserProfile={(id) => handleViewUserProfile(id, "feed")}
                onGoToSquad={(squadId) => {
                  setSquadToOpenId(squadId)
                  navigate("squads")
                }}
                onNavigateToExplore={() => {
                  setExploreInitialTab("people")
                  navigate("explore")
                }}
                onNavigateToDiscoverSquads={() => {
                  setExploreInitialTab("squads")
                  navigate("explore")
                }}
              />
            )}
            {activePage === "squads" && (
              <SquadsPage
                squadToOpenId={squadToOpenId}
                onSquadOpenCleared={() => setSquadToOpenId(null)}
                onViewUserProfile={(id) => handleViewUserProfile(id, "squads")}
              />
            )}
            {activePage === "messages" && (
              <MessagesPage
                conversationIdToOpen={conversationIdToOpen}
                onViewUserProfile={(id) => handleViewUserProfile(id, "messages")}
                onGoToSquad={(squadId) => {
                  setSquadToOpenId(squadId)
                  navigate("squads")
                }}
                onNavigateToPost={(postId) => {
                  setPostToOpenId(postId)
                  navigate("feed")
                }}
                onNavigateToExplore={() => {
                  setExploreInitialTab("people")
                  navigate("explore")
                }}
              />
            )}
            {activePage === "calendar" && <CalendarPage />}
            {activePage === "notifications" && (
              <NotificationsPage
                onNavigateToPost={(postId) => {
                  setPostToOpenId(postId)
                  navigate("feed")
                }}
                onNavigateToConversation={(convId) => {
                  setConversationIdToOpen(convId)
                  navigate("messages")
                }}
                onNavigateToSquad={(squadId) => {
                  setSquadToOpenId(squadId)
                  navigate("squads")
                }}
                onViewUserProfile={(id) => handleViewUserProfile(id, "notifications")}
              />
            )}
            {activePage === "explore" && (
              <div className="min-h-0 flex-1 flex flex-col">
              <ExplorePage
                initialTab={exploreInitialTab}
                onTabUsed={() => setExploreInitialTab(null)}
                onGoToSquad={(squadId) => {
                  setSquadToOpenId(squadId)
                  navigate("squads")
                }}
                onNavigateToPost={(postId) => {
                  setPostToOpenId(postId)
                  navigate("feed")
                }}
                onViewUserProfile={(id) => handleViewUserProfile(id, "explore")}
              />
              </div>
            )}
            {activePage === "profile" && (
              <div className="w-full min-w-0">
                <ProfilePage
                  initialTab={profileInitialTab}
                  onInitialTabUsed={() => setProfileInitialTab(null)}
                  viewingUserId={viewingUserId}
                  onBackFromViewing={() => {
                    setViewingUserId(null)
                    if (profileReturnToPage) {
                      navigate(profileReturnToPage)
                      setProfileReturnToPage(null)
                    }
                  }}
                  onViewUserProfile={(id) => handleViewUserProfile(id, profileReturnToPage ?? "feed")}
                  onGoToSquad={(squadId) => {
                    setSquadToOpenId(squadId)
                    navigate("squads")
                  }}
                  onNavigateToExplore={() => {
                    setExploreInitialTab("people")
                    navigate("explore")
                  }}
                  onNavigateToDiscoverSquads={() => {
                    setExploreInitialTab("squads")
                    navigate("explore")
                  }}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav - hidden on desktop and when in a sub-view */}
      {!isSubView && (
        <MobileBottomNav
          activePage={activePage}
          onNavigate={navigate}
          messagesUnreadCount={messagesUnreadCount}
        />
      )}
    </div>
    </LayoutGroup>
  )
}

export function AppShell() {
  return (
    <SubViewProvider>
      <AppShellInner />
    </SubViewProvider>
  )
}
