import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  ArrowLeft,
  Send,
  Plus,
  CheckCheck,
  VolumeX,
  Volume2,
  Loader2,
  Users as UsersIcon,
  UserCheck,
  Compass,
  X,
  Edit3,
  EyeOff,
  ChevronUp,
  Settings,
  Ban,
  Info,
  FileText,
  ImageIcon,
  Video,
  Camera,
  ExternalLink,
  UserPlus,
  Calendar,
  MessageSquare,
} from "lucide-react"
import { cn, pageMainTitleClass } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { useSubView } from "@/hooks/use-sub-view"
import { useAuth } from "@/contexts/AuthContext"
import { EmojiPicker } from "@/components/emoji-picker"
import { supabase } from "@/lib/supabase"
import {
  MessagingService,
  type DmConversationRow,
  type Message,
  type Participant,
  type SharedPostData,
  type SharedSquadData,
} from "@/services/messagingService"
import { FriendsService } from "@/services/friendsService"
import { BlocksService } from "@/services/blocksService"
import { SquadsService } from "@/services/squadsService"
import { getSignedUrl } from "@/lib/signedStorageUrl"
import { BlockInfoAlertDialog } from "@/components/block-info-dialog"
import { CATEGORY_LABELS } from "@/lib/squad-constants"
import { ConversationListSkeleton } from "@/components/ui/feed-skeletons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const CONV_HOVER_COLORS = ["quad-green", "quad-blue", "quad-red", "quad-yellow"] as const
function convHoverColor(id: string): (typeof CONV_HOVER_COLORS)[number] {
  const i = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return CONV_HOVER_COLORS[Math.abs(i) % CONV_HOVER_COLORS.length]
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 1024) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getUploadErrorReason(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const responseTextMatch = msg.match(/response text:\s*([^,]+)/)
  if (responseTextMatch) return responseTextMatch[1].trim()
  if (msg.includes("Maximum size exceeded")) return "File exceeds the 50 MB limit"
  if (msg.includes("Invalid key")) return "Invalid file name (remove brackets or special characters)"
  return msg
}

const YOUTUBE_URL_RE = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(?:\S*)?|(?:https?:\/\/)?youtu\.be\/[a-zA-Z0-9_-]{11}(?:\S*)?/g

/** Extract YouTube embed URL from content. Returns embed URL if content is/contains a YouTube URL. */
function getYouTubeEmbedUrl(content: string | null | undefined): string | null {
  if (!content?.trim()) return null
  const watchMatch = content.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/)
  const shortMatch = content.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/)
  const videoId = watchMatch?.[1] ?? shortMatch?.[1]
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

/** Strip YouTube URLs from content for display (when iframe is shown). */
function stripYouTubeUrls(content: string | null | undefined): string {
  if (!content) return ""
  return content.replace(YOUTUBE_URL_RE, "").replace(/\s+/g, " ").trim()
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
}

/** Discord-style message timestamp: Today 3:45 PM, Yesterday at 3:45 PM, Mon at 3:45 PM, Dec 15 at 3:45 PM */
function formatMessageTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)

  if (sameDay) return timeStr
  if (isYesterday) return `Yesterday at ${timeStr}`
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} at ${timeStr}`
  if (d.getFullYear() === now.getFullYear()) return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at ${timeStr}`
}

