import { useState, useEffect, useMemo, useCallback } from "react"
import { SquadsService, type Squad } from "@/services/squadsService"
import { ProfilesService, type ExploreProfile, profileDisplayName, profileInitials } from "@/services/profilesService"
import { FriendsService, type FriendRequestStatus } from "@/services/friendsService"
import { FeedService, type FeedPostWithAuthor } from "@/services/feedService"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { PostCard } from "@/components/pages/home-feed"
import { SharePostModal } from "@/components/share-post-modal"
import { SquadCard } from "@/components/pages/squads-page"
import { CATEGORIES, CATEGORY_LABELS, DISCOVER_PRIVACY_TOOLTIP } from "@/lib/squad-constants"
import {
  DiscoverMultiCombobox,
  DiscoverSingleCombobox,
  DISCOVER_ALL_CATEGORY,
  DISCOVER_ALL_PRIVACY,
  DISCOVER_DEFAULT_SORT,
  DISCOVER_PRIVACY_OPTIONS,
  DISCOVER_SORT_OPTIONS,
  discoverPrivacyLabel,
  discoverSortLabel,
  filterDiscoverSquadsList,
  isDiscoverSortOption,
  type DiscoverSortOption,
} from "@/components/squads/discover-squad-filters"
import { SquadListCardSkeleton } from "@/components/ui/feed-skeletons"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  TrendingUp,
  Users as UsersIcon,
  Heart,
  MessageCircle,
  CornerUpRight,
  Sparkles,
  ArrowRight,
  FileText,
  Info,
  GraduationCap,
  MapPin,
  UserPlus,
  Loader2,
  UserCheck,
} from "lucide-react"
import { cn, pageMainTitleClass, quadHoverColor } from "@/lib/utils"
import {
  SquiggleHoverCard,
  SquiggleHoverCardContent,
  SquiggleHoverCardTrigger,
} from "@/components/ui/hover-card-with-squiggle"
import { Button } from "@/components/ui/button"
import { TrendingSquadCard, trendingWindowLabel, type TrendingSquad } from "@/components/trending-squad-card"

type ExploreTab = "trending" | "people" | "squads"

