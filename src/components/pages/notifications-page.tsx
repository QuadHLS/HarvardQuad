import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Heart,
  MessageCircle,
  Users as UsersIcon,
  AtSign,
  Check,
  CheckCheck,
  Inbox,
  Trash2,
  X,
  Clock,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { cn, pageMainTitleClass, quadHoverColor } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { NotificationsService, type NotificationWithActor, type NotificationType } from "@/services/notificationsService"
import { SquadsService } from "@/services/squadsService"
import { FriendsService } from "@/services/friendsService"
import { FeedService } from "@/services/feedService"
import { NotificationListSkeleton } from "@/components/ui/feed-skeletons"
import { discoverFilterControlClass } from "@/components/squads/discover-squad-filters"
import { toast } from "sonner"

type NotificationFilter = "all" | "mentions" | "likes" | "replies" | "squads" | "friends"

const NOTIFICATION_FILTER_TABS: readonly NotificationFilter[] = [
  "all",
  "squads",
  "friends",
  "mentions",
  "replies",
  "likes",
]

const SQUAD_TYPES: NotificationType[] = ['squad_invite', 'invite_accepted', 'invite_declined', 'join_request', 'join_request_approved', 'join_request_denied', 'squad_join']
const FRIEND_TYPES: NotificationType[] = ['friend_request', 'friend_accepted']

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; text: string; content: string }> = {
  like: { icon: Heart, bg: "bg-red-500/15", text: "text-red-500", content: "liked your post" },
  reply: { icon: MessageCircle, bg: "bg-primary/15", text: "text-primary", content: "replied to your post" },
  mention: { icon: AtSign, bg: "bg-warning/15", text: "text-warning", content: "mentioned you in a post" },
  dm: { icon: MessageCircle, bg: "bg-primary/15", text: "text-primary", content: "sent you a message" },
  group_message: { icon: MessageCircle, bg: "bg-chart-4/15", text: "text-chart-4", content: "messaged in a group" },
  follow: { icon: UsersIcon, bg: "bg-chart-2/15", text: "text-chart-2", content: "started following you" },
  squad_invite: { icon: UsersIcon, bg: "bg-chart-4/15", text: "text-chart-4", content: "invited you to join" },
  invite_accepted: { icon: Check, bg: "bg-chart-3/15", text: "text-chart-3", content: "accepted your invite to" },
  invite_declined: { icon: X, bg: "bg-muted-foreground/15", text: "text-muted-foreground", content: "declined your invite to" },
  event: { icon: UsersIcon, bg: "bg-chart-2/15", text: "text-chart-2", content: "RSVP'd to your event" },
  join_request: { icon: UsersIcon, bg: "bg-chart-4/15", text: "text-chart-4", content: "requested to join" },
  join_request_approved: { icon: Check, bg: "bg-chart-3/15", text: "text-chart-3", content: "approved your request to join" },
  join_request_denied: { icon: UsersIcon, bg: "bg-muted-foreground/15", text: "text-muted-foreground", content: "denied your request to join" },
  squad_join: { icon: UsersIcon, bg: "bg-chart-3/15", text: "text-chart-3", content: "joined" },
  friend_request: { icon: UsersIcon, bg: "bg-chart-2/15", text: "text-chart-2", content: "sent you a friend request" },
  friend_accepted: { icon: Check, bg: "bg-chart-3/15", text: "text-chart-3", content: "accepted your friend request" },
}

const emptyStateConfig: Record<NotificationFilter, { icon: React.ElementType; title: string; description: string }> = {
  all: { icon: Inbox, title: "No notifications yet", description: "When someone interacts with your posts, squads, or friends, you'll see it here" },
  mentions: { icon: AtSign, title: "No mentions", description: "When someone @mentions you in a post, it'll show up here" },
  likes: { icon: Heart, title: "No likes yet", description: "Likes on your posts will appear here" },
  replies: { icon: MessageCircle, title: "No replies yet", description: "Replies to your posts and comments will show up here" },
  squads: { icon: UsersIcon, title: "No squad activity", description: "Invites and join request updates will appear here" },
  friends: { icon: UsersIcon, title: "No friend requests", description: "Friend requests and acceptances will appear here" },
}

