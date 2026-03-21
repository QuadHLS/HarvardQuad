import { useState } from "react"
import { Heart, MessageCircle, Users as UsersIcon, MessageSquare, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  SquiggleHoverCard,
  SquiggleHoverCardContent,
  SquiggleHoverCardTrigger,
} from "@/components/ui/hover-card-with-squiggle"
import { cn, quadAvatarColor, quadHoverColor } from "@/lib/utils"
import { CATEGORY_LABELS, PRIVACY_BADGE_TOOLTIPS } from "@/lib/squad-constants"

export type TrendingSquad = {
  id: string
  name: string
  category: string | null
  avatar_url: string | null
  cover_url?: string | null
  type: "open" | "restricted"
  is_joined: boolean
  join_request_status: "pending" | "approved" | "denied" | null
  member_count: number
  post_count: number
  engagement_24h: number
  change_pct: number
  window_hours?: number
  posts_in_window?: number
  replies_in_window?: number
  hearts_in_window?: number
}

export function trendingWindowLabel(hours: number | undefined): string {
  if (hours == null || hours < 1) return "3 days:"
  if (hours < 24) return hours === 1 ? "1h:" : `${hours}h:`
  if (hours < 48) return "24hr:"
  const days = Math.round(hours / 24)
  return days === 1 ? "1 day:" : `${days} days:`
}