function PersonCard({
  person,
  currentUserId,
  friendStatus,
  useFullName,
  onViewUserProfile,
  onAddFriend,
  onAcceptRequest,
  onCancelRequest,
  onUnfriend,
}: {
  person: ExploreProfile
  currentUserId?: string
  friendStatus?: { isFriend: boolean; requestStatus: FriendRequestStatus }
  useFullName?: boolean
  onViewUserProfile?: (userId: string) => void
  onAddFriend?: (userId: string) => void
  onAcceptRequest?: (userId: string) => void
  onCancelRequest?: (userId: string) => void
  onUnfriend?: (userId: string) => void
}) {
  const name = useFullName
    ? (person.full_name?.trim() || person.public_name?.trim() || "Unknown")
    : profileDisplayName(person)
  const initials = profileInitials(
    useFullName ? { ...person, public_name: person.full_name } : person
  )
  const hoverColor = quadHoverColor(person.id)
  const major = person.major?.trim()
  const year = person.class_year?.trim()
  const majorYear = major && year ? `${major} - ${year}` : major || year || null
  const location = person.location?.trim()
  const isOwnProfile = currentUserId === person.id
  const showFriendButton = !isOwnProfile && currentUserId && friendStatus !== undefined
  const isFriend = friendStatus?.isFriend
  const requestStatus = friendStatus?.requestStatus
  const [actionLoading, setActionLoading] = useState(false)

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAddFriend || actionLoading) return
    setActionLoading(true)
    try {
      await onAddFriend(person.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAcceptRequest || actionLoading) return
    setActionLoading(true)
    try {
      await onAcceptRequest(person.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelRequest = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onCancelRequest || actionLoading) return
    setActionLoading(true)
    try {
      await onCancelRequest(person.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnfriend = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onUnfriend || actionLoading) return
    setActionLoading(true)
    try {
      await onUnfriend(person.id)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCardClick = () => onViewUserProfile?.(person.id)

  return (
    <div
      role={onViewUserProfile ? "button" : undefined}
      tabIndex={onViewUserProfile ? 0 : undefined}
      onClick={onViewUserProfile ? handleCardClick : undefined}
      onKeyDown={onViewUserProfile ? (e) => (e.key === "Enter" || e.key === " ") && handleCardClick() : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-all hover:shadow-lg",
        onViewUserProfile && "cursor-pointer",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
      aria-label={onViewUserProfile ? `View ${name}'s profile` : undefined}
    >
      <Avatar className="size-9 shrink-0">
        {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        {(majorYear || location) ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 min-w-0 overflow-hidden">
            {majorYear ? <GraduationCap className="size-3 shrink-0" /> : null}
            {location ? <MapPin className="size-3 shrink-0" /> : null}
            <span className="truncate min-w-0 block">
              {[majorYear, location].filter(Boolean).join(" · ")}
            </span>
          </p>
        ) : null}
        {person.bio?.trim() ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{person.bio}</p>
        ) : null}
      </div>
      {showFriendButton && (
        <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isFriend ? (
            <>
              <span className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                <UserCheck className="size-3" />
                Friends
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-xs"
                disabled={actionLoading}
                onClick={handleUnfriend}
              >
                {actionLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                Unfriend
              </Button>
            </>
          ) : requestStatus === "pending_sent" ? (
            <>
              <span className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                Pending
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-xs"
                disabled={actionLoading}
                onClick={handleCancelRequest}
              >
                {actionLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                Cancel request
              </Button>
            </>
          ) : requestStatus === "pending_received" ? (
            <Button
              size="sm"
              variant="default"
              className="h-6 px-2 text-xs"
              disabled={actionLoading}
              onClick={handleAccept}
            >
              {actionLoading ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
              Accept
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="h-6 px-2 text-xs"
              disabled={actionLoading}
              onClick={handleAddFriend}
            >
              {actionLoading ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
              Add Friend
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Export ──
export function ExplorePage({
  initialTab,
  onTabUsed,
  onGoToSquad,
  onNavigateToPost,
  onViewUserProfile,
}: {
  initialTab?: ExploreTab | null
  onTabUsed?: () => void
  onGoToSquad?: (squadId: string) => void
  onNavigateToPost?: (postId: string) => void
  onViewUserProfile?: (authorId: string) => void
} = {}) {
  const { user } = useAuth()
  const userId = user?.id
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<ExploreTab>(initialTab ?? "trending")

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])

  const handleTabChange = (t: ExploreTab) => {
    setTab(t)
    onTabUsed?.()
  }

  const [search, setSearch] = useState("")
  const [people, setPeople] = useState<ExploreProfile[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [friendStatusMap, setFriendStatusMap] = useState<Record<string, { isFriend: boolean; requestStatus: FriendRequestStatus }>>({})
  const [trendingSquads, setTrendingSquads] = useState<TrendingSquad[]>([])
  const [trendingSquadsLoading, setTrendingSquadsLoading] = useState(true)
  const [trendingPosts, setTrendingPosts] = useState<FeedPostWithAuthor[]>([])
  const [trendingPostsWindowHours, setTrendingPostsWindowHours] = useState<number | undefined>(undefined)
  const [trendingPostsLoading, setTrendingPostsLoading] = useState(true)
  const [squadsExpanded, setSquadsExpanded] = useState(false)
  const [postsExpanded, setPostsExpanded] = useState(false)
  const [discoverSquads, setDiscoverSquads] = useState<Squad[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverCategory, setDiscoverCategory] = useState<string[]>([])
  const [discoverPrivacy, setDiscoverPrivacy] = useState<string[]>([])
  const [discoverSort, setDiscoverSort] = useState<DiscoverSortOption>(DISCOVER_DEFAULT_SORT)
  const [sharePost, setSharePost] = useState<FeedPostWithAuthor | null>(null)

  useEffect(() => {
    let cancelled = false
    setTrendingSquadsLoading(true)
    SquadsService.getTrendingSquads()
      .then((data) => {
        if (!cancelled) setTrendingSquads(data)
      })
      .finally(() => {
        if (!cancelled) setTrendingSquadsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (tab !== "squads") return
    setDiscoverLoading(true)
    SquadsService.getSquadsForDiscover()
      .then(setDiscoverSquads)
      .catch(() => setDiscoverSquads([]))
      .finally(() => setDiscoverLoading(false))
  }, [tab])

  useEffect(() => {
    if (tab !== "people") return
    setPeopleLoading(true)
    ProfilesService.listProfilesForExplore(userId)
      .then(setPeople)
      .catch(() => setPeople([]))
      .finally(() => setPeopleLoading(false))
  }, [tab, userId])

  useEffect(() => {
    if (tab !== "people" || !userId || people.length === 0) {
      setFriendStatusMap({})
      return
    }
    let cancelled = false
    const others = people.filter((p) => p.id !== userId)
    if (others.length === 0) {
      setFriendStatusMap({})
      return
    }
    FriendsService.getFriendStatusBatch(userId, others.map((p) => p.id))
      .then((map) => {
        if (!cancelled) setFriendStatusMap(map)
      })
      .catch(() => {
        if (!cancelled) setFriendStatusMap({})
      })
    return () => { cancelled = true }
  }, [tab, userId, people])

  const fetchTrendingPosts = useCallback(async () => {
    if (!userId) return
    try {
      const { posts, windowHours } = await FeedService.getTrendingPosts(userId)
      setTrendingPosts(posts)
      setTrendingPostsWindowHours(windowHours)
    } catch {
      setTrendingPosts([])
    } finally {
      setTrendingPostsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setTrendingPostsLoading(false)
      return
    }
    let cancelled = false
    setTrendingPostsLoading(true)
    FeedService.getTrendingPosts(userId)
      .then(({ posts, windowHours }) => {
        if (!cancelled) {
          setTrendingPosts(posts)
          setTrendingPostsWindowHours(windowHours)
        }
      })
      .catch(() => {
        if (!cancelled) setTrendingPosts([])
      })
      .finally(() => {
        if (!cancelled) setTrendingPostsLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (!userId || tab !== "trending") return
    const channel = FeedService.subscribeToFeedPosts(null, () => fetchTrendingPosts())
    const aux = FeedService.subscribeToFeedAuxiliary(null, () => fetchTrendingPosts())
    return () => {
      FeedService.unsubscribeFromFeedPosts(channel)
      aux.unsubscribe()
    }
  }, [userId, tab, fetchTrendingPosts])

  const filteredTrendingSquads = useMemo(() => {
    if (tab !== "trending") return trendingSquads
    const term = search.trim().toLowerCase()
    if (!term) return trendingSquads
    return trendingSquads.filter((s) => s.name.toLowerCase().includes(term))
  }, [tab, search, trendingSquads])

  const filteredTrendingPosts = useMemo(() => {
    if (tab !== "trending") return trendingPosts
    const term = search.trim().toLowerCase()
    if (!term) return trendingPosts
    return trendingPosts.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(term) ||
        (p.content ?? "").toLowerCase().includes(term) ||
        (p.source_name ?? "").toLowerCase().includes(term)
    )
  }, [tab, search, trendingPosts])

  const filteredPeople = useMemo(() => {
    if (tab !== "people") return people
    const term = search.trim().toLowerCase()
    if (!term) return people
    return people.filter(
      (p) =>
        profileDisplayName(p).toLowerCase().includes(term) ||
        (p.full_name ?? "").toLowerCase().includes(term) ||
        (p.bio ?? "").toLowerCase().includes(term) ||
        (p.major ?? "").toLowerCase().includes(term) ||
        (p.location ?? "").toLowerCase().includes(term)
    )
  }, [tab, search, people])

  const filteredDiscoverSquads = useMemo(() => {
    if (tab !== "squads") return []
    return filterDiscoverSquadsList(
      discoverSquads,
      search,
      discoverCategory,
      discoverPrivacy,
      discoverSort
    )
  }, [
    tab,
    discoverSquads,
    search,
    discoverCategory,
    discoverPrivacy,
    discoverSort,
  ])

  const handleLike = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    if (post.source_type === "squad" && post.source_id) {
      const access = await SquadsService.getSquadPostAccess(post.source_id)
      if (!access?.is_member) {
        toast.error("You can't interact with this post because you're not in the squad.")
        return
      }
    }
    const prevHearted = post.current_user_hearted
    const prevCount = post.heart_count ?? 0
    const nextHearted = !prevHearted
    const nextCount = Math.max(0, prevCount + (nextHearted ? 1 : -1))
    setTrendingPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, current_user_hearted: nextHearted, heart_count: nextCount } : p
      )
    )
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId)
      const syncCount = hearted ? prevCount + 1 : Math.max(0, prevCount - 1)
      setTrendingPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_hearted: hearted, heart_count: syncCount } : p))
      )
    } catch {
      setTrendingPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_hearted: prevHearted, heart_count: prevCount } : p))
      )
      toast.error("Failed to update")
    }
  }

  const handleBookmark = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    try {
      const { pinned } = await FeedService.togglePinPost(post.id, userId)
      setTrendingPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_pinned: pinned } : p))
      )
    } catch {
      toast.error("Failed to update")
    }
  }

  return (
    <>
      <SharePostModal
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
        onShareSuccess={(postId, added) => {
          setTrendingPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
        }}
      />
      <div
        className={cn(
          "mx-auto w-full max-w-5xl px-4 py-4 md:px-6 md:py-6 pb-nav-safe md:pb-6",
          tab === "trending" && "md:flex md:flex-col md:flex-1 md:min-h-0"
        )}
      >
      {/* Header — matches in-tab focus (trending vs people vs discover squads) */}
      <div className="mb-4 shrink-0">
        <h2 className={pageMainTitleClass}>
          {tab === "people"
            ? "People"
            : tab === "squads"
              ? "Discover Squads"
              : "Explore"}
        </h2>
        <p className="hidden text-sm text-muted-foreground md:block">
          {tab === "people"
            ? "Discover people you might know"
            : tab === "squads"
              ? "Browse and join squads on campus"
              : "Discover what's happening on campus"}
        </p>
      </div>

      {/* Search - match Squads page */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            tab === "trending"
              ? "Search by squad name or post topic/body"
              : tab === "people"
                ? "Search people..."
                : "Search by squad name"
          }
          className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
          aria-label={tab === "squads" ? "Search squads to discover" : "Search explore"}
        />
      </div>

      {/* Tabs - match home page Campus/Custom/Friends */}
      <div className="mb-5 w-fit inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
        {(["trending", "people", "squads"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              tab === t
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground active:bg-accent/50"
            )}
          >
            {t === "trending" ? "Trending" : t === "people" ? "People" : "Squads"}
          </button>
        ))}
      </div>

      <div className={cn("flex gap-6", tab === "trending" && "md:flex-1 md:min-h-0 md:overflow-hidden")}>
        {/* Main Content */}
        <div className={cn(
          "flex-1 min-w-0",
          tab === "trending" && "md:min-h-0 md:overflow-hidden"
        )}>
          {/* Trending Tab: Squads + Posts + Campus Activity */}
          {tab === "trending" && (
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 md:h-full md:min-h-0">
              {/* Trending Squads */}
              <section className="flex flex-col md:min-h-0 md:overflow-hidden">
                <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1 flex items-center gap-2 shrink-0">
                  <TrendingUp className="size-4 text-primary" />
                  Trending Squads
                </h3>
                <p className="text-xs text-muted-foreground mb-3 shrink-0">Most active squads — {trendingWindowLabel(trendingSquads[0]?.window_hours)}</p>
                {trendingSquadsLoading ? (
                  <div className="flex flex-col gap-2 md:overflow-y-auto md:min-h-0 md:flex-1 md:pb-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-[72px] rounded-xl border border-border bg-card animate-pulse" />
                    ))}
                  </div>
                ) : filteredTrendingSquads.length > 0 ? (
                  <div className="flex flex-col gap-2 md:overflow-y-auto md:min-h-0 md:flex-1 md:pr-1 md:pb-6">
                    {(squadsExpanded ? filteredTrendingSquads : filteredTrendingSquads.slice(0, 10)).map((squad, i) => (
                      <TrendingSquadCard
                        key={squad.id}
                        squad={squad}
                        onClick={() => onGoToSquad?.(squad.id)}
                        onJoin={async (id) => {
                          try {
                            await SquadsService.joinSquad(id)
                            toast.success("Joined squad")
                          } catch (e) {
                            toast.error((e as Error).message ?? "Failed to join")
                            throw e
                          }
                        }}
                        onRequestJoin={async (id) => {
                          try {
                            await SquadsService.requestToJoinSquad(id)
                            toast.success("Request sent. Check Notifications for the response.")
                          } catch (e) {
                            toast.error((e as Error).message ?? "Failed to send request")
                            throw e
                          }
                        }}
                      />
                    ))}
                    {filteredTrendingSquads.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setSquadsExpanded((v) => !v)}
                        className="mt-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {squadsExpanded
                          ? "See less"
                          : `See ${filteredTrendingSquads.length - 10} more ${filteredTrendingSquads.length === 11 ? "squad" : "squads"}`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 shrink-0">
                    {search.trim() ? "No squads match your search." : "No trending squads yet."}
                  </p>
                )}
              </section>

              {/* Trending Posts */}
              <section className="flex flex-col md:min-h-0 md:overflow-hidden">
                <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1 flex items-center gap-2 shrink-0">
                  <Sparkles className="size-4 text-primary" />
                  Trending Posts
                </h3>
                <p className="text-xs text-muted-foreground mb-3 shrink-0">Most replied and hearted posts — {trendingWindowLabel(trendingPostsWindowHours)}</p>
                {trendingPostsLoading ? (
                  <div className="flex flex-col gap-2 md:overflow-y-auto md:min-h-0 md:flex-1 md:pb-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
                    ))}
                  </div>
                ) : filteredTrendingPosts.length > 0 ? (
                  <div className="flex flex-col gap-2 md:overflow-y-auto md:min-h-0 md:flex-1 md:pr-1 md:pb-6">
                    {(postsExpanded ? filteredTrendingPosts : filteredTrendingPosts.slice(0, 10)).map((post, i) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        userId={userId}
                        onLike={() => handleLike(post)}
                        onBookmark={() => handleBookmark(post)}
                        onOpenDetail={() => onNavigateToPost?.(post.id)}
                        onGoToSquad={onGoToSquad}
                        sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                        onVote={() => {}}
                        sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                        onOpenUserProfile={onViewUserProfile}
                        onSharePost={(p) => setSharePost(p)}
                        isMobile={isMobile}
                        trendingRank={i + 1}
                      />
                    ))}
                    {filteredTrendingPosts.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setPostsExpanded((v) => !v)}
                        className="mt-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {postsExpanded
                          ? "See less"
                          : `See ${filteredTrendingPosts.length - 10} more ${filteredTrendingPosts.length === 11 ? "post" : "posts"}`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 shrink-0">
                    {search.trim() ? "No posts match your search." : "No trending posts yet."}
                  </p>
                )}
              </section>
            </div>
          )}

          {/* People Tab */}
          {tab === "people" && (
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {peopleLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SquadListCardSkeleton key={i} />)
              ) : filteredPeople.length > 0 ? (
                filteredPeople.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    currentUserId={userId}
                    friendStatus={friendStatusMap[person.id]}
                    useFullName
                    onViewUserProfile={onViewUserProfile}
                    onAddFriend={async (id) => {
                      await FriendsService.sendFriendRequest(id)
                      toast.success("Friend request sent")
                      setFriendStatusMap((prev) => ({ ...prev, [id]: { isFriend: prev[id]?.isFriend ?? false, requestStatus: "pending_sent" } }))
                    }}
                    onAcceptRequest={async (id) => {
                      await FriendsService.acceptFriendRequest(id)
                      toast.success("Friend request accepted")
                      setFriendStatusMap((prev) => ({ ...prev, [id]: { isFriend: true, requestStatus: null } }))
                    }}
                    onCancelRequest={async (id) => {
                      await FriendsService.cancelFriendRequest(id)
                      toast.success("Friend request cancelled")
                      setFriendStatusMap((prev) => ({ ...prev, [id]: { isFriend: prev[id]?.isFriend ?? false, requestStatus: null } }))
                    }}
                    onUnfriend={async (id) => {
                      await FriendsService.removeFriend(id)
                      toast.success("Removed from friends")
                      setFriendStatusMap((prev) => ({ ...prev, [id]: { isFriend: false, requestStatus: null } }))
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  {search.trim() ? "No people match your search." : "No people to show."}
                </p>
              )}
            </div>
          )}

          {/* Squads Tab - matches Squads page Discover */}
          {tab === "squads" && (
            <div className="w-full">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <DiscoverMultiCombobox
                  label="Category"
                  items={[...CATEGORIES]}
                  value={discoverCategory}
                  onValueChange={setDiscoverCategory}
                  formatLabel={(cat) => CATEGORY_LABELS[cat] || cat}
                  placeholder="Add category…"
                  allOption={{ value: DISCOVER_ALL_CATEGORY, label: "All categories" }}
                />
                <DiscoverMultiCombobox
                  label={
                    <>
                      <SquiggleHoverCard>
                        <SquiggleHoverCardTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 cursor-help border-0 bg-transparent p-0 text-left text-inherit"
                            aria-label="About privacy in Discover"
                          >
                            Privacy
                            <Info className="size-3 shrink-0 opacity-70" />
                          </button>
                        </SquiggleHoverCardTrigger>
                        <SquiggleHoverCardContent className="w-[min(15rem,calc(100vw-2rem))] [text-wrap:normal]">
                          {DISCOVER_PRIVACY_TOOLTIP}
                        </SquiggleHoverCardContent>
                      </SquiggleHoverCard>
                    </>
                  }
                  items={[...DISCOVER_PRIVACY_OPTIONS]}
                  value={discoverPrivacy}
                  onValueChange={setDiscoverPrivacy}
                  formatLabel={discoverPrivacyLabel}
                  placeholder="Add privacy…"
                  allOption={{ value: DISCOVER_ALL_PRIVACY, label: "All privacy types" }}
                />
                <DiscoverSingleCombobox
                  label="Sort"
                  items={[...DISCOVER_SORT_OPTIONS]}
                  value={discoverSort}
                  onValueChange={(v) => {
                    if (isDiscoverSortOption(v)) setDiscoverSort(v)
                  }}
                  formatLabel={discoverSortLabel}
                  fallbackValue={DISCOVER_DEFAULT_SORT}
                  placeholder="Sort…"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {discoverLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SquadListCardSkeleton key={i} />)
                ) : (
                  filteredDiscoverSquads.map((squad) => (
                    <SquadCard
                      key={squad.id}
                      squad={squad}
                      onClick={() => onGoToSquad?.(squad.id)}
                    />
                  ))
                )}
              </div>
              {!discoverLoading && filteredDiscoverSquads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <UsersIcon className="size-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No squads found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search or filter</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right sidebar - desktop only, People tab only */}
        {tab === "people" && (
        <aside className="hidden min-[900px]:flex w-96 shrink-0 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground tracking-tight mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Suggested People
            </h3>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground py-2">No suggestions yet.</p>
            </div>
          </div>
        </aside>
        )}
      </div>
    </div>
    </>
  )
}