function actorDisplayName(actor: NotificationWithActor["actor"]): string {
  if (!actor) return "Someone"
  return actor.public_name?.trim() || actor.full_name?.trim() || "Someone"
}

function actorInitials(actor: NotificationWithActor["actor"]): string {
  const name = actorDisplayName(actor)
  if (name === "Someone") return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

function EmptyState({ filter }: { filter: NotificationFilter }) {
  const { icon: Icon, title, description } = emptyStateConfig[filter]
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center rounded-xl border border-border bg-card sm:px-6">
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary mb-3">
        <Icon className="size-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

interface NotificationsPageProps {
  onNavigateToPost?: (postId: string) => void
  onNavigateToConversation?: (conversationId: string) => void
  onNavigateToSquad?: (squadId: string) => void
  onViewUserProfile?: (userId: string) => void
}

function NotificationItem({
  notification,
  selected,
  onSelectedChange,
  onMarkRead,
  onDelete,
  onClick,
  onViewUserProfile,
  onAcceptInvite,
  onDeclineInvite,
  onApproveRequest,
  onDenyRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  inviteAction,
  requestAction,
  friendAction,
}: {
  notification: NotificationWithActor
  selected: boolean
  onSelectedChange: (next: boolean) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: () => void
  onViewUserProfile?: (userId: string) => void
  onAcceptInvite?: (inviteId: string) => void
  onDeclineInvite?: (inviteId: string) => void
  onApproveRequest?: (requestId: string) => void
  onDenyRequest?: (requestId: string) => void
  onAcceptFriendRequest?: (fromUserId: string) => void
  onDeclineFriendRequest?: (fromUserId: string) => void
  inviteAction?: { id: string; kind: "accept" | "decline" } | null
  requestAction?: { id: string; kind: "approve" | "deny" } | null
  friendAction?: { id: string; kind: "accept" | "decline" } | null
}) {
  const config = typeConfig[notification.type] ?? typeConfig.like
  const Icon = config.icon
  const read = !!notification.read_at
  const hoverColor = quadHoverColor(notification.id)
  const snippet = (notification.metadata?.snippet as string) || ""
  const squadName = (notification.metadata?.squad_name as string) || ""
  const isSquadInvite = notification.type === "squad_invite"
  const isJoinRequest = notification.type === "join_request"
  const isFriendRequest = notification.type === "friend_request"
  const isSquadJoin = notification.type === "squad_join"
  const isInviteResponse = notification.type === "invite_accepted" || notification.type === "invite_declined"

  const contentSuffix = (isInviteResponse || isSquadJoin) && squadName ? ` ${squadName}` : ""

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border p-3.5 transition-all hover:shadow-lg",
        read ? "border-border bg-card" : "border-primary/20 bg-primary/[0.03]",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(v === true)}
          aria-label="Select notification"
        />
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
        className="flex min-w-0 flex-1 cursor-pointer gap-3"
      >
      <div className="relative shrink-0">
        {notification.actor_id && onViewUserProfile ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewUserProfile(notification.actor_id!)
            }}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
            aria-label={`View ${actorDisplayName(notification.actor)}'s profile`}
          >
            <Avatar className="size-10">
              {notification.actor?.avatar_url && <AvatarImage src={notification.actor.avatar_url} alt="" />}
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                {actorInitials(notification.actor)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Avatar className="size-10">
            {notification.actor?.avatar_url && <AvatarImage src={notification.actor.avatar_url} alt="" />}
            <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
              {actorInitials(notification.actor)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={cn("absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full ring-2 ring-card", config.bg)}>
          <Icon className={cn("size-2.5", config.text)} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          {notification.actor_id && onViewUserProfile ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onViewUserProfile(notification.actor_id!)
              }}
              className="font-semibold text-foreground hover:underline text-left"
            >
              {actorDisplayName(notification.actor)}
            </button>
          ) : (
            <span className="font-semibold text-foreground">{actorDisplayName(notification.actor)}</span>
          )}{" "}
          <span className="text-muted-foreground">{config.content}{contentSuffix}</span>
        </p>
        {snippet && !isInviteResponse && (
          <p className="mt-1 text-xs text-muted-foreground truncate italic">
            {`"${snippet}"`}
          </p>
        )}
        {(isSquadInvite || isJoinRequest || isSquadJoin) && squadName && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{squadName}</p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">{FeedService.timeAgo(notification.created_at)}</p>
      </div>

      <div className="shrink-0 flex flex-nowrap items-center justify-end gap-1 overflow-x-auto">
        {isSquadInvite && onAcceptInvite && onDeclineInvite && (
          <>
            <button
              type="button"
              disabled={!!inviteAction}
              onClick={(e) => {
                e.stopPropagation()
                onAcceptInvite(notification.target_id)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-chart-3/20 px-2 py-1 text-xs font-medium text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
            >
              {inviteAction?.id === notification.target_id && inviteAction.kind === "accept" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <Check className="size-3 shrink-0" />
              )}
              Accept invite
            </button>
            <button
              type="button"
              disabled={!!inviteAction}
              onClick={(e) => {
                e.stopPropagation()
                onDeclineInvite(notification.target_id)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {inviteAction?.id === notification.target_id && inviteAction.kind === "decline" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <X className="size-3 shrink-0" />
              )}
              Decline
            </button>
          </>
        )}
        {isFriendRequest && onAcceptFriendRequest && onDeclineFriendRequest && notification.actor_id && (
          <>
            <button
              type="button"
              disabled={!!friendAction}
              onClick={(e) => {
                e.stopPropagation()
                onAcceptFriendRequest(notification.actor_id!)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-chart-3/20 px-2 py-1 text-xs font-medium text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
            >
              {friendAction?.id === notification.actor_id && friendAction.kind === "accept" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <Check className="size-3 shrink-0" />
              )}
              Accept friend
            </button>
            <button
              type="button"
              disabled={!!friendAction}
              onClick={(e) => {
                e.stopPropagation()
                onDeclineFriendRequest(notification.actor_id!)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {friendAction?.id === notification.actor_id && friendAction.kind === "decline" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <X className="size-3 shrink-0" />
              )}
              Decline
            </button>
          </>
        )}
        {isJoinRequest && onApproveRequest && onDenyRequest && (
          <>
            <button
              type="button"
              disabled={!!requestAction}
              onClick={(e) => {
                e.stopPropagation()
                onApproveRequest(notification.target_id)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-chart-3/20 px-2 py-1 text-xs font-medium text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
            >
              {requestAction?.id === notification.target_id && requestAction.kind === "approve" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <Check className="size-3 shrink-0" />
              )}
              Approve join
            </button>
            <button
              type="button"
              disabled={!!requestAction}
              onClick={(e) => {
                e.stopPropagation()
                onDenyRequest(notification.target_id)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {requestAction?.id === notification.target_id && requestAction.kind === "deny" ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : (
                <X className="size-3 shrink-0" />
              )}
              Deny
            </button>
          </>
        )}
        {!isSquadInvite && !isJoinRequest && !read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Check className="size-3 shrink-0" />
            Mark read
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Delete notification"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      </div>
    </div>
  )
}

export function NotificationsPage({ onNavigateToPost, onNavigateToConversation, onNavigateToSquad, onViewUserProfile }: NotificationsPageProps = {}) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [items, setItems] = useState<NotificationWithActor[]>([])
  const [invitesSent, setInvitesSent] = useState<Array<{ id: string; squad_id: string; squad_name: string; invitee_id: string; created_at: string; profile: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null }>>([])
  const [invitesSentLoading, setInvitesSentLoading] = useState(false)
  const [requestsSent, setRequestsSent] = useState<Array<{ to_user_id: string; full_name: string | null; public_name: string | null; avatar_url: string | null; status: string; created_at: string }>>([])
  const [requestsSentLoading, setRequestsSentLoading] = useState(false)
  const [loading, setLoading] = useState(!!user)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await NotificationsService.list(user.id)
      setItems(list)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("notifications-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  useEffect(() => {
    if (filter === "squads" && user) {
      setInvitesSentLoading(true)
      SquadsService.getPendingInvitesSent()
        .then(setInvitesSent)
        .finally(() => setInvitesSentLoading(false))
    } else {
      setInvitesSent([])
      setInvitesSentLoading(false)
    }
  }, [filter, user])

  useEffect(() => {
    if (filter === "friends" && user) {
      setRequestsSentLoading(true)
      FriendsService.getSentFriendRequests()
        .then(setRequestsSent)
        .finally(() => setRequestsSentLoading(false))
    } else {
      setRequestsSent([])
      setRequestsSentLoading(false)
    }
  }, [filter, user])

  const getUnreadForFilter = useCallback((f: NotificationFilter) => {
    if (f === "all") return items.filter((n) => !n.read_at).length
    return items.filter((n) => {
      if (f === "mentions") return n.type === "mention" && !n.read_at
      if (f === "likes") return n.type === "like" && !n.read_at
      if (f === "replies") return n.type === "reply" && !n.read_at
      if (f === "squads") return SQUAD_TYPES.includes(n.type) && !n.read_at
      if (f === "friends") return FRIEND_TYPES.includes(n.type) && !n.read_at
      return false
    }).length
  }, [items])

  const unreadForCurrentFilter = useMemo(() => getUnreadForFilter(filter), [filter, getUnreadForFilter])

  const filtered = useMemo(
    () =>
      items
        .filter((n) => {
          if (filter === "mentions") return n.type === "mention"
          if (filter === "likes") return n.type === "like"
          if (filter === "replies") return n.type === "reply"
          if (filter === "squads") return SQUAD_TYPES.includes(n.type)
          if (filter === "friends") return FRIEND_TYPES.includes(n.type)
          return true
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [items, filter]
  )

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((n) => n.id === id)))
  }, [filtered])

  const handleMarkRead = async (id: string) => {
    if (!user) return
    try {
      await NotificationsService.markRead(id, user.id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    } catch {
      // ignore
    }
  }

  const typesForFilter = (f: NotificationFilter): NotificationType[] | undefined => {
    if (f === "all") return undefined
    if (f === "mentions") return ["mention"]
    if (f === "likes") return ["like"]
    if (f === "replies") return ["reply"]
    if (f === "squads") return SQUAD_TYPES
    if (f === "friends") return FRIEND_TYPES
    return undefined
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    const types = typesForFilter(filter)
    try {
      await NotificationsService.markAllRead(user.id, types)
      setItems((prev) =>
        prev.map((n) => {
          if (types && !types.includes(n.type)) return n
          return { ...n, read_at: n.read_at ?? new Date().toISOString() }
        })
      )
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await NotificationsService.delete(id, user.id)
      setItems((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // ignore
    }
  }

  const handleBulkMarkRead = useCallback(async () => {
    if (!user || selectedIds.length === 0) return
    const ids = [...selectedIds]
    const unreadIds = ids.filter((id) => {
      const n = items.find((x) => x.id === id)
      return n && !n.read_at
    })
    if (unreadIds.length === 0) return
    try {
      await NotificationsService.markReadMany(unreadIds, user.id)
      const now = new Date().toISOString()
      setItems((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n))
      )
      setSelectedIds([])
    } catch {
      toast.error("Failed to mark notifications as read")
    }
  }, [user, selectedIds, items])

  const handleBulkDelete = useCallback(async () => {
    if (!user || selectedIds.length === 0) return
    const ids = [...selectedIds]
    try {
      await NotificationsService.deleteMany(ids, user.id)
      setItems((prev) => prev.filter((n) => !ids.includes(n.id)))
      setSelectedIds([])
    } catch {
      toast.error("Failed to delete notifications")
    }
  }, [user, selectedIds])

  const [inviteAction, setInviteAction] = useState<{ id: string; kind: "accept" | "decline" } | null>(null)
  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return
    setInviteAction({ id: inviteId, kind: "accept" })
    try {
      const n = items.find((i) => i.type === "squad_invite" && i.target_id === inviteId)
      await SquadsService.acceptSquadInvite(inviteId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "squad_invite" && i.target_id === inviteId)))
      toast.success("Invite accepted")
      if (n?.metadata?.squad_id && onNavigateToSquad) onNavigateToSquad(n.metadata.squad_id as string)
    } catch (e) {
      toast.error((e as Error).message || "Failed to accept invite")
    } finally {
      setInviteAction(null)
    }
  }
  const handleDeclineInvite = async (inviteId: string) => {
    if (!user) return
    setInviteAction({ id: inviteId, kind: "decline" })
    try {
      const n = items.find((i) => i.type === "squad_invite" && i.target_id === inviteId)
      await SquadsService.declineSquadInvite(inviteId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "squad_invite" && i.target_id === inviteId)))
      toast.success("Invite declined")
    } catch (e) {
      toast.error((e as Error).message || "Failed to decline invite")
    } finally {
      setInviteAction(null)
    }
  }

  const [requestAction, setRequestAction] = useState<{ id: string; kind: "approve" | "deny" } | null>(null)
  const handleApproveRequest = async (requestId: string) => {
    if (!user) return
    setRequestAction({ id: requestId, kind: "approve" })
    try {
      const n = items.find((i) => i.type === "join_request" && i.target_id === requestId)
      await SquadsService.approveSquadJoinRequest(requestId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "join_request" && i.target_id === requestId)))
      toast.success("Request approved")
      if (n?.metadata?.squad_id && onNavigateToSquad) onNavigateToSquad(n.metadata.squad_id as string)
    } catch (e) {
      toast.error((e as Error).message || "Failed to approve request")
    } finally {
      setRequestAction(null)
    }
  }
  const [friendAction, setFriendAction] = useState<{ id: string; kind: "accept" | "decline" } | null>(null)
  const [cancelRequestAction, setCancelRequestAction] = useState<string | null>(null)
  const [cancelInviteAction, setCancelInviteAction] = useState<string | null>(null)
  const handleAcceptFriendRequest = async (fromUserId: string) => {
    if (!user) return
    setFriendAction({ id: fromUserId, kind: "accept" })
    try {
      const n = items.find((i) => i.type === "friend_request" && i.actor_id === fromUserId)
      await FriendsService.acceptFriendRequest(fromUserId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "friend_request" && i.actor_id === fromUserId)))
      toast.success("Friend request accepted")
      if (onViewUserProfile) onViewUserProfile(fromUserId)
    } catch (e) {
      toast.error((e as Error).message || "Failed to accept friend request")
    } finally {
      setFriendAction(null)
    }
  }
  const handleDeclineFriendRequest = async (fromUserId: string) => {
    if (!user) return
    setFriendAction({ id: fromUserId, kind: "decline" })
    try {
      const n = items.find((i) => i.type === "friend_request" && i.actor_id === fromUserId)
      await FriendsService.declineFriendRequest(fromUserId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "friend_request" && i.actor_id === fromUserId)))
      toast.success("Friend request declined")
    } catch (e) {
      toast.error((e as Error).message || "Failed to decline friend request")
    } finally {
      setFriendAction(null)
    }
  }

  const handleDenyRequest = async (requestId: string) => {
    if (!user) return
    setRequestAction({ id: requestId, kind: "deny" })
    try {
      const n = items.find((i) => i.type === "join_request" && i.target_id === requestId)
      await SquadsService.denySquadJoinRequest(requestId)
      if (n) await NotificationsService.delete(n.id, user.id)
      setItems((prev) => prev.filter((i) => !(i.type === "join_request" && i.target_id === requestId)))
      toast.success("Request denied")
    } catch (e) {
      toast.error((e as Error).message || "Failed to deny request")
    } finally {
      setRequestAction(null)
    }
  }

  const handleCancelFriendRequest = async (toUserId: string) => {
    if (!user) return
    setCancelRequestAction(toUserId)
    try {
      await FriendsService.cancelFriendRequest(toUserId)
      setRequestsSent((prev) => prev.filter((r) => r.to_user_id !== toUserId))
      toast.success("Friend request cancelled")
    } catch (e) {
      toast.error((e as Error).message || "Failed to cancel request")
    } finally {
      setCancelRequestAction(null)
    }
  }

  const handleCancelSquadInvite = async (inviteId: string) => {
    if (!user) return
    setCancelInviteAction(inviteId)
    try {
      await SquadsService.cancelSquadInvite(inviteId)
      setInvitesSent((prev) => prev.filter((inv) => inv.id !== inviteId))
      toast.success("Invite cancelled")
    } catch (e) {
      toast.error((e as Error).message || "Failed to cancel invite")
    } finally {
      setCancelInviteAction(null)
    }
  }

  const handleNotificationClick = (n: NotificationWithActor) => {
    if (n.target_type === "post" && onNavigateToPost) {
      onNavigateToPost(n.target_id)
    } else if (n.target_type === "conversation" && onNavigateToConversation) {
      onNavigateToConversation(n.target_id)
    } else if (n.target_type === "reply" && n.metadata?.post_id && onNavigateToPost) {
      onNavigateToPost(n.metadata.post_id as string)
    } else if ((n.target_type === "squad" || n.target_type === "squad_invite" || n.target_type === "join_request") && onNavigateToSquad) {
      const squadId = n.target_type === "squad" ? n.target_id : (n.metadata?.squad_id as string)
      if (squadId) onNavigateToSquad(squadId)
    }
  }

  const todayCutoff = new Date()
  todayCutoff.setHours(0, 0, 0, 0)
  const today = filtered.filter((n) => new Date(n.created_at) >= todayCutoff)
  const earlier = filtered.filter((n) => new Date(n.created_at) < todayCutoff)

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-6 pb-nav-safe md:pb-6">
        <p className="text-sm text-muted-foreground">Sign in to view notifications</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-6 pb-nav-safe md:pb-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className={cn(pageMainTitleClass, "min-w-0")}>Notifications</h2>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadForCurrentFilter === 0}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            unreadForCurrentFilter > 0
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border text-muted-foreground cursor-default"
          )}
        >
          <CheckCheck className="size-3.5" />
          Mark all read
        </button>
      </div>

      <div className="mb-6 flex w-full min-w-0 flex-wrap items-center gap-3">
        {!loading && filtered.length > 0 && (
          <div className="inline-flex h-8 max-w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto rounded-md border border-input bg-transparent px-2.5 shadow-xs transition-[color,box-shadow] [scrollbar-width:none] hover:bg-accent/30 sm:gap-2 sm:px-3 dark:bg-input/30 [&::-webkit-scrollbar]:hidden">
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs leading-none text-muted-foreground">
              <Checkbox
                checked={filtered.length > 0 && selectedIds.length === filtered.length}
                onCheckedChange={(v) => {
                  if (v === true) setSelectedIds(filtered.map((n) => n.id))
                  else setSelectedIds([])
                }}
                className="size-3.5"
              />
              Select all
            </label>
            {selectedIds.length > 0 ? (
              <>
                <span className="hidden w-px shrink-0 self-stretch bg-border sm:block" aria-hidden />
                <span className="shrink-0 text-[11px] leading-none text-muted-foreground tabular-nums">
                  {selectedIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 px-1.5 text-[11px] font-medium text-foreground shadow-none hover:bg-accent/70"
                  onClick={handleBulkMarkRead}
                >
                  Mark read
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 px-1.5 text-[11px] font-medium text-foreground shadow-none hover:bg-accent/70"
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        )}

        <div className="w-fit min-w-0 max-w-[11rem] shrink-0">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Filter notifications"
                className={cn(
                  discoverFilterControlClass,
                  "w-fit max-w-full font-normal",
                  "flex items-center justify-between gap-1.5",
                  "focus-visible:border-ring focus-visible:ring-inset focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "hover:bg-accent/30 data-[state=open]:bg-accent/20"
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
                  <span className="min-w-0 truncate capitalize text-foreground">{filter}</span>
                  {unreadForCurrentFilter > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                      {unreadForCurrentFilter > 99 ? "99+" : unreadForCurrentFilter}
                    </span>
                  )}
                </span>
                <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="z-[60] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(20rem,calc(100vw-2rem))] border-0 ring-1 ring-foreground/10"
            >
              {NOTIFICATION_FILTER_TABS.map((tab) => {
                const unread = getUnreadForFilter(tab)
                const selected = filter === tab
                return (
                  <DropdownMenuItem
                    key={tab}
                    onSelect={() => setFilter(tab)}
                    className="cursor-pointer gap-2 pr-2 capitalize"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-primary" aria-hidden>
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{tab}</span>
                    {unread > 0 ? (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <NotificationListSkeleton count={6} />
      ) : (
        <>
          {filter === "squads" && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invites sent</h3>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                {invitesSentLoading ? (
                  <div className="flex flex-col gap-2 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
                        <div className="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : invitesSent.length > 0 ? (
                  invitesSent.map((inv) => {
                    const hoverColor = quadHoverColor(inv.id)
                    return (
                    <div
                      key={inv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNavigateToSquad?.(inv.squad_id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNavigateToSquad?.(inv.squad_id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-all cursor-pointer hover:shadow-lg",
                        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
                        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
                        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
                        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
                      )}
                    >
                      {onViewUserProfile ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewUserProfile(inv.invitee_id)
                          }}
                          className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                          aria-label={`View ${inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || "invitee"}'s profile`}
                        >
                          <Avatar className="size-9">
                            {inv.profile?.avatar_url && <AvatarImage src={inv.profile.avatar_url} alt="" />}
                            <AvatarFallback className="bg-chart-4/20 text-chart-4 text-xs font-semibold">
                              {(inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      ) : (
                        <Avatar className="size-9 shrink-0">
                          {inv.profile?.avatar_url && <AvatarImage src={inv.profile.avatar_url} alt="" />}
                          <AvatarFallback className="bg-chart-4/20 text-chart-4 text-xs font-semibold">
                            {(inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          You invited {onViewUserProfile ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewUserProfile(inv.invitee_id)
                              }}
                              className="font-medium hover:underline"
                            >
                              {inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || "Unknown"}
                            </button>
                          ) : (
                            <span className="font-medium">{inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || "Unknown"}</span>
                          )} to {inv.squad_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="size-3" /> {FeedService.timeAgo(inv.created_at)} · awaiting response
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2.5 text-xs shrink-0"
                        disabled={cancelInviteAction === inv.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelSquadInvite(inv.id)
                        }}
                      >
                        {cancelInviteAction === inv.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        Cancel invite
                      </Button>
                    </div>
                  )})
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending invites</p>
                )}
              </div>
            </div>
          )}
          {filter === "friends" && (
            <div className="mb-6 sticky top-0 z-10 bg-background pb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Requests sent</h3>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                {requestsSentLoading ? (
                  <div className="flex flex-col gap-2 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
                        <div className="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : requestsSent.length > 0 ? (
                  requestsSent.map((req) => {
                    const name = req.public_name?.trim() || req.full_name?.trim() || "Unknown"
                    const initials = name.slice(0, 2).toUpperCase()
                    const hoverColor = quadHoverColor(req.to_user_id)
                    const cancelling = cancelRequestAction === req.to_user_id
                    return (
                      <div
                        key={req.to_user_id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-all",
                          hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
                          hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
                          hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
                          hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
                        )}
                      >
                        {onViewUserProfile ? (
                          <button
                            type="button"
                            onClick={() => onViewUserProfile(req.to_user_id)}
                            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                            aria-label={`View ${name}'s profile`}
                          >
                            <Avatar className="size-9">
                              {req.avatar_url && <AvatarImage src={req.avatar_url} alt="" />}
                              <AvatarFallback className="bg-chart-2/20 text-chart-2 text-xs font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                          </button>
                        ) : (
                          <Avatar className="size-9 shrink-0">
                            {req.avatar_url && <AvatarImage src={req.avatar_url} alt="" />}
                            <AvatarFallback className="bg-chart-2/20 text-chart-2 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            Friend request sent to {onViewUserProfile ? (
                              <button
                                type="button"
                                onClick={() => onViewUserProfile(req.to_user_id)}
                                className="font-medium hover:underline"
                              >
                                {name}
                              </button>
                            ) : (
                              <span className="font-medium">{name}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="size-3" /> {FeedService.timeAgo(req.created_at)} · awaiting response
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2.5 text-xs shrink-0"
                          disabled={cancelling}
                          onClick={() => handleCancelFriendRequest(req.to_user_id)}
                        >
                          {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                          Cancel request
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending requests</p>
                )}
              </div>
            </div>
          )}
          {today.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today</h3>
              <div className="flex flex-col gap-2">
                {today.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    selected={selectedIds.includes(n.id)}
                    onSelectedChange={(next) =>
                      setSelectedIds((prev) =>
                        next ? (prev.includes(n.id) ? prev : [...prev, n.id]) : prev.filter((id) => id !== n.id)
                      )
                    }
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClick={() => handleNotificationClick(n)}
                    onViewUserProfile={onViewUserProfile}
                    onAcceptInvite={n.type === "squad_invite" ? handleAcceptInvite : undefined}
                    onDeclineInvite={n.type === "squad_invite" ? handleDeclineInvite : undefined}
                    onApproveRequest={n.type === "join_request" ? handleApproveRequest : undefined}
                    onDenyRequest={n.type === "join_request" ? handleDenyRequest : undefined}
                    onAcceptFriendRequest={n.type === "friend_request" ? handleAcceptFriendRequest : undefined}
                    onDeclineFriendRequest={n.type === "friend_request" ? handleDeclineFriendRequest : undefined}
                    inviteAction={inviteAction}
                    requestAction={requestAction}
                    friendAction={friendAction}
                  />
                ))}
              </div>
            </div>
          )}

          {earlier.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Earlier</h3>
              <div className="flex flex-col gap-2">
                {earlier.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    selected={selectedIds.includes(n.id)}
                    onSelectedChange={(next) =>
                      setSelectedIds((prev) =>
                        next ? (prev.includes(n.id) ? prev : [...prev, n.id]) : prev.filter((id) => id !== n.id)
                      )
                    }
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClick={() => handleNotificationClick(n)}
                    onViewUserProfile={onViewUserProfile}
                    onAcceptInvite={n.type === "squad_invite" ? handleAcceptInvite : undefined}
                    onDeclineInvite={n.type === "squad_invite" ? handleDeclineInvite : undefined}
                    onApproveRequest={n.type === "join_request" ? handleApproveRequest : undefined}
                    onDenyRequest={n.type === "join_request" ? handleDenyRequest : undefined}
                    onAcceptFriendRequest={n.type === "friend_request" ? handleAcceptFriendRequest : undefined}
                    onDeclineFriendRequest={n.type === "friend_request" ? handleDeclineFriendRequest : undefined}
                    inviteAction={inviteAction}
                    requestAction={requestAction}
                    friendAction={friendAction}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && <EmptyState filter={filter} />}
        </>
      )}
    </div>
  )
}