function SharedPostMessageCard({
  data,
  onNavigateToPost,
  onGoToSquad,
  isMe,
  alignLeft,
}: {
  data: SharedPostData
  onNavigateToPost?: (postId: string) => void
  onGoToSquad?: (squadId: string) => void
  isMe: boolean
  /** When true (squad chat), bubble tail points left; when false (DM), tail follows isMe. */
  alignLeft?: boolean
}) {
  const [access, setAccess] = useState<{ is_member: boolean; can_view: boolean; squad_name: string; squad_type: string } | null | "loading">("loading")
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const authorAvatarUrl = data.author_avatar_url?.startsWith("http") ? data.author_avatar_url : null

  useEffect(() => {
    if (data.source_type !== "squad" || !data.source_id) {
      setAccess(null)
      return
    }
    let cancelled = false
    setAccess("loading")
    SquadsService.getSquadPostAccess(data.source_id).then((a) => {
      if (!cancelled) setAccess(a ?? null)
    })
    return () => { cancelled = true }
  }, [data.source_type, data.source_id])

  useEffect(() => {
    if (!data.image_path) return
    let cancelled = false
    getSignedUrl("feed-post-images", data.image_path).then((url) => {
      if (!cancelled && url) setThumbUrl(url)
    })
    return () => { cancelled = true }
  }, [data.image_path])

  const isRestricted = data.source_type === "squad" && access && access !== "loading" && !access.can_view && access.squad_type === "restricted"
  const isPrivate = data.source_type === "squad" && access && access !== "loading" && !access.can_view && access.squad_type === "private"
  const squadName = data.squad_name ?? (access && access !== "loading" ? access.squad_name : null)

  const sourceLabel = data.source_type === "squad" && squadName ? `#${squadName}` : "Campus"

  const tailLeft = alignLeft ?? !isMe
  const cardBase = cn(
    "rounded-2xl overflow-hidden max-w-[280px] w-fit",
    isMe ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border",
    tailLeft ? "rounded-bl-md" : "rounded-br-md"
  )

  if (data.source_type === "squad" && access === "loading") {
    return (
      <div className={cn(cardBase, "p-4")}>
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardBase}>
      {isPrivate ? (
        <div className="p-3.5 flex flex-col gap-2.5">
          <p className="text-sm text-muted-foreground">Post from {squadName ? `#${squadName}` : "a squad"}</p>
          {data.source_id && onGoToSquad && (
            <button
              type="button"
              onClick={() => onGoToSquad(data.source_id!)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-fit"
            >
              <ExternalLink className="size-4 shrink-0" />
              View squad
            </button>
          )}
        </div>
      ) : isRestricted ? (
        <div className="p-3.5 flex flex-col gap-2.5">
          <p className="text-sm font-medium text-foreground line-clamp-2">{data.post_title}</p>
          <div className="flex items-center gap-2">
            {authorAvatarUrl && (
              <img src={authorAvatarUrl} alt="" className="size-6 rounded-full object-cover shrink-0" />
            )}
            <p className="text-xs text-muted-foreground">{data.author_name} · {sourceLabel}</p>
          </div>
          {data.source_id && onGoToSquad && (
            <button
              type="button"
              onClick={() => onGoToSquad(data.source_id!)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-fit"
            >
              <UserPlus className="size-4 shrink-0" />
              Request to join {squadName ? squadName : "squad"} to view
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onNavigateToPost?.(data.post_id)}
          className="w-full text-left p-0 flex flex-col hover:opacity-95 transition-opacity active:opacity-90"
        >
          {thumbUrl && (
            <div className="w-full aspect-video overflow-hidden">
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-3 flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground line-clamp-2">{data.post_title}</p>
            <div className="flex items-center gap-2">
              {authorAvatarUrl && (
                <img src={authorAvatarUrl} alt="" className="size-6 rounded-full object-cover shrink-0" />
              )}
              <p className="text-xs text-muted-foreground">{data.author_name} · {sourceLabel}</p>
            </div>
            {onNavigateToPost && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary mt-0.5">
                <ExternalLink className="size-3 shrink-0" />
                View post
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  )
}

function SharedSquadMessageCard({
  data,
  onGoToSquad,
  isMe,
  alignLeft,
}: {
  data: SharedSquadData
  onGoToSquad?: (squadId: string) => void
  isMe: boolean
  alignLeft?: boolean
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!data.avatar_path) return
    let cancelled = false
    getSignedUrl("squad-avatars", data.avatar_path).then((url) => {
      if (!cancelled && url) setAvatarUrl(url)
    })
    return () => { cancelled = true }
  }, [data.avatar_path])

  const tailLeft = alignLeft ?? !isMe
  const cardBase = cn(
    "rounded-2xl overflow-hidden max-w-[280px] w-fit",
    isMe ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border",
    tailLeft ? "rounded-bl-md" : "rounded-br-md"
  )

  return (
    <button
      type="button"
      onClick={() => onGoToSquad?.(data.squad_id)}
      className={cn(cardBase, "w-full text-left p-0 flex flex-col hover:opacity-95 transition-opacity active:opacity-90")}
    >
      <div className="flex items-center gap-3 p-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <UsersIcon className="size-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{data.squad_name}</p>
          <div className="flex items-center gap-3 mt-1 flex-nowrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <UsersIcon className="size-3" /> {data.member_count ?? 0} {(data.member_count ?? 0) === 1 ? 'member' : 'members'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <MessageSquare className="size-3" /> {data.post_count ?? 0} {(data.post_count ?? 0) === 1 ? 'post' : 'posts'}
            </span>
            {data.category && (
              <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground shrink-0">
                {CATEGORY_LABELS[data.category] || data.category}
              </span>
            )}
          </div>
          {data.created_at && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0" />
              Created {new Date(data.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      {onGoToSquad && (
        <div className="px-3 pb-3 pt-0">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ExternalLink className="size-3 shrink-0" />
            View squad
          </span>
        </div>
      )}
    </button>
  )
}

export function MessageBubble({
  msg,
  isMe,
  otherUserId,
  otherLastReadAt,
  scrollRef,
  uploadProgress,
  onNavigateToPost,
  onGoToSquad,
}: {
  msg: Message
  isMe: boolean
  otherUserId?: string | null
  otherLastReadAt: string | null
  scrollRef?: React.Ref<HTMLDivElement>
  uploadProgress?: number
  onNavigateToPost?: (postId: string) => void
  onGoToSquad?: (squadId: string) => void
}) {
  const time = formatMessageTime(msg.created_at)
  const att = msg.attachments?.[0]
  const attUrl = att?.url

  const isSharedPost = msg.message_type === "shared_post" && msg.shared_post_data
  const isSharedSquad = msg.message_type === "shared_squad" && msg.shared_squad_data
  const isImageOrVideo = (msg.message_type === "image" || msg.message_type === "video") && attUrl

  if (isSharedSquad) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "flex flex-col gap-1 max-w-[85%] md:max-w-[70%]",
          isMe ? "ml-auto items-end" : "mr-auto items-start"
        )}
      >
        <SharedSquadMessageCard
          data={msg.shared_squad_data!}
          onGoToSquad={onGoToSquad}
          isMe={isMe}
        />
        {msg.content && (
          <div
            className={cn(
              "rounded-2xl px-3 py-1.5 text-sm leading-relaxed w-fit max-w-full",
              isMe
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}
          >
            <span className="whitespace-pre-wrap">{msg.content}</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-1">
          <span className="text-xs text-muted-foreground">{time}</span>
          {isMe &&
            (String(msg.id).startsWith("temp-") ? (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            ) : otherUserId && otherLastReadAt && new Date(msg.created_at) <= new Date(otherLastReadAt) ? (
              <CheckCheck className="size-3 text-primary" aria-label="Seen" />
            ) : null)}
        </div>
      </div>
    )
  }

  if (isSharedPost) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "flex flex-col gap-1 max-w-[85%] md:max-w-[70%]",
          isMe ? "ml-auto items-end" : "mr-auto items-start"
        )}
      >
        <SharedPostMessageCard
          data={msg.shared_post_data!}
          onNavigateToPost={onNavigateToPost}
          onGoToSquad={onGoToSquad}
          isMe={isMe}
        />
        {msg.content && (
          <div
            className={cn(
              "rounded-2xl px-3 py-1.5 text-sm leading-relaxed w-fit max-w-full",
              isMe
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}
          >
            <span className="whitespace-pre-wrap">{msg.content}</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-1">
          <span className="text-xs text-muted-foreground">{time}</span>
          {isMe &&
            (String(msg.id).startsWith("temp-") ? (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            ) : otherUserId && otherLastReadAt && new Date(msg.created_at) <= new Date(otherLastReadAt) ? (
              <CheckCheck className="size-3 text-primary" aria-label="Seen" />
            ) : null)}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex flex-col max-w-[85%] md:max-w-[70%]",
        isMe ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {isImageOrVideo ? (
        <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
          {msg.message_type === "image" && (
            <a href={attUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={attUrl}
                alt={msg.content || "Image"}
                className="max-w-[280px] max-h-[280px] rounded-lg object-contain"
              />
            </a>
          )}
          {msg.message_type === "video" && (
            <video
              src={attUrl}
              controls
              className="max-w-[280px] max-h-[280px] rounded-lg"
              preload="metadata"
            />
          )}
          {uploadProgress != null && uploadProgress < 100 && (
            <div className="w-full max-w-[280px] h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          {msg.content && (
            <>
              {getYouTubeEmbedUrl(msg.content) && (
                <iframe
                  src={getYouTubeEmbedUrl(msg.content)!}
                  title="YouTube video"
                  className="w-full max-w-[280px] aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {stripYouTubeUrls(msg.content) && (
                <span className="text-sm text-foreground/90 whitespace-pre-wrap">{stripYouTubeUrls(msg.content)}</span>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
          {msg.content && getYouTubeEmbedUrl(msg.content) && (
            <iframe
              src={getYouTubeEmbedUrl(msg.content)!}
              title="YouTube video"
              className="w-full max-w-[280px] aspect-video rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {(msg.message_type === "file" && att) || stripYouTubeUrls(msg.content) ? (
            <div
              className={cn(
                "rounded-2xl px-3 py-1.5 text-sm leading-relaxed w-fit max-w-full overflow-hidden",
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              )}
            >
              {msg.message_type === "file" && att && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!attUrl) return
                    try {
                      const res = await fetch(attUrl)
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = att.file_name
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch {
                      window.open(attUrl, "_blank")
                    }
                  }}
                  className="flex items-center gap-2 py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate max-w-[200px]">{att.file_name}</span>
                  {formatFileSize(att.file_size) && (
                    <span className="text-xs opacity-80">{formatFileSize(att.file_size)}</span>
                  )}
                </button>
              )}
              {stripYouTubeUrls(msg.content) && (
                <span className="whitespace-pre-wrap">{stripYouTubeUrls(msg.content)}</span>
              )}
              {uploadProgress != null && uploadProgress < 100 && (
                <div className="w-full max-w-[200px] h-1.5 rounded-full bg-secondary/50 overflow-hidden mt-2">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-xs text-muted-foreground">{time}</span>
        {isMe &&
          (String(msg.id).startsWith("temp-") ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          ) : otherUserId && otherLastReadAt && new Date(msg.created_at) <= new Date(otherLastReadAt) ? (
            <CheckCheck className="size-3 text-primary" aria-label="Seen" />
          ) : null)}
      </div>
    </div>
  )
}

function initials(name: string | null, fallback = "?"): string {
  if (!name?.trim()) return fallback
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function senderDisplayName(msg: Message): string {
  return msg.sender?.full_name?.trim() || msg.sender?.public_name?.trim() || msg.sender?.email || "Unknown"
}

/**
 * Groups consecutive messages from the same sender within 30s of each other.
 * Returns array of groups, each with the sender info and array of messages.
 */
function groupSquadMessages(messages: Message[]): Array<{
  senderId: string
  senderName: string
  senderAvatar: string | null
  timestamp: string
  messages: Message[]
}> {
  const groups: Array<{
    senderId: string
    senderName: string
    senderAvatar: string | null
    timestamp: string
    messages: Message[]
  }> = []

  for (const msg of messages) {
    const last = groups[groups.length - 1]
    if (
      last &&
      last.senderId === msg.sender_id &&
      Math.abs(new Date(msg.created_at).getTime() - new Date(last.messages[last.messages.length - 1].created_at).getTime()) <= 30000
    ) {
      last.messages.push(msg)
    } else {
      groups.push({
        senderId: msg.sender_id,
        senderName: senderDisplayName(msg),
        senderAvatar: msg.sender?.avatar_url || null,
        timestamp: msg.created_at,
        messages: [msg],
      })
    }
  }
  return groups
}

function SquadMessageGroup({
  group,
  isMe,
  scrollRef,
  uploadProgress,
  onNavigateToPost,
  onGoToSquad,
}: {
  group: ReturnType<typeof groupSquadMessages>[number]
  isMe: boolean
  scrollRef?: React.Ref<HTMLDivElement>
  uploadProgress: Record<string, number>
  onNavigateToPost?: (postId: string) => void
  onGoToSquad?: (squadId: string) => void
}) {
  const time = formatMessageTime(group.timestamp)

  return (
    <div ref={scrollRef} className="flex gap-3 max-w-[90%] mr-auto">
      <Avatar className="size-10 shrink-0 mt-0.5">
        {group.senderAvatar ? (
          <img src={group.senderAvatar} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
            {initials(group.senderName)}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{group.senderName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        {group.messages.map((msg) => {
          const att = msg.attachments?.[0]
          const attUrl = att?.url
          const isSharedPost = msg.message_type === "shared_post" && msg.shared_post_data
          const isSharedSquad = msg.message_type === "shared_squad" && msg.shared_squad_data
          const isImageOrVideo = (msg.message_type === "image" || msg.message_type === "video") && attUrl
          const progress = uploadProgress[msg.id]

          if (isSharedSquad) {
            return (
              <div key={msg.id} className="flex flex-col gap-1">
                <SharedSquadMessageCard
                  data={msg.shared_squad_data!}
                  onGoToSquad={onGoToSquad}
                  isMe={isMe}
                  alignLeft
                />
                {msg.content && (
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-1.5 text-sm leading-relaxed w-fit max-w-full",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  </div>
                )}
              </div>
            )
          }

          if (isSharedPost) {
            return (
              <div key={msg.id} className="flex flex-col gap-1">
                <SharedPostMessageCard
                  data={msg.shared_post_data!}
                  onNavigateToPost={onNavigateToPost}
                  onGoToSquad={onGoToSquad}
                  isMe={isMe}
                  alignLeft
                />
                {msg.content && (
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-1.5 text-sm leading-relaxed w-fit max-w-full",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={msg.id} className="flex flex-col">
              {isImageOrVideo ? (
                <div className="flex flex-col gap-1">
                  {msg.message_type === "image" && (
                    <a href={attUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={attUrl} alt={msg.content || "Image"} className="max-w-[280px] max-h-[280px] rounded-lg object-contain" />
                    </a>
                  )}
                  {msg.message_type === "video" && (
                    <video src={attUrl} controls className="max-w-[280px] max-h-[280px] rounded-lg" preload="metadata" />
                  )}
                  {progress != null && progress < 100 && (
                    <div className="w-full max-w-[280px] h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {msg.content && (
                    <>
                      {getYouTubeEmbedUrl(msg.content) && (
                        <iframe
                          src={getYouTubeEmbedUrl(msg.content)!}
                          title="YouTube video"
                          className="w-full max-w-[280px] aspect-video rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                      {stripYouTubeUrls(msg.content) && (
                        <span className="text-sm text-foreground/90 whitespace-pre-wrap">{stripYouTubeUrls(msg.content)}</span>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {msg.content && getYouTubeEmbedUrl(msg.content) && (
                    <iframe
                      src={getYouTubeEmbedUrl(msg.content)!}
                      title="YouTube video"
                      className="w-full max-w-[280px] aspect-video rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  {(msg.message_type === "file" && att) || stripYouTubeUrls(msg.content) ? (
                    <div className="text-sm leading-relaxed w-fit max-w-full overflow-hidden">
                      {msg.message_type === "file" && att && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!attUrl) return
                            try {
                              const res = await fetch(attUrl)
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = att.file_name
                              a.click()
                              URL.revokeObjectURL(url)
                            } catch {
                              window.open(attUrl, "_blank")
                            }
                          }}
                          className="flex items-center gap-2 py-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <FileText className="size-4 shrink-0" />
                          <span className="truncate max-w-[200px]">{att.file_name}</span>
                          {formatFileSize(att.file_size) && <span className="text-xs opacity-80">{formatFileSize(att.file_size)}</span>}
                        </button>
                      )}
                      {stripYouTubeUrls(msg.content) && (
                        <span className="whitespace-pre-wrap">{stripYouTubeUrls(msg.content)}</span>
                      )}
                      {progress != null && progress < 100 && (
                        <div className="w-full max-w-[200px] h-1.5 rounded-full bg-secondary/50 overflow-hidden mt-2">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── New Message Form (inline or in modal) ──
function NewMessageForm({
  currentUserId,
  onBack,
  onSelectConversation,
  inModal,
}: {
  currentUserId: string
  onBack: () => void
  onSelectConversation: (id: string) => void
  inModal?: boolean
}) {
  const isMobileLayout = useIsMobile()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchGen = useRef(0)

  useEffect(() => {
    if (!query.trim() || !currentUserId) {
      searchGen.current += 1
      setResults([])
      setListError(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const myGen = ++searchGen.current
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc("list_profiles_for_invite_search", {
          viewer_id_param: currentUserId,
          query_param: query.trim() || null,
        })
        if (myGen !== searchGen.current) return
        if (error) {
          setResults([])
          setListError(true)
          toast.error("Couldn't search people.", { id: "new-message-search-rpc" })
          return
        }
        setListError(false)
        const list = (data || []).map(
          (p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => ({
            id: p.id,
            full_name: p.full_name,
            public_name: p.public_name,
            avatar_url: p.avatar_url,
          })
        )
        setResults(list)
      } finally {
        if (myGen === searchGen.current) setLoading(false)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      searchGen.current += 1
    }
  }, [query, currentUserId])

  const handleSelect = async (userId: string) => {
    try {
      const conv = await MessagingService.createDM(userId)
      onSelectConversation(conv.id)
      setQuery("")
      setResults([])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("blocked")) {
        toast.error("Cannot start a conversation with this user. Unblock in Settings.")
      } else {
        toast.error("Failed to create conversation")
      }
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", inModal ? "h-full min-w-0" : "h-full")}>
      {!inModal && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
          <button
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-semibold text-foreground">New message</h2>
        </div>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col", inModal ? "" : "overflow-hidden p-4")}>
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
            autoFocus={!isMobileLayout}
          />
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y",
            query.trim() && "sheet-scroll-frame p-1",
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex flex-col gap-1 pr-1">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && results.length === 0 && query.trim() && (
              <p className="text-sm text-muted-foreground py-2">
                {listError ? "Couldn't load results. Try again." : "No users found"}
              </p>
            )}
            {!loading &&
              results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u.id)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                >
                  <Avatar className="size-8">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                        {initials(u.full_name || u.public_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.full_name || u.public_name || "Unknown"}
                    </p>
                    {u.public_name && (
                      <p className="text-xs text-muted-foreground">@{u.public_name.replace(/^@/, "")}</p>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── New Group Form (inline or in modal) ──
function NewGroupForm({
  currentUserId,
  onBack,
  onSelectConversation,
  onRefresh,
  inModal,
  onPhaseChange,
}: {
  currentUserId: string
  onBack: () => void
  onSelectConversation: (id: string) => void
  onRefresh?: () => void
  inModal?: boolean
  /** Mobile drawer title: switch when moving to optional avatar step */
  onPhaseChange?: (phase: "form" | "photo") => void
}) {
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onPhaseChange?.(createdId ? "photo" : "form")
  }, [createdId, onPhaseChange])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await MessagingService.searchUsers(query)
      const list = (data || [])
        .filter((p) => p.id !== currentUserId)
        .map((p) => ({ id: p.id, full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url }))
      setResults(list)
      setLoading(false)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, currentUserId])

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile)
      setAvatarPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAvatarPreview(null)
  }, [avatarFile])

  const toggleUser = (id: string, displayName: string) => {
    if (id === currentUserId) return
    setSelected((prev) => {
      const removing = prev.includes(id)
      setSelectedNames((names) => {
        const n = { ...names }
        if (removing) delete n[id]
        else n[id] = displayName
        return n
      })
      return removing ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  const handleCreate = async () => {
    const members = selected.filter((id) => id !== currentUserId)
    if (!name.trim() || members.length < 1 || creating) return
    setCreating(true)
    try {
      const conv = await MessagingService.createGroupChat(name.trim(), members)
      setCreatedId(conv.id)
    } catch (e) {
      console.error("Failed to create group:", e)
      toast.error("Failed to create group")
    } finally {
      setCreating(false)
    }
  }

  const handleContinue = async () => {
    if (!createdId) return
    if (avatarFile && !uploadingAvatar) {
      setUploadingAvatar(true)
      try {
        await MessagingService.uploadGroupAvatar(createdId, avatarFile)
      } catch (e) {
        console.error("Failed to upload avatar:", e)
        toast.error("Failed to upload photo")
        setUploadingAvatar(false)
        return
      }
      setUploadingAvatar(false)
    }
    onSelectConversation(createdId)
    onRefresh?.()
    setCreatedId(null)
    setAvatarFile(null)
    setName("")
    setQuery("")
    setSelected([])
    setSelectedNames({})
  }

  const handleSkip = () => {
    if (createdId) {
      onSelectConversation(createdId)
      onRefresh?.()
      setCreatedId(null)
      setAvatarFile(null)
      setName("")
      setQuery("")
      setSelected([])
      setSelectedNames({})
    }
  }

  if (createdId) {
    return (
      <div className="flex flex-col h-full">
        {!inModal && (
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
            <button
              onClick={onBack}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-base font-semibold text-foreground">Add group photo</h2>
          </div>
        )}
        <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
          <div className="flex flex-col gap-4 items-center">
            <div className="relative">
              <Avatar className="size-24">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="size-24 rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-accent text-accent-foreground text-3xl">
                    {initials(name || "G")}
                  </AvatarFallback>
                )}
              </Avatar>
              <label className="absolute bottom-0 right-0 flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90">
                <Camera className="size-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setAvatarFile(f)
                    e.target.value = ""
                  }}
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground text-center">Optional: add a photo for your group</p>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleSkip}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium border border-border bg-secondary text-foreground hover:bg-secondary/80"
              >
                Skip
              </button>
              <button
                onClick={handleContinue}
                disabled={uploadingAvatar}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploadingAvatar ? "Uploading..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", inModal ? "h-full min-w-0" : "h-full")}>
      {!inModal && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
          <button
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-semibold text-foreground">New group</h2>
        </div>
      )}
      {/* One scroll region (incl. Create button). Nested ScrollArea + sibling button clipped the footer when the drawer was keyboard-shortened on iOS. */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y",
          inModal ? "pb-4" : "p-4",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Group CS229"
              className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((id) => {
                const label = selectedNames[id] || "?"
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {label.split(" ")[0]}
                    <button
                      onClick={() => toggleUser(id, label)}
                      className="flex size-4 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Add Members</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or @username..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          {(query.trim() || loading) && (
            <div
              className="sheet-scroll-frame flex max-h-64 min-h-28 touch-pan-y flex-col gap-0.5 overflow-y-auto overscroll-y-contain p-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading &&
                results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id, u.full_name || u.public_name || "Unknown")}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left",
                      selected.includes(u.id) ? "bg-primary/10" : "hover:bg-secondary",
                    )}
                  >
                    <Avatar className="size-8">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                          {initials(u.full_name || u.public_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.full_name || u.public_name || "Unknown"}
                      </p>
                      {u.public_name && (
                        <p className="text-xs text-muted-foreground">@{u.public_name.replace(/^@/, "")}</p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                        selected.includes(u.id) ? "border-primary bg-primary" : "border-border",
                      )}
                    >
                      {selected.includes(u.id) && <CheckCheck className="size-3 text-primary-foreground" />}
                    </div>
                  </button>
                ))}
              {!loading && query.trim() && results.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">No users found</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={!name.trim() || selected.length < 1 || creating}
          onClick={handleCreate}
          className={cn(
            "mt-4 w-full shrink-0 rounded-lg py-2.5 text-sm font-medium transition-colors",
            name.trim() && selected.length >= 1 && !creating
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed",
          )}
        >
          {creating ? "Creating..." : `Create Group (${selected.length + 1} ${selected.length + 1 === 1 ? "member" : "members"})`}
        </button>
      </div>
    </div>
  )
}

// ── Edit Group Panel (desktop: inline; mobile: bottom sheet, like Group Members) ──
function EditGroupPanel({
  open,
  onOpenChange,
  conversationId,
  currentName,
  currentAvatarUrl,
  isMobile,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  conversationId: string
  currentName: string | null
  currentAvatarUrl: string | null
  isMobile: boolean
  onSaved: () => void
}) {
  const [name, setName] = useState(currentName ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(currentName ?? "")
  }, [currentName, open])

  useEffect(() => {
    if (!open) {
      setAvatarFile(null)
      setRemoveAvatar(false)
    }
  }, [open])

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile)
      setAvatarPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAvatarPreview(null)
  }, [avatarFile])

  const displayUrl = removeAvatar ? null : (avatarPreview ?? currentAvatarUrl)

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      if (avatarFile) await MessagingService.uploadGroupAvatar(conversationId, avatarFile)
      else if (removeAvatar) await MessagingService.removeGroupAvatar(conversationId)
      await MessagingService.updateGroup(conversationId, { name: name.trim() })
      toast.success("Edits saved")
      onSaved()
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to update group:", e)
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const editBody = (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Group Photo</label>
          <div className="relative">
            <Avatar className="size-20">
              {displayUrl ? (
                <img src={displayUrl} alt="" className="size-20 rounded-full object-cover" />
              ) : (
                <AvatarFallback className="bg-accent text-accent-foreground text-2xl">
                  {initials(currentName ?? "G")}
                </AvatarFallback>
              )}
            </Avatar>
            <label className="absolute bottom-0 right-0 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90">
              <Camera className="size-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setAvatarFile(f)
                    setRemoveAvatar(false)
                  }
                  e.target.value = ""
                }}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-primary hover:underline"
            >
              Change photo
            </button>
            {(displayUrl || removeAvatar) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null)
                  setRemoveAvatar(true)
                }}
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Study Group CS229"
            className="bg-secondary border-none"
          />
        </div>
        <Button className="mt-2 w-full" disabled={!name.trim() || saving} onClick={handleSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
    </div>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Group"
        description="Change photo and name"
        variant="form"
        maxHeightClassName="max-h-[80dvh]"
      >
        {editBody}
      </MobileBottomDrawer>
    )
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Edit Group</h3>
        <button type="button" onClick={() => onOpenChange(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{editBody}</div>
    </div>
  )
}

// ── Group Members Panel (desktop: inline; mobile: bottom sheet) ──
function GroupMembersPanel({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  isMobile,
  onMembersChanged,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  conversationId: string
  currentUserId: string
  isMobile: boolean
  onMembersChanged?: () => void
}) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [addQuery, setAddQuery] = useState("")
  const [addResults, setAddResults] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const loadParticipants = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    try {
      const list = await MessagingService.getParticipants(conversationId)
      setParticipants(list)
    } catch {
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (open && conversationId) loadParticipants()
  }, [open, conversationId, loadParticipants])

  useEffect(() => {
    if (!addQuery.trim()) {
      setAddResults([])
      setAddLoading(false)
      return
    }
    setAddLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await MessagingService.searchUsers(addQuery)
      const participantIds = new Set(participants.map((p) => p.user_id))
      const list = (data || [])
        .filter((p) => p.id !== currentUserId && !participantIds.has(p.id))
        .map((p) => ({ id: p.id, full_name: p.full_name, public_name: p.public_name, avatar_url: p.avatar_url }))
      setAddResults(list)
      setAddLoading(false)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [addQuery, currentUserId, participants])

  const handleAdd = async (userId: string) => {
    setAddingId(userId)
    try {
      await MessagingService.addParticipant(conversationId, userId)
      await loadParticipants()
      setAddQuery("")
      setAddResults([])
      onMembersChanged?.()
      toast.success("Member added")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setAddingId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    if (userId === currentUserId) return
    setRemovingId(userId)
    try {
      await MessagingService.removeParticipant(conversationId, userId)
      await loadParticipants()
      onMembersChanged?.()
      toast.success("Member removed")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove")
    } finally {
      setRemovingId(null)
    }
  }

  const memberList = (
    <div className="flex flex-col gap-1">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        participants.map((p) => {
          const isMe = p.user_id === currentUserId
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-secondary/50"
            >
              <Avatar className="size-10 shrink-0">
                {p.profile?.avatar_url ? (
                  <img src={p.profile.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                ) : null}
<AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                {initials(p.profile?.full_name ?? p.profile?.public_name ?? null)}
              </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.profile?.full_name?.trim() || p.profile?.public_name || p.profile?.email || "Unknown"}
                  {isMe && " (you)"}
                </p>
                {p.profile?.public_name && (
                  <p className="text-xs text-muted-foreground truncate">@{p.profile.public_name.replace(/^@/, "")}</p>
                )}
                {!p.profile?.public_name && p.profile?.email && !isMe && (
                  <p className="text-xs text-muted-foreground truncate">{p.profile.email}</p>
                )}
              </div>
              {!isMe && (
                <button
                  onClick={() => handleRemove(p.user_id)}
                  disabled={!!removingId}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label={`Remove ${p.profile?.full_name || "member"}`}
                >
                  {removingId === p.user_id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  const addSection = (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">Add member</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          placeholder="Search by name or @username..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {addQuery.trim() && (
        <div
          className="sheet-scroll-frame flex min-h-28 max-h-44 touch-pan-y flex-col gap-0.5 overflow-y-auto overscroll-y-contain p-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {addLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : addResults.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No users found</p>
          ) : (
            addResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleAdd(u.id)}
                disabled={!!addingId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary text-left text-sm disabled:opacity-50"
              >
                <Avatar className="size-6 shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                    {initials(u.full_name || u.public_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.full_name || u.public_name || "Unknown"}
                  </p>
                  {u.public_name && (
                    <p className="text-xs text-muted-foreground truncate">@{u.public_name.replace(/^@/, "")}</p>
                  )}
                </div>
                {addingId === u.id && <Loader2 className="size-3 animate-spin shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )

  const membersScrollInner = <div className="-mx-1 flex flex-col gap-1 pr-2">{memberList}</div>

  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Group Members"
        description={
          loading
            ? "Loading members"
            : `${participants.length} ${participants.length === 1 ? "member" : "members"}`
        }
        variant="inputStable"
        maxHeightClassName="max-h-[80dvh]"
        scrollBody={false}
      >
        {/* Members on top (scroll); add + search results pinned below so results never hide the roster. */}
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p className="mb-2 shrink-0 text-xs font-medium text-muted-foreground">Current members</p>
            <div
              className="sheet-scroll-frame min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {membersScrollInner}
            </div>
          </div>
          <div className="mt-3 shrink-0 border-t border-border bg-background pt-3">{addSection}</div>
        </div>
      </MobileBottomDrawer>
    )
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Group Members</h3>
        <button type="button" onClick={() => onOpenChange(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Current members</p>
          <div className="sheet-scroll-frame p-2">{membersScrollInner}</div>
        </div>
        {addSection}
      </div>
    </div>
  )
}

// ── Hide Chat Confirm (bottom-right popup on desktop, bottom sheet on mobile) ──
function HideConfirmPopup({
  open,
  onClose,
  isGroup,
  onConfirm,
  isMobile,
}: {
  open: boolean
  onClose: () => void
  isGroup: boolean
  onConfirm: () => void | Promise<void>
  isMobile: boolean
}) {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }
  const title = isGroup ? "Hide this group?" : "Hide this chat?"
  const description = isGroup
    ? "This will hide the group from your list. You'll see it again if someone messages."
    : "This will hide the chat from your list. You'll see it again if you get a new message."
  const content = (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Hide"}
        </Button>
      </div>
    </div>
  )
  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={title}
        description={description}
        scrollBody={false}
      >
        <div className="px-4 pb-6 pt-2">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Hide"}
            </Button>
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }
  return (
    open && (
      <div className="fixed bottom-6 right-6 z-50 w-[320px] rounded-2xl border border-border bg-card shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {content}
      </div>
    )
  )
}

// ── Block User Confirm (bottom-right popup on desktop, bottom sheet on mobile) ──
function BlockConfirmPopup({
  open,
  onClose,
  displayName,
  onConfirm,
  isMobile,
}: {
  open: boolean
  onClose: () => void
  displayName: string
  onConfirm: () => void | Promise<void>
  isMobile: boolean
}) {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }
  const title = `Block ${displayName || "this user"}?`
  const description = "You won't be able to message each other. They can unblock you in Settings."
  const content = (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Block"}
        </Button>
      </div>
    </div>
  )
  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={title}
        description={description}
        scrollBody={false}
      >
        <div className="px-4 pb-6 pt-2">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Block"}
            </Button>
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }
  return (
    open && (
      <div className="fixed bottom-6 right-6 z-50 w-[320px] rounded-2xl border border-border bg-card shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {content}
      </div>
    )
  )
}

// ── Conversation List ──
function ConversationList({
  conversations,
  hiddenConversations,
  loading,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onNewMessage,
  onNewGroup,
  onUnhide,
  friendsOnly,
  friendIds,
  onFriendsOnlyChange,
  onNavigateToExplore,
}: {
  conversations: DmConversationRow[]
  hiddenConversations: DmConversationRow[]
  loading: boolean
  selectedId: string | null
  search: string
  onSearchChange: (v: string) => void
  onSelect: (id: string) => void
  onNewMessage: () => void
  onNewGroup: () => void
  onUnhide: (id: string) => void | Promise<void>
  friendsOnly: boolean
  friendIds: Set<string>
  onFriendsOnlyChange: (v: boolean) => void
  onNavigateToExplore?: () => void
}) {
  const [hiddenSheetOpen, setHiddenSheetOpen] = useState(false)
  const listScrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return conversations.filter((c) => {
      if (friendsOnly && (c.type !== "dm" || !friendIds.has(c.other_user_id))) return false
      if (!term) return true
      const display = (c.other_display_name ?? "").toLowerCase()
      const convName = (c.name ?? "").toLowerCase()
      return display.includes(term) || convName.includes(term)
    })
  }, [conversations, search, friendsOnly, friendIds])

  const rowVirtualizer = useVirtualizer({
    count: !loading && filtered.length > 0 ? filtered.length : 0,
    getScrollElement: () => listScrollRef.current,
    estimateSize: () => 76,
    overscan: 10,
    getItemKey: (index) => filtered[index]!.id,
  })

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className={pageMainTitleClass}>Messages</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80 transition-colors"
                aria-label="New conversation"
              >
                <Plus className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border">
              <DropdownMenuItem onClick={onNewMessage}>New message</DropdownMenuItem>
              <DropdownMenuItem onClick={onNewGroup}>
                <UsersIcon className="size-4 mr-2" />
                New group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or group"
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50"
            aria-label="Search conversations"
          />
        </div>
        <button
          type="button"
          onClick={() => onFriendsOnlyChange(!friendsOnly)}
          className={cn(
            "flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-colors mb-2 border",
            friendsOnly
              ? "bg-primary/15 text-primary border-primary/30"
              : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-muted-foreground/30"
          )}
          aria-pressed={friendsOnly}
          aria-label={friendsOnly ? "Show all conversations" : "Show friends only"}
        >
          <UserCheck className="size-4" />
          Friends only
        </button>
      </div>

      <div
        ref={listScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {loading && (
          <div className="flex flex-col px-2 py-1">
            <ConversationListSkeleton count={6} />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 px-4 gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {conversations.length === 0
                ? "No conversations yet. Start a new message."
                : friendsOnly
                  ? "No conversations with friends."
                  : "No matches."}
            </p>
            {friendsOnly && onNavigateToExplore && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={onNavigateToExplore}
              >
                <Compass className="size-4" />
                Explore People
              </Button>
            )}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div
            className="relative w-full px-2 py-1"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const conv = filtered[virtualRow.index]!
              const hoverColor = convHoverColor(conv.id)
              return (
                <div
                  key={conv.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full box-border"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all md:border md:border-transparent",
                      selectedId !== conv.id && "hover:bg-secondary/50",
                      selectedId === conv.id && hoverColor === "quad-green" && "bg-quad-green/15 md:border-quad-green/30",
                      selectedId === conv.id && hoverColor === "quad-blue" && "bg-quad-blue/15 md:border-quad-blue/30",
                      selectedId === conv.id && hoverColor === "quad-red" && "bg-quad-red/15 md:border-quad-red/30",
                      selectedId === conv.id && hoverColor === "quad-yellow" && "bg-quad-yellow/15 md:border-quad-yellow/30",
                      selectedId !== conv.id && "md:hover:shadow-lg",
                      selectedId !== conv.id && hoverColor === "quad-green" && "md:hover:border-quad-green/30 md:hover:shadow-quad-green/20",
                      selectedId !== conv.id && hoverColor === "quad-blue" && "md:hover:border-quad-blue/30 md:hover:shadow-quad-blue/20",
                      selectedId !== conv.id && hoverColor === "quad-red" && "md:hover:border-quad-red/30 md:hover:shadow-quad-red/20",
                      selectedId !== conv.id && hoverColor === "quad-yellow" && "md:hover:border-quad-yellow/30 md:hover:shadow-quad-yellow/20"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-11">
                        {conv.other_avatar_url ? (
                          <img src={conv.other_avatar_url} alt="" className="size-11 rounded-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                            {initials(conv.other_display_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {conv.unread_count > 0 && (
                        <span className="absolute bottom-0 right-0 size-3 rounded-full bg-primary ring-2 ring-background" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              conv.unread_count > 0 ? "text-foreground" : "text-foreground/80"
                            )}
                          >
                            {conv.other_display_name || "Unknown"}
                          </span>
                          {conv.squad_id && (
                            <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                              Squad
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {conv.muted_at && (
                            <VolumeX className="size-4 text-muted-foreground" aria-label="Muted" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.last_message_created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <p
                          className={cn(
                            "truncate text-xs",
                            conv.unread_count > 0 ? "font-medium text-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {conv.last_message_content || "No messages yet"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {hiddenConversations.length > 0 && (
        <div
          className={cn(
            "shrink-0 flex flex-col border-t border-border bg-background overflow-hidden transition-[max-height] duration-200 ease-out",
            hiddenSheetOpen ? "max-h-[25dvh]" : "max-h-[3.5rem]"
          )}
          aria-label="Hidden chats"
        >
          <button
            type="button"
            onClick={() => setHiddenSheetOpen(!hiddenSheetOpen)}
            className="shrink-0 flex items-center justify-between gap-2 w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <span>Hidden ({hiddenConversations.length})</span>
            <ChevronUp className={cn("size-4 shrink-0 transition-transform", hiddenSheetOpen && "rotate-180")} />
          </button>
          {hiddenSheetOpen && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col px-2 py-1">
                {hiddenConversations.map((conv) => {
                  const hoverColor = convHoverColor(conv.id)
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all md:border md:border-transparent overflow-hidden",
                        "hover:bg-secondary/50 md:hover:shadow-lg cursor-pointer",
                        hoverColor === "quad-green" && "md:hover:border-quad-green/30 md:hover:shadow-quad-green/20",
                        hoverColor === "quad-blue" && "md:hover:border-quad-blue/30 md:hover:shadow-quad-blue/20",
                        hoverColor === "quad-red" && "md:hover:border-quad-red/30 md:hover:shadow-quad-red/20",
                        hoverColor === "quad-yellow" && "md:hover:border-quad-yellow/30 md:hover:shadow-quad-yellow/20"
                      )}
                      onClick={() => { onUnhide(conv.id); setHiddenSheetOpen(false) }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { onUnhide(conv.id); setHiddenSheetOpen(false) } }}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-11">
                          {conv.other_avatar_url ? (
                            <img src={conv.other_avatar_url} alt="" className="size-11 rounded-full object-cover" />
                          ) : (
                            <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                              {initials(conv.other_display_name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {conv.unread_count > 0 && (
                          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                conv.unread_count > 0 ? "text-foreground" : "text-foreground/80"
                              )}
                            >
                              {conv.other_display_name || "Unknown"}
                            </span>
                            {conv.squad_id && (
                              <span className="shrink-0 inline-flex items-center justify-center text-xs font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                                Squad
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(conv.last_message_created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                          <p
                            className={cn(
                              "text-xs truncate min-w-0",
                              conv.unread_count > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
                            )}
                          >
                            {conv.last_message_content || "No messages yet"}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {conv.unread_count > 0 && (
                              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {conv.unread_count}
                              </span>
                            )}
                            <button
                              type="button"
                              className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUnhide(conv.id)
                                setHiddenSheetOpen(false)
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              Unhide
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  )
}

// ── Chat View ──
export function ChatView({
  conversationId,
  otherDisplayName,
  otherAvatarUrl,
  isGroup,
  otherUserId,
  currentUserId,
  onBack,
  onDeleteGroup,
  onMarkAsRead,
  onViewUserProfile,
  embedded,
  embeddedWithOverlay,
  squadChat,
  squadChatNoSettings,
  squadId,
  onGoToSquad,
  onNavigateToPost,
  muted,
  onMuteToggle,
  onBlock,
  onBlockInfo,
}: {
  conversationId: string
  otherDisplayName: string | null
  otherAvatarUrl: string | null
  isGroup: boolean
  otherUserId?: string | null
  currentUserId: string
  onBack: () => void
  onDeleteGroup?: () => void
  onMarkAsRead?: () => void
  /** When provided and this is a DM, avatar/name in header opens profile. */
  onViewUserProfile?: (userId: string) => void
  /** When true, hides the header and group settings panels (for embedding in squad pages). */
  embedded?: boolean
  /** When true with embedded, uses pt-16 for overlay clearance (squad chat mobile). */
  embeddedWithOverlay?: boolean
  /** When true, renders all messages left-aligned with avatars/names and grouping (for squad group chats). */
  squadChat?: boolean
  /** When true with squadChat, hides settings dropdown and group panels (squad chat in messages page). */
  squadChatNoSettings?: boolean
  /** Squad ID when squad chat; used for "Go to squad" button. */
  squadId?: string | null
  /** Called when user taps "Go to squad" in squad chat header. */
  onGoToSquad?: (squadId: string) => void
  /** Called when user taps "View post" on a shared post. */
  onNavigateToPost?: (postId: string) => void
  /** When true, notifications are muted for this conversation. */
  muted?: boolean
  /** Called when user toggles mute. */
  onMuteToggle?: () => void | Promise<void>
  /** Called when user blocks the other person (DM only). */
  onBlock?: (userId: string) => void | Promise<void>
  /** Called when user wants to see blocking info (messages: AlertDialog). */
  onBlockInfo?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ id: string; file: File; type: "image" | "video" | "file"; url: string; name: string; size: number }>
  >([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const hasScrolledToBottomRef = useRef(false)
  /** Stable key for optimistic->real replacement to avoid remount (prevents iframe flash) */
  const messageKeyRef = useRef<Map<string, string>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const displayUrlsRef = useRef<string[]>([])
  const TEXTAREA_MAX_LINES = 10
  const LINE_HEIGHT = 24

  const load = useCallback(async () => {
    setLoading(true)
    setHasMore(true)
    hasScrolledToBottomRef.current = false
    try {
      const [msgs, _] = await Promise.all([
        MessagingService.getMessages(conversationId),
        otherUserId
          ? MessagingService.getOtherParticipantLastReadAt(conversationId, otherUserId).then(setOtherLastReadAt)
          : Promise.resolve(null),
      ])
      setMessages(msgs)
      if (msgs.length < 50) setHasMore(false)
      await MessagingService.markAsRead(conversationId)
      onMarkAsRead?.()
    } catch (e) {
      console.error("Failed to load messages:", e)
    } finally {
      setLoading(false)
    }
  }, [conversationId, otherUserId, onMarkAsRead])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!otherUserId) setOtherLastReadAt(null)
  }, [otherUserId])

  useEffect(() => {
    if (!loading && messages.length > 0 && !hasScrolledToBottomRef.current) {
      hasScrolledToBottomRef.current = true
      requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ behavior: "auto" }))
    }
  }, [loading, messages.length])

  const handleRealtimeMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        // Ignore our own attachment messages from realtime - we replace optimistics from API response
        if (msg.sender_id === currentUserId && msg.message_type !== "text") return prev
        const pendingFromMe = prev.find(
          (m) =>
            String(m.id).startsWith("temp-") &&
            m.sender_id === currentUserId &&
            m.message_type === "text" &&
            m.content === msg.content
        )
        if (pendingFromMe && msg.sender_id === currentUserId && msg.message_type === "text") {
          messageKeyRef.current.set(msg.id, pendingFromMe.id)
          return prev.map((m) => (m.id === pendingFromMe.id ? msg : m))
        }
        return [...prev, msg]
      })
    },
    [currentUserId]
  )

  useEffect(() => {
    messageKeyRef.current.clear()
  }, [conversationId])

  useEffect(() => {
    const channel = MessagingService.subscribeToMessages(conversationId, handleRealtimeMessage)
    return () => MessagingService.unsubscribeFromMessages(channel)
  }, [conversationId, handleRealtimeMessage])

  useEffect(() => {
    if (!otherUserId) return
    const channel = MessagingService.subscribeToParticipants(conversationId, () => {
      MessagingService.getOtherParticipantLastReadAt(conversationId, otherUserId).then(setOtherLastReadAt)
    })
    return () => MessagingService.unsubscribeFromParticipants(channel)
  }, [conversationId, otherUserId])

  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadingOlderRef = useRef(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const loadOlder = useCallback(async () => {
    const msgs = messagesRef.current
    if (loadingOlderRef.current || !hasMore || msgs.length === 0) return
    const oldest = msgs[0]
    const convId = conversationId
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const older = await MessagingService.getMessagesBefore(convId, oldest.created_at, 50)
      if (older.length < 50) setHasMore(false)
      if (older.length > 0) {
        const container = scrollContainerRef.current
        const prevScrollHeight = container?.scrollHeight ?? 0
        const prevScrollTop = container?.scrollTop ?? 0
        setMessages((prev) => {
          if (prev.length === 0 || prev[0]?.id !== oldest.id) return prev
          return [...older, ...prev]
        })
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = scrollContainerRef.current
            if (!el) return
            const newScrollHeight = el.scrollHeight
            el.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
          })
        })
      }
    } catch (e) {
      console.error("Failed to load older messages:", e)
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [conversationId, hasMore])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    const container = scrollContainerRef.current
    if (!sentinel || !container || loading || messages.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        loadOlder()
      },
      { root: container, rootMargin: "100px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, messages.length, loadOlder])

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const sendOneFile = (file: File, caption?: string, onProgress?: (pct: number) => void) => {
    if (file.type.startsWith("image/")) return MessagingService.sendImageMessage(conversationId, file, caption, onProgress)
    if (file.type.startsWith("video/")) return MessagingService.sendVideoMessage(conversationId, file, caption, onProgress)
    return MessagingService.sendFileMessage(conversationId, file, caption, onProgress)
  }

  const handleSend = async () => {
    const text = message.trim()
    const attachmentsToSend = [...pendingAttachments]
    const hasAttachments = attachmentsToSend.length > 0
    if ((!text && !hasAttachments) || sending) return

    setSending(true)
    setMessage("")
    setPendingAttachments([])
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })

    try {
      if (hasAttachments) {
        const baseId = Date.now()
        const videoUrlsToRevoke: string[] = []
        const optimisticMessages: Message[] = []

        for (let i = 0; i < attachmentsToSend.length; i++) {
          const att = attachmentsToSend[i]
          const tempId = `temp-${baseId}-${i}`
          const previewUrl =
            att.type === "image" ? att.url : att.type === "video" ? URL.createObjectURL(att.file) : ""
          if (att.type === "video" && previewUrl) videoUrlsToRevoke.push(previewUrl)

          optimisticMessages.push({
            id: tempId,
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: null,
            message_type: att.type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attachments: [
              {
                id: tempId,
                message_id: tempId,
                file_name: att.name,
                file_path: "",
                file_size: att.size,
                mime_type: att.file.type || null,
                storage_bucket: "",
                created_at: new Date().toISOString(),
                url: previewUrl || undefined,
              },
            ],
          })
        }

        if (text) {
          optimisticMessages.push({
            id: `temp-${baseId}-text`,
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: text,
            message_type: "text",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        setMessages((prev) => [...prev, ...optimisticMessages])

        const attachmentPromises = attachmentsToSend.map((att, i) => {
          const tempId = optimisticMessages[i].id
          const onProgress = (pct: number) =>
            setUploadProgress((prev) => ({ ...prev, [tempId]: pct }))
          return sendOneFile(att.file, undefined, onProgress)
        })
        const textPromise = text ? MessagingService.sendTextMessage(conversationId, text) : Promise.resolve(null)
        const [sentAttachments, sentText] = await Promise.all([
          Promise.all(attachmentPromises),
          textPromise,
        ])

        setMessages((prev) => {
          const replaced = new Map<string, Message>()
          let attachmentIdx = 0
          for (const opt of optimisticMessages) {
            if (opt.message_type === "text") {
              if (sentText) {
                messageKeyRef.current.set(sentText.id, opt.id)
                replaced.set(opt.id, sentText)
              }
            } else {
              const sent = sentAttachments[attachmentIdx]
              const att = attachmentsToSend[attachmentIdx]
              attachmentIdx++
              if (sent) {
                messageKeyRef.current.set(sent.id, opt.id)
                const previewUrl =
                  att.type === "image"
                    ? att.url
                    : att.type === "video"
                      ? videoUrlsToRevoke[attachmentsToSend.slice(0, attachmentIdx - 1).filter((a) => a.type === "video").length]
                      : ""
                if (previewUrl && sent.attachments?.[0]) {
                  displayUrlsRef.current.push(previewUrl)
                  replaced.set(opt.id, {
                    ...sent,
                    attachments: [{ ...sent.attachments[0], url: previewUrl }],
                  })
                } else {
                  replaced.set(opt.id, sent)
                }
              }
            }
          }
          return prev.map((m) => replaced.get(m.id) ?? m)
        })
        setUploadProgress({})
        // Don't revoke image/video URLs - we use them for instant display; revoke on unmount
      } else {
        const tempId = `temp-${Date.now()}`
        const optimistic: Message = {
          id: tempId,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: text,
          message_type: "text",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, optimistic])
        const sent = await MessagingService.sendTextMessage(conversationId, text)
        messageKeyRef.current.set(sent.id, tempId)
        setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)))
      }
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    } catch (e) {
      console.error("Failed to send:", e)
      const reason = getUploadErrorReason(e)
      toast.error(`Failed to send: ${reason}`)
      setMessage(text)
      setPendingAttachments(attachmentsToSend)
      setMessages((prev) => prev.filter((m) => !String(m.id).startsWith("temp-")))
      setUploadProgress({})
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const newAttachments = Array.from(files).map((file, i) => {
      const isImage = file.type.startsWith("image/")
      const isVideo = file.type.startsWith("video/")
      const type: "image" | "file" | "video" = isImage ? "image" : isVideo ? "video" : "file"
      const url = isImage ? URL.createObjectURL(file) : ""
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${i}`
      return { id, file, type, url, name: file.name, size: file.size }
    })
    setPendingAttachments((prev) => [...prev, ...newAttachments])
    e.target.value = ""
  }

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed?.url) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  const pendingAttachmentsRef = useRef(pendingAttachments)
  pendingAttachmentsRef.current = pendingAttachments
  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((att) => att.url && URL.revokeObjectURL(att.url))
      displayUrlsRef.current.forEach(URL.revokeObjectURL)
      displayUrlsRef.current = []
    }
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const maxHeight = LINE_HEIGHT * TEXTAREA_MAX_LINES
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden"
  }, [message])

  const displayName = otherDisplayName || "Unknown"
  const isMobile = useIsMobile()
  const [rightPanel, setRightPanel] = useState<"members" | "edit" | null>(null)
  const panelOpen = rightPanel !== null

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 min-w-0 relative flex flex-col overflow-hidden">
      {!embedded && (
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex z-10",
          squadChat ? "items-center justify-between px-4 py-3 md:justify-start md:gap-2 md:pl-6 md:pr-4" : "items-center justify-between px-4 py-3"
        )}
      >
        {squadChat ? (
          <>
            <div className="flex items-center w-10 shrink-0 md:hidden">
              <button
                onClick={onBack}
                className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="size-5" />
              </button>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 min-w-0 mt-4 md:static md:translate-x-0 md:mt-0 md:ml-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-full rounded-2xl bg-white/50 backdrop-blur-md px-3 py-1 shadow-[0_0_12px_rgba(0,0,0,0.08)] z-0 dark:bg-black/50">
                {displayName}
              </p>
              {squadId && onGoToSquad && (
                <button
                  type="button"
                  onClick={() => onGoToSquad(squadId)}
                  className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
                >
                  Go to squad
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 w-9 shrink-0 justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-border">
                  {onMuteToggle && (
                    <DropdownMenuItem onClick={onMuteToggle}>
                      {muted ? (
                        <>
                          <Volume2 className="size-4" />
                          Unmute Notifications
                        </>
                      ) : (
                        <>
                          <VolumeX className="size-4" />
                          Mute Notifications
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {onDeleteGroup && (
                    <>
                      {onMuteToggle && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={onDeleteGroup}>
                        <EyeOff className="size-4" />
                        Hide chat
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isGroup && otherUserId && onBlock && (
                    <>
                      {(onMuteToggle || onDeleteGroup) && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => onBlock(otherUserId)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="size-4" />
                        Block
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <>
        <div className="flex items-center w-10 shrink-0">
          <button
            onClick={onBack}
            className="md:hidden flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center min-w-0 mt-4">
          {!isGroup && otherUserId && onViewUserProfile ? (
            <button
              type="button"
              onClick={() => onViewUserProfile(otherUserId)}
              className="flex flex-col items-center min-w-0 rounded-2xl transition-opacity active:opacity-80 hover:opacity-90"
              aria-label={`View ${displayName}'s profile`}
            >
              <Avatar className="size-11 shrink-0 relative z-10 -mb-2">
                {otherAvatarUrl ? (
                  <img src={otherAvatarUrl} alt="" className="size-11 rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-sm font-semibold text-foreground truncate max-w-full rounded-2xl bg-white/50 backdrop-blur-md px-3 py-1 shadow-[0_0_12px_rgba(0,0,0,0.08)] z-0">{displayName.trim().split(/\s+/)[0] || displayName}</p>
            </button>
          ) : (
            <>
              <Avatar className="size-11 shrink-0 relative z-10 -mb-2">
                {otherAvatarUrl ? (
                  <img src={otherAvatarUrl} alt="" className="size-11 rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-sm font-semibold text-foreground truncate max-w-full rounded-2xl bg-white/50 backdrop-blur-md px-3 py-1 shadow-[0_0_12px_rgba(0,0,0,0.08)] z-0">{displayName.trim().split(/\s+/)[0] || displayName}</p>
            </>
          )}
        </div>
        <div className={cn("flex items-center gap-1 w-9 shrink-0 justify-end", (embedded || squadChatNoSettings) && !squadChat && "invisible")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors"
                aria-label="Settings"
              >
                <Settings className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border">
              {onMuteToggle && (
                <DropdownMenuItem onClick={onMuteToggle}>
                  {muted ? (
                    <>
                      <Volume2 className="size-4" />
                      Unmute Notifications
                    </>
                  ) : (
                    <>
                      <VolumeX className="size-4" />
                      Mute Notifications
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {isGroup && !squadChat && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRightPanel("members")}>
                    <UsersIcon className="size-4" />
                    View Members
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRightPanel("edit")}>
                    <Edit3 className="size-4" />
                    Edit Group
                  </DropdownMenuItem>
                </>
              )}
              {onDeleteGroup && (
                <>
                  {onMuteToggle && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onDeleteGroup}>
                    <EyeOff className="size-4" />
                    Hide chat
                  </DropdownMenuItem>
                </>
              )}
              {!isGroup && otherUserId && onBlock && (
                <>
                  {(onMuteToggle || onDeleteGroup) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => onBlock(otherUserId)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="size-4" />
                    Block
                  </DropdownMenuItem>
                  {onBlockInfo && (
                    <DropdownMenuItem onSelect={() => onBlockInfo()}>
                      <Info className="size-4" />
                      About blocking
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
          </>
        )}
      </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4"
      >
        <div className={cn("flex flex-col gap-3 w-full pb-20", embedded && !embeddedWithOverlay ? "pt-4" : "pt-16")}>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length > 0 && (
            <>
              <div ref={loadMoreSentinelRef} className="h-px shrink-0" aria-hidden />
              {loadingOlder && (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground">Messages</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {squadChat ? (
                groupSquadMessages(messages).map((group, gi, groups) => (
                  <SquadMessageGroup
                    key={`${group.senderId}-${group.timestamp}`}
                    group={group}
                    isMe={group.senderId === currentUserId}
                    scrollRef={gi === groups.length - 1 ? scrollRef : undefined}
                    uploadProgress={uploadProgress}
                    onNavigateToPost={onNavigateToPost}
                    onGoToSquad={onGoToSquad}
                  />
                ))
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={messageKeyRef.current.get(msg.id) ?? msg.id}
                    msg={msg}
                    isMe={msg.sender_id === currentUserId}
                    otherUserId={otherUserId}
                    otherLastReadAt={otherLastReadAt}
                    scrollRef={messages[messages.length - 1]?.id === msg.id ? scrollRef : undefined}
                    uploadProgress={uploadProgress[msg.id]}
                    onNavigateToPost={onNavigateToPost}
                    onGoToSquad={onGoToSquad}
                  />
                ))
              )}
            </>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hi!</p>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 py-3 gap-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full justify-center">
            {pendingAttachments.map((att, i) => (
              <div
                key={att.id}
                className="relative flex items-center gap-1.5 rounded-xl border border-border bg-background/95 backdrop-blur-sm px-2 py-1.5 text-xs w-fit"
              >
                {att.type === "image" ? (
                  <img src={att.url} alt={att.name} className="size-7 rounded-lg object-cover" />
                ) : att.type === "video" ? (
                  <Video className="size-7 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="size-7 shrink-0 text-muted-foreground" />
                )}
                <span className="text-foreground">{att.name.length > 10 ? `${att.name.slice(0, 10)}...` : att.name}</span>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(i)}
                  className="flex size-8 min-w-[32px] min-h-[32px] shrink-0 items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive touch-manipulation"
                  aria-label="Remove attachment"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 w-full min-h-10">
          <input
            ref={fileInputRef}
            id="attachment-input"
            type="file"
            accept="image/*,video/*,.pdf,application/pdf,*/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
            disabled={sending}
            aria-label="Attach file"
          />
          <label
            htmlFor="attachment-input"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] touch-manipulation cursor-pointer",
              sending && "pointer-events-none opacity-50"
            )}
            aria-label="Attach file"
          >
            <Plus className="size-5" />
          </label>
          <div className="relative flex-1 min-w-0 min-h-10 flex items-end">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              className="w-full min-h-10 resize-none rounded-full bg-white/50 backdrop-blur-md px-4 py-2 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50 leading-relaxed shadow-[0_0_12px_rgba(0,0,0,0.08)]"
              rows={1}
              aria-label="Message"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
          </div>
          {!isMobile && (
            <EmojiPicker
              iconClassName="size-5"
              onSelect={(emoji) => {
                const ta = textareaRef.current
                if (ta) {
                  const start = ta.selectionStart
                  const end = ta.selectionEnd
                  const newMessage = message.slice(0, start) + emoji + message.slice(end)
                  setMessage(newMessage)
                  requestAnimationFrame(() => {
                    ta.focus()
                    const pos = start + emoji.length
                    ta.setSelectionRange(pos, pos)
                  })
                } else {
                  setMessage((prev) => prev + emoji)
                }
              }}
              triggerClassName="shrink-0 flex size-10 items-center justify-center rounded-full bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)]"
            />
          )}
          <button
            disabled={(!message.trim() && pendingAttachments.length === 0) || sending}
            onClick={handleSend}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors shadow-[0_0_12px_rgba(0,0,0,0.08)]",
              (message.trim() || pendingAttachments.length > 0) && !sending
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                : "bg-white/50 backdrop-blur-md text-muted-foreground cursor-not-allowed opacity-50"
            )}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </button>
        </div>
      </div>
      </div>
      {isGroup && !embedded && !squadChatNoSettings && (
        <>
          <GroupMembersPanel
            open={rightPanel === "members"}
            onOpenChange={(v) => !v && setRightPanel(null)}
            conversationId={conversationId}
            currentUserId={currentUserId}
            isMobile={isMobile}
            onMembersChanged={onMarkAsRead}
          />
          <EditGroupPanel
            open={rightPanel === "edit"}
            onOpenChange={(v) => !v && setRightPanel(null)}
            conversationId={conversationId}
            currentName={otherDisplayName}
            currentAvatarUrl={otherAvatarUrl}
            isMobile={isMobile}
            onSaved={() => {
              onMarkAsRead?.()
            }}
          />
        </>
      )}
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center h-full text-center px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary mb-4">
        <Send className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Your Messages</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Select a conversation or start a new message
      </p>
    </div>
  )
}

export function MessagesPage({
  onViewUserProfile,
  onGoToSquad,
  onNavigateToPost,
  onNavigateToExplore,
  conversationIdToOpen,
}: { onViewUserProfile?: (userId: string) => void; onGoToSquad?: (squadId: string) => void; onNavigateToPost?: (postId: string) => void; onNavigateToExplore?: () => void; conversationIdToOpen?: string | null } = {}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<DmConversationRow[]>([])
  const [hiddenConversations, setHiddenConversations] = useState<DmConversationRow[]>([])
  const [loading, setLoading] = useState(!!user)
  const [selectedConv, setSelectedConv] = useState<string | null>(conversationIdToOpen ?? null)
  const [search, setSearch] = useState("")
  const [friendsOnly, setFriendsOnly] = useState(false)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [viewOverride, setViewOverride] = useState<"newMessage" | "newGroup" | null>(null)
  const [newGroupDrawerPhase, setNewGroupDrawerPhase] = useState<"form" | "photo">("form")
  const [newMessageDrawerKey, setNewMessageDrawerKey] = useState(0)
  const [newGroupDrawerKey, setNewGroupDrawerKey] = useState(0)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockInfoOpen, setBlockInfoOpen] = useState(false)
  const [userToBlock, setUserToBlock] = useState<{ id: string; displayName: string } | null>(null)
  const isMobile = useIsMobile()
  const { setIsSubView } = useSubView()

  const loadConversations = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    try {
      const [convs, hidden] = await Promise.all([
        MessagingService.getAllConversations(),
        MessagingService.getHiddenConversations(),
      ])
      setConversations(convs)
      setHiddenConversations(hidden)
    } catch (e) {
      console.error("Failed to load conversations:", e)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!user) return
    FriendsService.getFriendIdsForUser(user.id)
      .then((ids) => setFriendIds(new Set(ids)))
      .catch(() => setFriendIds(new Set()))
  }, [user?.id])

  useEffect(() => {
    if (conversationIdToOpen) setSelectedConv(conversationIdToOpen)
  }, [conversationIdToOpen])

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshSilent = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null
      loadConversations(true)
    }, 150)
  }, [loadConversations])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const channel = MessagingService.subscribeToConversations(user.id, refreshSilent)
    return () => MessagingService.unsubscribeFromConversations(channel)
  }, [user?.id, refreshSilent])

  useEffect(() => {
    if (!user) return
    const { unsubscribe } = MessagingService.subscribeToNewMessagesForListRefresh(refreshSilent)
    return unsubscribe
  }, [user?.id, refreshSilent])

  useEffect(() => {
    if (viewOverride !== "newGroup") setNewGroupDrawerPhase("form")
  }, [viewOverride])

  useEffect(() => {
    if (isMobile) setIsSubView(!!selectedConv)
    else setIsSubView(!!selectedConv || !!viewOverride)
    return () => setIsSubView(false)
  }, [selectedConv, viewOverride, isMobile, setIsSubView])

  const selected = selectedConv ? conversations.find((c) => c.id === selectedConv) : null

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-sm text-muted-foreground">Sign in to view messages</p>
      </div>
    )
  }

  return (
    <>
      <HideConfirmPopup
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        isGroup={selected?.type === "group"}
        isMobile={isMobile}
        onConfirm={async () => {
          if (!selectedConv || !user) return
          try {
            await MessagingService.hideConversation(selectedConv)
            setSelectedConv(null)
            setLeaveDialogOpen(false)
            loadConversations()
            toast.success("Chat hidden")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to hide")
          }
        }}
      />
      <BlockInfoAlertDialog open={blockInfoOpen} onOpenChange={setBlockInfoOpen} />
      <BlockConfirmPopup
        open={blockDialogOpen}
        onClose={() => { setBlockDialogOpen(false); setUserToBlock(null) }}
        displayName={userToBlock?.displayName ?? ""}
        isMobile={isMobile}
        onConfirm={async () => {
          if (!userToBlock || !user) return
          try {
            await BlocksService.blockUser(userToBlock.id)
            setSelectedConv(null)
            setBlockDialogOpen(false)
            setUserToBlock(null)
            loadConversations()
            toast.success("User blocked. You can unblock in Settings.")
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to block")
          }
        }}
      />

      {isMobile && (
        <>
          <MobileBottomDrawer
            open={viewOverride === "newMessage"}
            onOpenChange={(open) => {
              if (!open) setViewOverride(null)
            }}
            title="New message"
            description="Search for someone to message"
            variant="form"
            maxHeightClassName="max-h-[85dvh]"
            scrollBody={false}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6">
              <NewMessageForm
                key={newMessageDrawerKey}
                currentUserId={user.id}
                onBack={() => setViewOverride(null)}
                onSelectConversation={(id) => {
                  setSelectedConv(id)
                  setViewOverride(null)
                  refreshSilent()
                }}
                inModal
              />
            </div>
          </MobileBottomDrawer>
          <MobileBottomDrawer
            open={viewOverride === "newGroup"}
            onOpenChange={(open) => {
              if (!open) setViewOverride(null)
            }}
            title={newGroupDrawerPhase === "photo" ? "Add group photo" : "New group"}
            description={
              newGroupDrawerPhase === "photo"
                ? "Optional: add a photo, then continue or skip"
                : "Name your group and add members"
            }
            variant="form"
            maxHeightClassName="max-h-[85dvh]"
            scrollBody={false}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6">
              <NewGroupForm
                key={newGroupDrawerKey}
                currentUserId={user.id}
                onBack={() => setViewOverride(null)}
                onSelectConversation={(id) => {
                  setSelectedConv(id)
                  setViewOverride(null)
                  refreshSilent()
                }}
                onRefresh={refreshSilent}
                inModal
                onPhaseChange={setNewGroupDrawerPhase}
              />
            </div>
          </MobileBottomDrawer>
        </>
      )}

      {!isMobile && viewOverride === "newMessage" && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">New message</h3>
            <button type="button" onClick={() => setViewOverride(null)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <NewMessageForm
              key={newMessageDrawerKey}
              currentUserId={user.id}
              onBack={() => setViewOverride(null)}
              onSelectConversation={(id) => {
                setSelectedConv(id)
                setViewOverride(null)
                refreshSilent()
              }}
              inModal
            />
          </div>
        </div>
      )}

      {!isMobile && viewOverride === "newGroup" && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {newGroupDrawerPhase === "photo" ? "Add group photo" : "New group"}
              </h3>
              {newGroupDrawerPhase === "photo" && (
                <p className="text-xs text-muted-foreground mt-0.5">Optional: add a photo, then continue or skip</p>
              )}
            </div>
            <button type="button" onClick={() => setViewOverride(null)} className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <NewGroupForm
              key={newGroupDrawerKey}
              currentUserId={user.id}
              onBack={() => setViewOverride(null)}
              onSelectConversation={(id) => {
                setSelectedConv(id)
                setViewOverride(null)
                refreshSilent()
              }}
              onRefresh={refreshSilent}
              inModal
              onPhaseChange={setNewGroupDrawerPhase}
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 overflow-hidden",
          (selectedConv || viewOverride) && isMobile
            ? "h-[calc(100dvh-env(safe-area-inset-top,0px))]"
            : "h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)]"
        )}
      >
        <div
          className={cn(
            "min-h-0 w-full shrink-0 md:w-72 lg:w-80 md:border-r md:border-border",
            selectedConv ? "hidden md:flex md:flex-col" : "flex flex-col"
          )}
        >
          <ConversationList
            conversations={conversations}
            hiddenConversations={hiddenConversations}
            loading={loading}
            selectedId={selectedConv}
            search={search}
            onSearchChange={setSearch}
            onSelect={(id) => {
              setSelectedConv(id)
              setViewOverride(null)
            }}
            onNewMessage={() => {
              setNewMessageDrawerKey((k) => k + 1)
              setViewOverride("newMessage")
              setSelectedConv(null)
            }}
            onNewGroup={() => {
              setNewGroupDrawerKey((k) => k + 1)
              setViewOverride("newGroup")
              setSelectedConv(null)
            }}
            onUnhide={async (id) => {
              try {
                await MessagingService.unhideConversation(id)
                setSelectedConv(id)
                setViewOverride(null)
                loadConversations(true)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to unhide")
              }
            }}
            friendsOnly={friendsOnly}
            friendIds={friendIds}
            onFriendsOnlyChange={setFriendsOnly}
            onNavigateToExplore={onNavigateToExplore}
          />
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 min-w-0 overflow-hidden",
            selectedConv || viewOverride ? "flex flex-col" : "hidden md:flex md:flex-col"
          )}
        >
          {viewOverride === "newMessage" || viewOverride === "newGroup" ? (
            <EmptyChat />
          ) : selectedConv && selected ? (
            <ChatView
              conversationId={selectedConv}
              otherDisplayName={selected.other_display_name}
              otherAvatarUrl={selected.other_avatar_url}
              isGroup={selected.type === "group"}
              otherUserId={selected.type === "dm" ? selected.other_user_id : null}
              currentUserId={user.id}
              onBack={() => setSelectedConv(null)}
              onDeleteGroup={() => setLeaveDialogOpen(true)}
              onMarkAsRead={refreshSilent}
              onViewUserProfile={onViewUserProfile}
              squadChat={!!selected.squad_id}
              squadId={selected.squad_id ?? null}
              onGoToSquad={onGoToSquad}
              onNavigateToPost={onNavigateToPost}
              muted={!!selected.muted_at}
              onMuteToggle={async () => {
                try {
                  const nowMuted = await MessagingService.toggleMuteConversation(selectedConv)
                  loadConversations(true)
                  toast.success(nowMuted ? "Notifications muted" : "Notifications unmuted")
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to toggle mute")
                }
              }}
              onBlock={
                selected?.type === "dm" && selected.other_user_id
                  ? (userId) => {
                      setUserToBlock({ id: userId, displayName: selected.other_display_name?.trim() || "Unknown" })
                      setBlockDialogOpen(true)
                    }
                  : undefined
              }
              onBlockInfo={
                selected?.type === "dm" && selected.other_user_id
                  ? () => setBlockInfoOpen(true)
                  : undefined
              }
            />
          ) : selectedConv ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </>
  )
}
