import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Heart,
  MessageCircle,
  Users as UsersIcon,
  AtSign,
  ArrowRight,
  Check,
  CheckCheck,
  Inbox,
  Trash2,
  X,
  Clock,
  Loader2,
} from "lucide-react"
import { cn, pageMainTitleClass, quadHoverColor } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { NotificationsService, type NotificationWithActor, type NotificationType } from "@/services/notificationsService"
import { SquadsService } from "@/services/squadsService"
import { FriendsService } from "@/services/friendsService"
import { FeedService } from "@/services/feedService"
import { NotificationListSkeleton } from "@/components/ui/feed-skeletons"
import { toast } from "sonner"

type NotificationFilter = "all" | "mentions" | "likes" | "replies" | "squads" | "friends" | "messages"

const SQUAD_TYPES: NotificationType[] = ['squad_invite', 'invite_accepted', 'invite_declined', 'join_request', 'join_request_approved', 'join_request_denied', 'squad_join']
const FRIEND_TYPES: NotificationType[] = ['friend_request', 'friend_accepted']
const MESSAGE_TYPES: NotificationType[] = ["dm", "group_message"]

/** Types that navigate to a post, conversation, squad, or profile */
const VIEWABLE_TYPES: NotificationType[] = ['like', 'reply', 'mention', 'dm', 'group_message', 'squad_invite', 'invite_accepted', 'invite_declined', 'join_request', 'join_request_approved', 'join_request_denied', 'squad_join', 'friend_request', 'friend_accepted']

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
  all: { icon: Inbox, title: "No notifications yet", description: "When someone interacts with your posts or messages, you'll see it here" },
  mentions: { icon: AtSign, title: "No mentions", description: "When someone @mentions you in a post, it'll show up here" },
  likes: { icon: Heart, title: "No likes yet", description: "Likes on your posts will appear here" },
  replies: { icon: MessageCircle, title: "No replies yet", description: "Replies to your posts and comments will show up here" },
  squads: { icon: UsersIcon, title: "No squad activity", description: "Invites and join request updates will appear here" },
  friends: { icon: UsersIcon, title: "No friend requests", description: "Friend requests and acceptances will appear here" },
  messages: { icon: MessageCircle, title: "No message notifications", description: "New DMs and group messages will show up here" },
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
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
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
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-lg",
        read ? "border-border bg-card" : "border-primary/20 bg-primary/[0.03]",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
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

      <div className="shrink-0 flex items-center gap-0.5">
        {VIEWABLE_TYPES.includes(notification.type) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            aria-label="View"
            title="View"
          >
            <ArrowRight className="size-3.5" />
          </button>
        )}
        {isSquadInvite && onAcceptInvite && onDeclineInvite && (
          <>
            <button
              type="button"
              disabled={!!inviteAction}
              onClick={(e) => {
                e.stopPropagation()
                onAcceptInvite(notification.target_id)
              }}
              className="flex size-7 items-center justify-center rounded-md bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
              aria-label="Accept invite"
            >
              {inviteAction?.id === notification.target_id && inviteAction.kind === "accept" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              disabled={!!inviteAction}
              onClick={(e) => {
                e.stopPropagation()
                onDeclineInvite(notification.target_id)
              }}
              className="flex size-7 items-center justify-center rounded-md bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
              aria-label="Decline invite"
            >
              {inviteAction?.id === notification.target_id && inviteAction.kind === "decline" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
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
              className="flex size-7 items-center justify-center rounded-md bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
              aria-label="Accept friend request"
            >
              {friendAction?.id === notification.actor_id && friendAction.kind === "accept" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              disabled={!!friendAction}
              onClick={(e) => {
                e.stopPropagation()
                onDeclineFriendRequest(notification.actor_id!)
              }}
              className="flex size-7 items-center justify-center rounded-md bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
              aria-label="Decline friend request"
            >
              {friendAction?.id === notification.actor_id && friendAction.kind === "decline" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
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
              className="flex size-7 items-center justify-center rounded-md bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 transition-colors disabled:opacity-50"
              aria-label="Approve request"
            >
              {requestAction?.id === notification.target_id && requestAction.kind === "approve" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              disabled={!!requestAction}
              onClick={(e) => {
                e.stopPropagation()
                onDenyRequest(notification.target_id)
              }}
              className="flex size-7 items-center justify-center rounded-md bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 transition-colors disabled:opacity-50"
              aria-label="Deny request"
            >
              {requestAction?.id === notification.target_id && requestAction.kind === "deny" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
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
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Mark as read"
          >
            <Check className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Delete notification"
        >
          <Trash2 className="size-3.5" />
        </button>
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
  }, [user?.id])

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
  }, [user?.id, load])

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
  }, [filter, user?.id])

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
  }, [filter, user?.id])

  const unreadCount = items.filter((n) => !n.read_at).length

  const getUnreadForFilter = (f: NotificationFilter) => {
    if (f === "all") return unreadCount
    return items.filter((n) => {
      if (f === "mentions") return n.type === "mention" && !n.read_at
      if (f === "likes") return n.type === "like" && !n.read_at
      if (f === "replies") return n.type === "reply" && !n.read_at
      if (f === "squads") return SQUAD_TYPES.includes(n.type) && !n.read_at
      if (f === "friends") return FRIEND_TYPES.includes(n.type) && !n.read_at
      if (f === "messages") return MESSAGE_TYPES.includes(n.type) && !n.read_at
      return false
    }).length
  }

  const filtered = items
    .filter((n) => {
      if (filter === "mentions") return n.type === "mention"
      if (filter === "likes") return n.type === "like"
      if (filter === "replies") return n.type === "reply"
      if (filter === "squads") return SQUAD_TYPES.includes(n.type)
      if (filter === "friends") return FRIEND_TYPES.includes(n.type)
      if (filter === "messages") return MESSAGE_TYPES.includes(n.type)
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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
    if (f === "messages") return MESSAGE_TYPES
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={pageMainTitleClass}>Notifications</h2>
          <p className="hidden text-sm text-muted-foreground md:block">
            {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? "unread notification" : "unread notifications"}` : "You're all caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={getUnreadForFilter(filter) === 0}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            getUnreadForFilter(filter) > 0
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border text-muted-foreground cursor-default"
          )}
        >
          <CheckCheck className="size-3.5" />
          Mark all read
        </button>
      </div>

      <div className="mb-4 rounded-lg bg-secondary p-1">
        <div className="flex w-full gap-1">
          {(["all", "squads", "friends", "messages", "mentions", "replies", "likes"] as const).map((tab) => {
            const unread = getUnreadForFilter(tab)
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap",
                  filter === tab ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground active:bg-accent/50"
                )}
              >
                {tab}
                {unread > 0 && (
                  <span className="min-w-[1.25rem] rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            )
          })}
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