export function TrendingSquadCard({
  squad,
  onClick,
  onJoin,
  onRequestJoin,
  compact,
  homePageStyle,
}: {
  squad: TrendingSquad
  onClick: () => void
  onJoin: (squadId: string) => void
  onRequestJoin: (squadId: string) => void
  /** Compact style: same size as My Squads */
  compact?: boolean
  /** Home page only: hide reply count, 3 stats in one row */
  homePageStyle?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [localJoined, setLocalJoined] = useState(squad.is_joined)
  const [localRequestStatus, setLocalRequestStatus] = useState(squad.join_request_status)
  const isUp = squad.change_pct > 0
  const isDown = squad.change_pct < 0
  const changeLabel =
    isUp ? `+${squad.change_pct}%` : isDown ? `${squad.change_pct}%` : null

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading || localJoined) return
    setLoading(true)
    try {
      await onJoin(squad.id)
      setLocalJoined(true)
    } catch {
      /* toast shown by parent */
    } finally {
      setLoading(false)
    }
  }

  const handleRequestJoin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading || localJoined || localRequestStatus === "pending") return
    setLoading(true)
    try {
      await onRequestJoin(squad.id)
      setLocalRequestStatus("pending")
    } catch {
      /* toast shown by parent */
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = localJoined
    ? "Joined"
    : squad.type === "open"
      ? "Join"
      : localRequestStatus === "pending"
        ? "Request sent"
        : "Request to join"

  const showJoinButton = squad.type === "open" && !localJoined
  const showRequestButton =
    squad.type === "restricted" && !localJoined && localRequestStatus !== "pending"
  const hoverColor = quadHoverColor(squad.id)
  const hasCover = !!squad.cover_url
  const avatarUrl = squad.avatar_url && !imgError ? squad.avatar_url : null

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        className={cn(
          "relative flex items-center gap-3 rounded-lg border border-border overflow-hidden p-3 text-left transition-all cursor-pointer hover:shadow-lg w-full",
          !hasCover && "bg-card",
          hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
          hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
          hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
          hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
        )}
        style={
          hasCover
            ? {
                backgroundImage: `url(${squad.cover_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {hasCover && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/15 to-black/10"
            aria-hidden
          />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
              style={{ backgroundColor: quadAvatarColor(squad.id) }}
            >
              {squad.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <div className="flex items-center gap-2 flex-nowrap">
              <h4
                className={cn(
                  "text-sm font-semibold truncate",
                  hasCover ? "text-white" : "text-foreground"
                )}
              >
                #{squad.name}
              </h4>
              {!homePageStyle && (
                <span className={cn("flex items-center gap-1 text-xs shrink-0", hasCover ? "text-white/90" : "text-muted-foreground")}>
                  <UsersIcon className="size-3" />
                  {squad.member_count ?? 0}
                </span>
              )}
            </div>
            {homePageStyle ? (
              <div
                className={cn(
                  "flex items-center gap-x-3 gap-y-0 text-xs flex-nowrap",
                  hasCover ? "text-white/90" : "text-muted-foreground"
                )}
              >
                <span className={cn("shrink-0", hasCover ? "text-white/70" : "text-muted-foreground/80")}>
                  {trendingWindowLabel(squad.window_hours)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3 shrink-0 opacity-80" />
                  {squad.posts_in_window ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="size-3 shrink-0 opacity-80" />
                  {squad.hearts_in_window ?? 0}
                </span>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "flex items-center gap-x-3 gap-y-0 text-xs flex-nowrap",
                    hasCover ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("shrink-0", hasCover ? "text-white/70" : "text-muted-foreground/80")}>
                    {trendingWindowLabel(squad.window_hours)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3 shrink-0 opacity-80" />
                    {squad.posts_in_window ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3 shrink-0 opacity-80" />
                    {squad.replies_in_window ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="size-3 shrink-0 opacity-80" />
                    {squad.hearts_in_window ?? 0}
                  </span>
                  {changeLabel && (
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-medium ml-auto",
                        hasCover && isUp && "bg-white text-emerald-600 dark:text-emerald-500",
                        hasCover && isDown && "bg-white text-red-600 dark:text-red-500",
                        hasCover && !isUp && !isDown && "bg-white text-muted-foreground",
                        !hasCover && isUp && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        !hasCover && isDown && "bg-red-500/15 text-red-600 dark:text-red-400",
                        !hasCover && !isUp && !isDown && "bg-secondary text-muted-foreground"
                      )}
                    >
                      {changeLabel}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-center justify-center gap-1 shrink-0">
            {localJoined && (
              <Badge variant="outline" className={cn("text-xs px-2 py-0.5 rounded-full text-primary border-primary/30", hasCover && "bg-white border-white/80")}>
                Joined
              </Badge>
            )}
            {squad.type === "restricted" && !localJoined && localRequestStatus === "pending" && (
              <Badge variant="secondary" className={cn("text-xs px-2 py-0.5", hasCover && "bg-white text-foreground border-transparent")}>
                Request sent
              </Badge>
            )}
            {!localJoined && localRequestStatus !== "pending" && (
              <button
                type="button"
                disabled={loading}
                onClick={showJoinButton ? handleJoin : showRequestButton ? handleRequestJoin : undefined}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors shrink-0",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {loading ? "…" : squad.type === "open" ? "Join" : "Request to join"}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Full card: match SquadCard layout (vertical flex-col), percentage at top, members/posts/replies/hearts at bottom
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "relative flex flex-col rounded-xl border border-border overflow-hidden p-4 text-left transition-all cursor-pointer hover:shadow-lg",
        !hasCover && "bg-card",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
      style={
        hasCover
          ? {
              backgroundImage: `url(${squad.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {hasCover && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/15 to-black/10"
          aria-hidden
        />
      )}
      <div className="relative z-10 flex flex-col">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-bold overflow-hidden",
              !avatarUrl && "text-primary-foreground"
            )}
            style={avatarUrl ? undefined : { backgroundColor: quadAvatarColor(squad.id) }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" onError={() => setImgError(true)} />
            ) : (
              (squad.name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("text-base font-semibold truncate", hasCover ? "text-white" : "text-foreground")}>
                {squad.name}
              </h3>
              {!homePageStyle && (
                <span className={cn("flex items-center gap-1 text-xs shrink-0", hasCover ? "text-white/90" : "text-muted-foreground")}>
                  <UsersIcon className="size-3" /> {squad.member_count ?? 0}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {squad.category && (
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                  {CATEGORY_LABELS[squad.category] || squad.category}
                </span>
              )}
              <SquiggleHoverCard>
                <SquiggleHoverCardTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex cursor-help border-0 bg-transparent p-0"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Squad privacy type"
                  >
                    <Badge variant="outline" className={cn("text-xs inline-flex items-center gap-0.5", hasCover && "bg-secondary text-secondary-foreground border-transparent")}>
                      {squad.type === "open" ? <UsersIcon className="size-2.5 shrink-0" /> : <Lock className="size-2.5 shrink-0" />}
                      {squad.type === "private" ? "Private" : squad.type === "restricted" ? "Restricted" : "Open"}
                    </Badge>
                  </button>
                </SquiggleHoverCardTrigger>
                <SquiggleHoverCardContent className="w-[min(13.75rem,calc(100vw-2rem))] [text-wrap:normal]">
                  {PRIVACY_BADGE_TOOLTIPS[squad.type]}
                </SquiggleHoverCardContent>
              </SquiggleHoverCard>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {localJoined && (
              <Badge variant="outline" className={cn("text-xs px-3 py-1.5 rounded-full text-primary border-primary/30", hasCover && "bg-white border-white/80")}>
                Joined
              </Badge>
            )}
            {squad.type === "restricted" && !localJoined && localRequestStatus === "pending" && (
              <Badge variant="secondary" className={cn("text-xs", hasCover && "bg-white text-foreground border-transparent")}>
                Request sent
              </Badge>
            )}
            {!localJoined && localRequestStatus !== "pending" && (
              <button
                type="button"
                disabled={loading}
                onClick={showJoinButton ? handleJoin : showRequestButton ? handleRequestJoin : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {loading ? "…" : squad.type === "open" ? "Join" : "Request to join"}
              </button>
            )}
          </div>
        </div>
        <div className={cn("mt-3 flex items-center gap-4 flex-wrap", homePageStyle && "flex-nowrap")}>
          <span className={cn("text-xs shrink-0", hasCover ? "text-white/70" : "text-muted-foreground/80")}>
            {trendingWindowLabel(squad.window_hours)}
          </span>
          <span className={cn("flex items-center gap-1 text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
            <MessageSquare className="size-3" /> {squad.posts_in_window ?? 0}
          </span>
          {!homePageStyle && (
            <span className={cn("flex items-center gap-1 text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
              <MessageCircle className="size-3" /> {squad.replies_in_window ?? 0}
            </span>
          )}
          <span className={cn("flex items-center gap-1 text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
            <Heart className="size-3" /> {squad.hearts_in_window ?? 0}
          </span>
          {changeLabel && (
            <span
              className={cn(
                "shrink-0 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-medium",
                hasCover && isUp && "bg-white text-emerald-600 dark:text-emerald-500",
                hasCover && isDown && "bg-white text-red-600 dark:text-red-500",
                hasCover && !isUp && !isDown && "bg-white text-muted-foreground",
                !hasCover && isUp && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                !hasCover && isDown && "bg-red-500/15 text-red-600 dark:text-red-400",
                !hasCover && !isUp && !isDown && "bg-secondary text-muted-foreground"
              )}
            >
              {changeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
