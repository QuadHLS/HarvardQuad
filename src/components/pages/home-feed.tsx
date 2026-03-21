import React, { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/contexts/ProfileContext"
import {
  FeedService,
  type FeedPostWithAuthor,
  type FeedReplyWithAuthor,
  type ProfileRow,
} from "@/services/feedService"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Heart,
  MessageCircle,
  Forward,
  ImageIcon,
  Link2,
  BarChart3,
  X,
  MoreHorizontal,
  Bookmark,
  TrendingUp,
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  Pencil,
  Trash2,
  Flag,
  Pin,
  ExternalLink,
  Users,
  Settings2,
  Check,
  Loader2,
  UserPlus,
} from "lucide-react"
import { TrendingSquadCard, trendingWindowLabel } from "@/components/trending-squad-card"
import { nearestPointOnRectBoundary, offsetOutsideRect } from "@/lib/quadly-connector-path"
import { SquiggleConnector } from "@/components/ui/squiggle-connector"
import { cn, quadAvatarColor, quadHoverColor } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSubView } from "@/hooks/use-sub-view"
import { toast } from "sonner"
import { SquadsService } from "@/services/squadsService"
import { FriendsService } from "@/services/friendsService"
import { EmojiPicker } from "@/components/emoji-picker"
import { MentionPickerButton } from "@/components/mention-picker-button"
import { RichTextEditor } from "@/components/rich-text-editor"
import { SafeHtml } from "@/components/safe-html"
import { Button } from "@/components/ui/button"
import { getEmbedInfo } from "@/lib/embedUrl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FeedSkeleton } from "@/components/ui/feed-skeletons"
import { SharePostModal } from "@/components/share-post-modal"

// ── Types ──
type SortOption = "newest" | "hearts" | "replies"

const QUADLY_AVATAR_URL = "https://api.dicebear.com/9.x/thumbs/svg?seed=quadly"

function QuadlyMessagePopover({
  variant,
  open,
  onOpenChange,
}: {
  variant: "mobile" | "desktop"
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const avatarAnchorRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDesktopHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current != null) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
  }, [])

  const scheduleDesktopHoverClose = useCallback(() => {
    clearDesktopHoverClose()
    hoverCloseTimerRef.current = setTimeout(() => {
      hoverCloseTimerRef.current = null
      onOpenChange(false)
    }, 200)
  }, [clearDesktopHoverClose, onOpenChange])

  useEffect(() => () => clearDesktopHoverClose(), [clearDesktopHoverClose])
  const avatarClass = variant === "mobile" ? "size-12" : "size-9"
  const ringClass =
    variant === "mobile" ? "ring-[1.5px] ring-background" : "ring-2 ring-card"

  const getSquiggleEndpoints = useCallback(() => {
    const trig = triggerRef.current
    const anchor = avatarAnchorRef.current ?? trig
    const card = cardRef.current
    if (!trig || !card || !anchor) return null
    const ar = anchor.getBoundingClientRect()
    const tr = trig.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    let x0: number
    let y0: number
    let x1: number
    let y1: number
    if (variant === "desktop") {
      const gap = 10
      x0 = ar.left - gap
      y0 = ar.top + ar.height / 2
      const edge = nearestPointOnRectBoundary(x0, y0, cr)
      x1 = edge.x
      y1 = edge.y
      const out = offsetOutsideRect(x1, y1, cr, 12)
      x1 = out.x
      y1 = out.y
    } else {
      const gap = 8
      x0 = tr.right + gap
      y0 = ar.top + ar.height / 2
      const above = 12
      x1 = cr.left + cr.width / 2
      y1 = cr.top - above
    }
    return { x0, y0, x1, y1 }
  }, [variant])

  const desktopHoverTriggerProps =
    variant === "desktop"
      ? {
          onMouseEnter: () => {
            clearDesktopHoverClose()
            onOpenChange(true)
          },
          onMouseLeave: () => scheduleDesktopHoverClose(),
        }
      : undefined

  const desktopHoverContentProps =
    variant === "desktop"
      ? {
          onMouseEnter: () => clearDesktopHoverClose(),
          onMouseLeave: () => scheduleDesktopHoverClose(),
        }
      : undefined

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          {...desktopHoverTriggerProps}
          className={cn(
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            variant === "mobile"
              ? "flex flex-col items-center gap-0.5 shrink-0 rounded-lg"
              : "relative shrink-0 rounded-full"
          )}
          aria-label="Hear from Quadly"
        >
          <div className="relative" ref={avatarAnchorRef}>
            <Avatar className={avatarClass}>
              <AvatarImage src={QUADLY_AVATAR_URL} alt="" />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">Q</AvatarFallback>
            </Avatar>
            <span className={cn("absolute bottom-0 right-0 size-2.5 rounded-full bg-primary", ringClass)} />
          </div>
          {variant === "mobile" && (
            <span className="text-xs text-muted-foreground truncate w-12 text-center">Quadly</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align={variant === "mobile" ? "start" : "end"}
        sideOffset={variant === "mobile" ? 24 : -60}
        /* Desktop: align end + positive alignOffset skids left; lower = more right */
        alignOffset={variant === "mobile" ? 56 : 115}
        collisionPadding={16}
        avoidCollisions={variant === "mobile"}
        className="w-[min(calc(100vw-2rem),19rem)] border-0 bg-transparent p-0 shadow-none"
        {...desktopHoverContentProps}
      >
        <div
          ref={cardRef}
          className={cn(
            "rounded-2xl border border-neutral-200/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800 shadow-sm dark:border-neutral-300/25 dark:shadow-md",
            variant === "mobile" && "translate-x-3",
            variant === "desktop" && "-translate-x-12 -translate-y-3"
          )}
          role="status"
        >
          <p className="font-medium text-neutral-900">Hey, I&apos;m Quadly 👋</p>
          <p className="mt-1.5">
            Add a few friends and your feed, messages, and connections will follow.
          </p>
        </div>
      </PopoverContent>
      <SquiggleConnector open={open} getEndpoints={getSquiggleEndpoints} pathProfile={variant} />
    </Popover>
  )
}

// ── Avatar with image or initials ──
function AuthorAvatar({
  profile,
  color,
  initials,
  sizeClass = "size-10",
  className = "",
  avatarUrl: avatarUrlOverride,
}: {
  profile: ProfileRow | null | undefined
  color: string
  initials: string
  sizeClass?: string
  className?: string
  /** Override avatar image (e.g. Quadly for override_author_name posts) */
  avatarUrl?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const avatarUrl = avatarUrlOverride ?? profile?.avatar_url?.trim()
  const showImg = !!avatarUrl && !imgError

  return (
    <div className={cn("rounded-full flex items-center justify-center shrink-0 overflow-hidden relative", sizeClass, className)}>
      {showImg ? (
        <img
          src={avatarUrl!}
          alt={profile?.full_name || initials || "Author"}
          className="absolute inset-0 w-full h-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : null}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center text-white text-sm font-semibold"
        style={{
          backgroundColor: color,
          display: showImg ? "none" : "flex",
        }}
      >
        {initials}
      </div>
    </div>
  )
}

// ── Sort Filter Row ──
function FeedSortRow({
  sort,
  ascending,
  onSort,
  onToggleOrder,
}: {
  sort: SortOption
  ascending: boolean
  onSort: (s: SortOption) => void
  onToggleOrder: () => void
}) {
  const options: { id: SortOption; label: string; icon: React.ElementType }[] = [
    { id: "newest", label: "Latest", icon: Calendar },
    { id: "hearts", label: "Hearts", icon: Heart },
    { id: "replies", label: "Replies", icon: MessageCircle },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-1">
      <button
        type="button"
        onClick={onToggleOrder}
        className={cn(
          "shrink-0 rounded-md p-1 transition-colors",
          ascending ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-label={ascending ? "Sort ascending (click to reverse)" : "Sort descending (click to reverse)"}
        title={ascending ? "Ascending – click to reverse" : "Descending – click to reverse"}
      >
        <ArrowUpDown className="size-3.5" />
      </button>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSort(opt.id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            sort === opt.id
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <opt.icon className="size-3" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── New Post Form ──
function NewPostForm({
  onClose,
  onSubmit,
  authorId,
  userInitials,
  submitting,
  initialData,
  isEditMode,
}: {
  onClose: () => void
  onSubmit: (title: string, content: string | null, imageFile?: File | null, url?: string | null, pollOptions?: string[]) => Promise<void>
  authorId: string
  userInitials: string
  submitting: boolean
  initialData?: { title?: string; content?: string | null; url?: string | null; image_path?: string | null; image_url?: string | null }
  isEditMode?: boolean
}) {
  const isMobileNewPost = useIsMobile()
  const isEdit = !!initialData || isEditMode
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [content, setContent] = useState(initialData?.content ?? "")
  const [url, setUrl] = useState(initialData?.url ?? "")
  const [isPoll, setIsPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? initialData?.image_path ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<{ insertContent: (content: string) => void; insertMention: (id: string, label: string) => void } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setImageFile(file)
    }
    e.target.value = ""
  }

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !authorId) return
    if (isPoll) {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) {
        toast.error("Add at least 2 poll options.")
        return
      }
    }
    try {
      const opts = isPoll ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined
      await onSubmit(trimmedTitle, content.trim() || null, imageFile, url.trim() || null, opts)
      setTitle("")
      setContent("")
      setUrl("")
      setIsPoll(false)
      setPollOptions(["", ""])
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      onClose()
    } catch {
      toast.error("Failed to post. Please try again.")
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isPoll ? "Ask a question..." : "Title"}
          className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-transparent focus:border-border pb-1 mb-2"
          autoFocus
          aria-label="Post title"
          disabled={submitting}
        />
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Body text (optional). Type @ to mention someone"
          disabled={submitting}
          minHeight="100px"
          editorRef={editorRef}
        />
        {isPoll && (
          <div className="mt-2 space-y-2">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions]
                    next[i] = e.target.value
                    setPollOptions(next)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, j) => j !== i))}
                  disabled={pollOptions.length <= 2}
                  className="shrink-0 size-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                  aria-label="Remove option"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {pollOptions.length < 15 && (
              <button
                type="button"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="text-xs text-primary hover:underline"
              >
                + Add option
              </button>
            )}
          </div>
        )}
        {imagePreview && (
          <div className="mt-2 flex justify-center">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-80 max-w-full rounded-lg object-contain" />
              <button
              type="button"
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="absolute -top-1 -right-1 size-6 rounded-full bg-muted-foreground/80 text-background flex items-center justify-center hover:bg-muted-foreground"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden
        />
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-secondary hover:text-primary"
              aria-label="Add photo"
            >
              <ImageIcon className="size-4" />
            </button>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setIsPoll(!isPoll)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md transition-colors",
                  isPoll ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
                aria-label="Add poll"
                title="Poll"
              >
                <BarChart3 className="size-4" />
              </button>
            )}
            <MentionPickerButton
              onSelect={(id, label) => editorRef.current?.insertMention(id, label)}
              triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            />
            {!isMobileNewPost && (
              <EmojiPicker
                onSelect={(emoji) => editorRef.current?.insertContent(emoji)}
                triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
              />
            )}
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube, TikTok, etc. — pasted link embeds as video"
            className="input-text-xs flex-1 min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Social link"
          />
          <div className="flex items-center gap-2 shrink-0">
            {isEdit && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
                title.trim() && !submitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"
              )}
              disabled={!title.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (isEdit ? "Saving…" : "Posting…") : (isEdit ? "Save" : "Post")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── New Post Modal (also used for Edit, exported for profile page) ──
export function NewPostModal({
  open,
  onClose,
  isMobile,
  onSubmit,
  authorId,
  userInitials,
  submitting,
  editPost,
}: {
  open: boolean
  onClose: () => void
  isMobile: boolean
  onSubmit: (title: string, content: string | null, imageFile?: File | null, url?: string | null, pollOptions?: string[]) => Promise<void>
  authorId: string
  userInitials: string
  submitting: boolean
  editPost?: FeedPostWithAuthor | null
}) {
  const isEdit = !!editPost
  const form = (
    <NewPostForm
      onClose={onClose}
      onSubmit={onSubmit}
      authorId={authorId}
      userInitials={userInitials}
      submitting={submitting}
      initialData={editPost ? { title: editPost.title, content: editPost.content, url: editPost.url, image_path: editPost.image_path, image_url: editPost.image_url } : undefined}
      isEditMode={isEdit}
    />
  )
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Post" : "New Post"}</SheetTitle>
            <SheetDescription>{isEdit ? "Update your post" : "Share something with your campus"}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {form}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Post" : "New Post"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update your post" : "Share something with your campus"}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  )
}

// ── Reply Item (supports nested replies) ──
const MAX_REPLY_DEPTH = 10

function ReplyItem({
  reply,
  depth = 0,
  userId,
  onOpenUserProfile,
  onHeartReply,
  onReply,
  onEditReply,
  onDeleteReply,
  onReportReply,
  deleteReplyToConfirm,
  onConfirmDeleteReply,
  onCancelDeleteReply,
  editReply,
  onSubmitReply,
  onCancelEditReply,
  submitting,
  userInitials,
  isMobile,
  getAvatarColor,
  getInitials,
  getDisplayName,
  getTimeAgo,
}: {
  reply: FeedReplyWithAuthor
  depth?: number
  userId?: string
  onOpenUserProfile?: (authorId: string) => void
  onHeartReply?: (r: FeedReplyWithAuthor) => void
  onReply?: (parentReplyId: string) => void
  onEditReply?: (r: FeedReplyWithAuthor) => void
  onDeleteReply?: (r: FeedReplyWithAuthor) => void
  onReportReply?: (replyId: string) => void
  deleteReplyToConfirm?: FeedReplyWithAuthor | null
  onConfirmDeleteReply?: () => void
  onCancelDeleteReply?: () => void
  editReply?: FeedReplyWithAuthor | null
  onSubmitReply?: (content: string) => Promise<void>
  onCancelEditReply?: () => void
  submitting?: boolean
  userInitials?: string
  isMobile?: boolean
  getAvatarColor: (id: string) => string
  getInitials: (p: ProfileRow | null | undefined) => string
  getDisplayName: (p: ProfileRow | null | undefined) => string
  getTimeAgo: (iso: string) => string
}) {
  const showReplyButton = onReply && depth < MAX_REPLY_DEPTH
  const isAuthor = !!userId && userId === reply.author_id
  const showDeleteConfirm = deleteReplyToConfirm?.id === reply.id
  const showInlineEdit = !isMobile && editReply?.id === reply.id && onSubmitReply && onCancelEditReply

  if (showInlineEdit) {
    return (
      <div className="flex flex-col gap-2 min-w-0 max-w-full">
        <div className="rounded-xl border border-border bg-card p-4 min-w-0 ">
          <ReplyComposer
            key={editReply!.id}
            userInitials={userInitials ?? ""}
            onSubmit={onSubmitReply}
            submitting={!!submitting}
            onCancel={onCancelEditReply}
            forceExpanded
            initialContent={editReply!.content}
            isEditMode
            isMobile={false}
          />
        </div>
      </div>
    )
  }

  const canOpenProfile = !!onOpenUserProfile && !!userId && reply.author_id !== userId

  return (
    <div className="flex flex-col gap-2 min-w-0 max-w-full">
      <div className="flex gap-3 rounded-xl border border-border bg-card p-4 min-w-0">
        <div className="shrink-0">
          {canOpenProfile ? (
            <button
              type="button"
              onClick={() => onOpenUserProfile!(reply.author_id)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
              aria-label={`View ${getDisplayName(reply.author)}'s profile`}
            >
              <AuthorAvatar
                profile={reply.author}
                color={getAvatarColor(reply.author_id)}
                initials={getInitials(reply.author)}
                sizeClass="size-8"
              />
            </button>
          ) : (
            <AuthorAvatar
              profile={reply.author}
              color={getAvatarColor(reply.author_id)}
              initials={getInitials(reply.author)}
              sizeClass="size-8"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            {canOpenProfile ? (
              <button
                type="button"
                onClick={() => onOpenUserProfile!(reply.author_id)}
                className="text-sm font-medium text-foreground truncate hover:underline text-left"
                aria-label={`View ${getDisplayName(reply.author)}'s profile`}
              >
                {getDisplayName(reply.author)}
              </button>
            ) : (
              <span className="text-sm font-medium text-foreground truncate">
                {getDisplayName(reply.author)}
              </span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {getTimeAgo(reply.created_at)}
            </span>
            {(isAuthor && (onEditReply || onDeleteReply)) || (userId && !isAuthor) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary active:bg-secondary/80 transition-colors shrink-0" aria-label="More options">
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border">
                  {showDeleteConfirm ? (
                    <>
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Delete?</div>
                      <DropdownMenuItem onClick={onCancelDeleteReply}>Cancel</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={onConfirmDeleteReply}>Confirm</DropdownMenuItem>
                    </>
                  ) : isAuthor ? (
                    <>
                      {onEditReply && (
                        <DropdownMenuItem onClick={() => onEditReply(reply)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDeleteReply && (
                        <DropdownMenuItem variant="destructive" onSelect={(e) => { e.preventDefault(); onDeleteReply(reply) }}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : null}
                  {!isAuthor && userId && onReportReply && (
                    <DropdownMenuItem onClick={() => onReportReply(reply.id)}>
                      <Flag className="size-4" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {reply.content && (
            <SafeHtml content={reply.content} className="mt-1 text-sm text-foreground/90 leading-relaxed" as="div" />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {onHeartReply ? (
              <button
                type="button"
                onClick={() => onHeartReply(reply)}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  reply.current_user_hearted ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                )}
                aria-label={reply.current_user_hearted ? "Unheart reply" : "Heart reply"}
              >
                <Heart className="size-3" fill={reply.current_user_hearted ? "currentColor" : "none"} />
                {reply.heart_count ?? 0}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="size-3" fill="none" />
                {reply.heart_count ?? 0}
              </span>
            )}
            {showReplyButton && (
              <button
                type="button"
                onClick={() => onReply(reply.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                aria-label="Reply"
              >
                <MessageCircle className="size-3" />
                {reply.replies?.length ? <span className="mr-1">{reply.replies.length}</span> : null}
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
      {reply.replies && reply.replies.length > 0 && (() => {
        const lastChild = reply.replies![reply.replies!.length - 1]
        const lastHasReplies = !!(lastChild.replies && lastChild.replies.length > 0)
        return (
        <div className="relative ml-3 sm:ml-6 pl-3 sm:pl-4">
          {/* Vertical spine - stops at last child's branch when last has no replies */}
          <div
            className={cn("absolute left-0 -top-2 w-px bg-border", lastHasReplies ? "bottom-0" : "bottom-[5rem]")}
            style={{ left: "5px" }}
          />
          <div className="flex flex-col gap-2">
            {reply.replies.map((child) => (
              <div key={child.id} className="relative flex">
                {/* L-shaped branch: extends well past spine to guarantee visible connection. */}
                <div
                  className="absolute top-[1.75rem] -translate-y-1/2 w-[10px] h-4 border-l border-b border-border rounded-bl-sm"
                  style={{ left: "-11px" }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <ReplyItem
                    reply={child}
                    depth={depth + 1}
                    userId={userId}
                    onOpenUserProfile={onOpenUserProfile}
                    deleteReplyToConfirm={deleteReplyToConfirm}
                    onConfirmDeleteReply={onConfirmDeleteReply}
                    onCancelDeleteReply={onCancelDeleteReply}
                    onHeartReply={onHeartReply}
                    onReply={onReply}
                    onEditReply={onEditReply}
                    onDeleteReply={onDeleteReply}
                    onReportReply={onReportReply}
                    editReply={editReply}
                    onSubmitReply={onSubmitReply}
                    onCancelEditReply={onCancelEditReply}
                    submitting={submitting}
                    userInitials={userInitials}
                    isMobile={isMobile}
                    getAvatarColor={getAvatarColor}
                    getInitials={getInitials}
                    getDisplayName={getDisplayName}
                    getTimeAgo={getTimeAgo}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ── Poll Vote Block ──
function PollVoteBlock({
  postId,
  options,
  currentUserVoteOptionId,
  userId,
  onVote,
}: {
  postId: string
  options: { id: string; option_text: string; vote_count: number }[]
  currentUserVoteOptionId: string | null | undefined
  userId: string | undefined
  onVote: (optionId: string, phase: "before" | "after") => void | (() => void)
}) {
  const total = options.reduce((s, o) => s + (o.vote_count ?? 0), 0)

  const handleVote = async (optionId: string) => {
    if (!userId) return
    const revert = onVote(optionId, "before")
    try {
      await FeedService.votePoll(postId, optionId, userId)
      onVote(optionId, "after")
    } catch {
      if (typeof revert === "function") revert()
      toast.error("Failed to vote. Please try again.")
    }
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {options.map((o) => {
        const pct = total > 0 ? ((o.vote_count ?? 0) / total) * 100 : 0
        const voted = o.id === currentUserVoteOptionId
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => handleVote(o.id)}
            className={cn(
              "w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors",
              voted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{o.option_text}</span>
              <span className="text-muted-foreground shrink-0">
                {o.vote_count ?? 0} {currentUserVoteOptionId ? `(${pct.toFixed(0)}%)` : ""}
              </span>
            </div>
            {currentUserVoteOptionId && (
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Post Detail View ──
export type SquadReadOnlyBanner = { squadName: string; squadType: string }

export function PostDetailView({
  post,
  userId,
  currentUserInitials,
  isMobile,
  onBack,
  onEditPost,
  onDeletePost,
  onReportPost,
  onSharePost,
  onReportReply,
  onOpenUserProfile,
  backLabel = "Back to feed",
  editPost,
  deletePostToConfirm,
  onConfirmDeletePost,
  onCancelDeletePost,
  onCancelEditPost,
  onSubmitPost,
  submittingPost,
  squadReadOnly,
  squadBanner,
  onGoToSquad,
}: {
  post: FeedPostWithAuthor
  userId: string | undefined
  currentUserInitials: string
  isMobile: boolean
  onBack: () => void
  backLabel?: string
  onEditPost?: (post: FeedPostWithAuthor) => void
  onDeletePost?: (post: FeedPostWithAuthor) => void
  onReportPost?: (postId: string) => void
  onSharePost?: (post: FeedPostWithAuthor) => void
  onReportReply?: (replyId: string) => void
  onOpenUserProfile?: (authorId: string) => void
  editPost?: FeedPostWithAuthor | null
  deletePostToConfirm?: FeedPostWithAuthor | null
  onConfirmDeletePost?: () => void
  onCancelDeletePost?: () => void
  onCancelEditPost?: () => void
  onSubmitPost?: (title: string, content: string | null, imageFile?: File | null, url?: string | null, pollOptions?: string[]) => Promise<void>
  submittingPost?: boolean
  squadReadOnly?: boolean
  squadBanner?: SquadReadOnlyBanner
  onGoToSquad?: (squadId: string) => void
}) {
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(post)
  const [replies, setReplies] = useState<FeedReplyWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replySheetOpen, setReplySheetOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editReply, setEditReply] = useState<FeedReplyWithAuthor | null>(null)
  const [deleteReplyToConfirm, setDeleteReplyToConfirm] = useState<FeedReplyWithAuthor | null>(null)
  const replyComposerRef = useRef<HTMLDivElement>(null)

  const findReplyById = useCallback((list: FeedReplyWithAuthor[], id: string): FeedReplyWithAuthor | null => {
    for (const r of list) {
      if (r.id === id) return r
      if (r.replies?.length) {
        const found = findReplyById(r.replies, id)
        if (found) return found
      }
    }
    return null
  }, [])

  const loadDetail = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        FeedService.getPost(post.id, userId),
        FeedService.listReplies(post.id, userId),
      ])
      if (p) setDetailPost(p)
      setReplies(r || [])
    } catch {
      setDetailPost(null)
      setReplies([])
    } finally {
      setLoading(false)
    }
  }, [post.id, userId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    const chReplies = FeedService.subscribeToFeedReplies(post.id, loadDetail)
    let chPollOpts: ReturnType<typeof FeedService.subscribeToFeedPollOptions> | null = null
    let pollVotesSub: { unsubscribe: () => void } | null = null
    if (post.post_type === "poll" || post.post_type === "post") {
      chPollOpts = FeedService.subscribeToFeedPollOptions(post.id, loadDetail)
      pollVotesSub = FeedService.subscribeToFeedPollVotes(post.id, loadDetail)
    }
    return () => {
      FeedService.unsubscribeFromFeedReplies(chReplies)
      if (chPollOpts) FeedService.unsubscribeFromFeedPollOptions(chPollOpts)
      if (pollVotesSub) pollVotesSub.unsubscribe()
    }
  }, [post.id, post.post_type, loadDetail])

  const handleBookmarkPost = async () => {
    if (!userId || !detailPost || readOnly) return
    const nextPinned = !detailPost.current_user_pinned
    setDetailPost((p) => (p ? { ...p, current_user_pinned: nextPinned } : null))
    try {
      await FeedService.togglePinPost(post.id, userId)
    } catch {
      setDetailPost((p) => (p ? { ...p, current_user_pinned: detailPost.current_user_pinned } : null))
    }
  }

  const handleHeartPost = async () => {
    if (!userId || !detailPost || readOnly) return
    const next = !detailPost.current_user_hearted
    setDetailPost((p) => (p ? { ...p, current_user_hearted: next, heart_count: (p.heart_count ?? 0) + (next ? 1 : -1) } : null))
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId)
      setDetailPost((p) => (p ? { ...p, current_user_hearted: hearted } : null))
      loadDetail()
    } catch {
      setDetailPost((p) => (p ? { ...p, current_user_hearted: detailPost.current_user_hearted, heart_count: detailPost.heart_count } : null))
    }
  }

  const handleSubmitReply = async (content: string) => {
    if (!userId || !content.trim() || readOnly) return
    setSubmitting(true)
    try {
      await FeedService.createReply(post.id, userId, content.trim(), replyingTo)
      await loadDetail()
      setReplySheetOpen(false)
      setReplyingTo(null)
    } catch {
      toast.error("Failed to post reply. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const openReplyTo = useCallback((parentReplyId: string) => {
    setReplyingTo(parentReplyId)
    if (isMobile) {
      setReplySheetOpen(true)
    } else {
      replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [isMobile])

  const updateReplyInTree = useCallback(
    (replies: FeedReplyWithAuthor[], replyId: string, updater: (r: FeedReplyWithAuthor) => FeedReplyWithAuthor): FeedReplyWithAuthor[] => {
      return replies.map((r) => {
        if (r.id === replyId) return updater(r)
        if (r.replies?.length) {
          return { ...r, replies: updateReplyInTree(r.replies, replyId, updater) }
        }
        return r
      })
    },
    []
  )

  const handleUpdateReply = async (content: string) => {
    if (!userId || !editReply) return
    setSubmitting(true)
    try {
      await FeedService.updateReply(editReply.id, userId, content.trim())
      await loadDetail()
      setEditReply(null)
      toast.success("Reply updated")
    } catch {
      toast.error("Failed to update reply")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReply = (reply: FeedReplyWithAuthor) => {
    if (!userId || userId !== reply.author_id) return
    setDeleteReplyToConfirm(reply)
  }

  const confirmDeleteReply = async () => {
    if (!userId || !deleteReplyToConfirm) return
    try {
      await FeedService.deleteReply(deleteReplyToConfirm.id, userId)
      await loadDetail()
      setDeleteReplyToConfirm(null)
      toast.success("Reply deleted")
    } catch {
      toast.error("Failed to delete reply")
    }
  }

  const handleHeartReply = async (reply: FeedReplyWithAuthor) => {
    if (!userId) return
    const next = !reply.current_user_hearted
    setReplies((prev) =>
      updateReplyInTree(prev, reply.id, (r) => ({
        ...r,
        current_user_hearted: next,
        heart_count: (r.heart_count ?? 0) + (next ? 1 : -1),
      }))
    )
    try {
      const { hearted } = await FeedService.toggleHeartReply(reply.id, userId)
      setReplies((prev) =>
        updateReplyInTree(prev, reply.id, (r) => ({ ...r, current_user_hearted: hearted }))
      )
      loadDetail()
    } catch {
      loadDetail()
    }
  }

  if (loading || !detailPost) {
    return (
      <div className="mx-auto w-full max-w-2xl py-4 md:py-6 pb-nav-safe md:pb-6">
        <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 mb-4" aria-label={backLabel}>
          <ArrowLeft className="size-5" />
        </button>
        <FeedSkeleton count={1} />
      </div>
    )
  }

  const showInlineEdit = !isMobile && editPost && editPost.id === detailPost.id && onSubmitPost && onCancelEditPost

  const readOnly = !!squadReadOnly && !!squadBanner

  const content = (
    <>
      <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary/90 transition-colors mb-4" aria-label={backLabel}>
        <ArrowLeft className="size-5" />
      </button>

      {readOnly && squadBanner && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-foreground">
            {squadBanner.squadType === "open"
              ? `Join ${squadBanner.squadName} to like and reply`
              : `Request to join ${squadBanner.squadName} to participate`}
          </p>
          {onGoToSquad && detailPost?.source_type === "squad" && detailPost?.source_id && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => onGoToSquad(detailPost.source_id!)}
            >
              View squad
            </Button>
          )}
        </div>
      )}

      {showInlineEdit && (
        <div className="mb-4">
          <div className="rounded-xl border border-border bg-card p-4 transition-colors">
            <NewPostForm
              onClose={onCancelEditPost}
              onSubmit={onSubmitPost}
              authorId={userId ?? ""}
              userInitials={currentUserInitials}
              submitting={!!submittingPost}
              initialData={{ title: editPost!.title, content: editPost!.content, url: editPost!.url, image_path: editPost!.image_path, image_url: editPost!.image_url }}
              isEditMode
            />
          </div>
        </div>
      )}

      <article className="rounded-xl border border-border bg-card p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            {onOpenUserProfile && userId !== detailPost.author_id ? (
              <button
                type="button"
                onClick={() => onOpenUserProfile(detailPost.author_id)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                aria-label={`View ${FeedService.postAuthorName(detailPost)}'s profile`}
              >
                <AuthorAvatar
                  profile={detailPost.author}
                  color={FeedService.avatarColor(detailPost.author_id)}
                  initials={FeedService.postInitials(detailPost)}
                  sizeClass="size-9"
                  avatarUrl={detailPost.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
                />
              </button>
            ) : (
              <AuthorAvatar
                profile={detailPost.author}
                color={FeedService.avatarColor(detailPost.author_id)}
                initials={FeedService.postInitials(detailPost)}
                sizeClass="size-9"
                avatarUrl={detailPost.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {onOpenUserProfile && userId !== detailPost.author_id ? (
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(detailPost.author_id)}
                  className="text-sm font-semibold text-foreground truncate hover:underline text-left"
                  aria-label={`View ${FeedService.postAuthorName(detailPost)}'s profile`}
                >
                  {FeedService.postAuthorName(detailPost)}
                </button>
              ) : (
                <span className="text-sm font-semibold text-foreground truncate">
                  {FeedService.postAuthorName(detailPost)}
                </span>
              )}
              <span className="text-xs text-muted-foreground shrink-0">
                {FeedService.timeAgo(detailPost.created_at)}
              </span>
              {(userId === detailPost.author_id && (onEditPost || onDeletePost)) || (userId && userId !== detailPost.author_id) || onSharePost ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary active:bg-secondary/80 transition-colors" aria-label="More options">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-border">
                    {deletePostToConfirm?.id === detailPost.id ? (
                      <>
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Delete?</div>
                        <DropdownMenuItem onClick={onCancelDeletePost}>Cancel</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={onConfirmDeletePost}>Confirm</DropdownMenuItem>
                      </>
                    ) : userId === detailPost.author_id ? (
                      <>
                        {onEditPost && (
                          <DropdownMenuItem onClick={() => onEditPost(detailPost)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onSharePost && (
                          <DropdownMenuItem onClick={() => onSharePost(detailPost)}>
                            <Forward className="size-4" />
                            Share
                          </DropdownMenuItem>
                        )}
                        {onDeletePost && (
                          <DropdownMenuItem variant="destructive" onSelect={(e) => { e.preventDefault(); onDeletePost(detailPost) }}>
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </>
                    ) : null}
                    {deletePostToConfirm?.id !== detailPost.id && onSharePost && userId !== detailPost.author_id && (
                      <DropdownMenuItem onClick={() => onSharePost(detailPost)}>
                        <Forward className="size-4" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {userId && userId !== detailPost.author_id && onReportPost && (
                      <DropdownMenuItem onClick={() => onReportPost(detailPost.id)}>
                        <Flag className="size-4" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="ml-auto size-8" />
              )}
            </div>
            {detailPost.title && (
              <h2 className="mt-2 text-xl font-semibold text-foreground leading-tight tracking-tight">{detailPost.title}</h2>
            )}
            {detailPost.content && (
              <SafeHtml
                content={detailPost.content}
                className="mt-2 text-sm text-muted-foreground leading-relaxed"
                as="div"
              />
            )}
            {(() => {
              const embed = getEmbedInfo(detailPost.url)
              return embed ? (
                <div className="mt-3 w-full overflow-hidden rounded-lg" style={{ aspectRatio: embed.aspectRatio }}>
                  <iframe
                    src={embed.embedUrl}
                    title="Embedded video"
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : detailPost.url ? (
                <a
                  href={detailPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline break-all"
                >
                  <Link2 className="size-4 shrink-0" />
                  {detailPost.url}
                </a>
              ) : null
            })()}
            {(detailPost.image_url ?? detailPost.image_path) && (
              <img src={detailPost.image_url ?? detailPost.image_path ?? ''} alt="" className="mt-3 block mx-auto max-w-full max-h-[28rem] rounded-lg object-contain" />
            )}
            {(detailPost.post_type === "poll" || detailPost.post_type === "post") && detailPost.poll_options && detailPost.poll_options.length > 0 && (
              <PollVoteBlock
                postId={detailPost.id}
                options={detailPost.poll_options}
                currentUserVoteOptionId={detailPost.current_user_vote_option_id}
                userId={userId}
                onVote={(_, phase) => {
                  if (phase === "after") void loadDetail()
                }}
              />
            )}
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
              {readOnly ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Heart className="size-4" fill="none" />
                  {detailPost.heart_count ?? 0} {(detailPost.heart_count ?? 0) === 1 ? "heart" : "hearts"}
                </span>
              ) : (
                <button
                  onClick={handleHeartPost}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    detailPost.current_user_hearted ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                  )}
                >
                  <Heart className="size-4" fill={detailPost.current_user_hearted ? "currentColor" : "none"} />
                  {detailPost.heart_count ?? 0} {(detailPost.heart_count ?? 0) === 1 ? "heart" : "hearts"}
                </button>
              )}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="size-4" /> {detailPost.reply_count ?? 0} {(detailPost.reply_count ?? 0) === 1 ? "reply" : "replies"}
              </span>
              {onSharePost && (
                <button
                  type="button"
                  onClick={() => onSharePost(detailPost)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  aria-label="Share"
                >
                  <Forward className="size-4" />
                  {detailPost.share_count ?? 0} {(detailPost.share_count ?? 0) === 1 ? "share" : "shares"}
                </button>
              )}
              {userId && !readOnly && (
                <button
                  onClick={handleBookmarkPost}
                  className={cn(
                    "ml-auto flex items-center gap-1.5 text-xs transition-colors",
                    detailPost.current_user_pinned ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                  aria-label={detailPost.current_user_pinned ? "Unpin" : "Bookmark"}
                >
                  <Bookmark className={cn("size-4", detailPost.current_user_pinned && "fill-current")} />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

          {!isMobile && !readOnly && (
            <div ref={replyComposerRef} className="mt-4 scroll-mt-4">
              <ReplyComposer
                userInitials={currentUserInitials}
                onSubmit={handleSubmitReply}
                submitting={submitting}
                isMobile={false}
                forceExpanded={!!replyingTo}
                replyingToName={replyingTo ? (() => {
                  const r = findReplyById(replies, replyingTo)
                  return r ? FeedService.displayName(r.author) : null
                })() : null}
                onClearReplyingTo={() => setReplyingTo(null)}
              />
            </div>
          )}

      <div className="mt-4 flex flex-col gap-3">
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No replies yet</p>
        ) : (
          replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              userId={userId}
              onOpenUserProfile={onOpenUserProfile}
              deleteReplyToConfirm={deleteReplyToConfirm}
              onConfirmDeleteReply={confirmDeleteReply}
              onCancelDeleteReply={() => setDeleteReplyToConfirm(null)}
              onHeartReply={readOnly ? undefined : (r) => void handleHeartReply(r)}
              onReply={readOnly ? undefined : (userId ? openReplyTo : undefined)}
              onEditReply={userId ? (r) => setEditReply(r) : undefined}
              onDeleteReply={userId ? handleDeleteReply : undefined}
              onReportReply={onReportReply}
              editReply={editReply}
              onSubmitReply={handleUpdateReply}
              onCancelEditReply={() => setEditReply(null)}
              submitting={submitting}
              userInitials={currentUserInitials}
              isMobile={isMobile}
              getAvatarColor={FeedService.avatarColor}
              getInitials={FeedService.initials}
              getDisplayName={FeedService.displayName}
              getTimeAgo={FeedService.timeAgo}
            />
          ))
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <div className="flex flex-col h-full min-h-0 mx-auto w-full max-w-2xl min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {content}
        </div>
        {!readOnly && (
        <div className="shrink-0 border-t border-border bg-background px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="mx-auto w-full max-w-2xl">
            <ReplyComposer
              userInitials={currentUserInitials}
              onSubmit={handleSubmitReply}
              submitting={submitting}
              isMobile
              onOpenDrawer={() => setReplySheetOpen(true)}
              forceExpanded={false}
            />
          </div>
        </div>
        )}
        <Sheet open={replySheetOpen} onOpenChange={(v) => { if (!v) { setReplySheetOpen(false); setReplyingTo(null) } }}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
            <SheetHeader>
              <SheetTitle>Write a reply</SheetTitle>
              <SheetDescription>Share your thoughts on this post</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6 overflow-y-auto">
              <ReplyComposer
                userInitials={currentUserInitials}
                onSubmit={handleSubmitReply}
                submitting={submitting}
                onCancel={() => { setReplySheetOpen(false); setReplyingTo(null) }}
                forceExpanded
                replyingToName={replyingTo ? (() => {
                  const r = findReplyById(replies, replyingTo)
                  return r ? FeedService.displayName(r.author) : null
                })() : null}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={!!editReply} onOpenChange={(v) => { if (!v) setEditReply(null) }}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
            <SheetHeader>
              <SheetTitle>Edit reply</SheetTitle>
              <SheetDescription>Update your reply</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6 overflow-y-auto">
              <ReplyComposer
                key={editReply?.id}
                userInitials={currentUserInitials}
                onSubmit={handleUpdateReply}
                submitting={submitting}
                onCancel={() => setEditReply(null)}
                forceExpanded
                initialContent={editReply?.content}
                isEditMode
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 py-4 md:py-6 pb-nav-safe md:pb-6 overflow-x-hidden">
      {content}
    </div>
  )
}

// ── Post Composer (exported for squad page) ──
export function PostComposer({
  onOpenDrawer,
  isMobile,
  userInitials,
  userFirstName,
  postingInitials,
  postingDisplayName,
  onSubmit,
  submitting,
  initialData,
  isEditMode,
  onCancelEdit,
  placeholderText,
}: {
  onOpenDrawer: () => void
  isMobile: boolean
  userInitials: string
  userFirstName?: string | null
  postingInitials?: string
  postingDisplayName?: string | null
  onSubmit: (title: string, content: string | null, imageFile?: File | null, url?: string | null, pollOptions?: string[]) => Promise<void>
  submitting: boolean
  initialData?: { title?: string; content?: string | null; url?: string | null; image_path?: string | null; image_url?: string | null }
  isEditMode?: boolean
  onCancelEdit?: () => void
  /** Override typing placeholder (e.g. "Share something with Design Squad...") */
  placeholderText?: string
}) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [content, setContent] = useState(initialData?.content ?? "")
  const [url, setUrl] = useState(initialData?.url ?? "")
  const [isPoll, setIsPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [expanded, setExpanded] = useState(!!isEditMode)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? initialData?.image_path ?? null)
  const [typingText, setTypingText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<{ insertContent: (content: string) => void; insertMention: (id: string, label: string) => void } | null>(null)

  const typingSentences = React.useMemo(
    () => {
      if (placeholderText) return [placeholderText]
      const welcome = userFirstName ? `Welcome back ${userFirstName}` : "Welcome back"
      return [
        welcome,
        "What's happening on campus?",
        "Share an update...",
        "Ask a question...",
        "Post a link or photo...",
      ]
    },
    [userFirstName, placeholderText]
  )

  useEffect(() => {
    if (expanded) return
    let sentenceIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeout: ReturnType<typeof setTimeout>
    const stopAfterTyping = !!placeholderText

    const tick = () => {
      const sentence = typingSentences[sentenceIndex]
      if (isDeleting) {
        setTypingText(sentence.slice(0, charIndex - 1))
        charIndex--
        if (charIndex === 0) {
          isDeleting = false
          sentenceIndex = (sentenceIndex + 1) % typingSentences.length
          timeout = setTimeout(tick, 1200)
        } else {
          timeout = setTimeout(tick, 80)
        }
      } else {
        setTypingText(sentence.slice(0, charIndex + 1))
        charIndex++
        if (charIndex === sentence.length) {
          if (stopAfterTyping) return
          isDeleting = true
          timeout = setTimeout(tick, 3000)
        } else {
          timeout = setTimeout(tick, 120)
        }
      }
    }
    timeout = setTimeout(tick, 800)
    return () => clearTimeout(timeout)
  }, [expanded, typingSentences, placeholderText])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setImageFile(file)
    }
    e.target.value = ""
  }

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || submitting) return
    if (isPoll) {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) {
        toast.error("Add at least 2 poll options.")
        return
      }
    }
    try {
      const opts = isPoll ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined
      await onSubmit(trimmedTitle, content.trim() || null, imageFile, url.trim() || null, opts)
      setTitle("")
      setContent("")
      setUrl("")
      setIsPoll(false)
      setPollOptions(["", ""])
      setImageFile(null)
      setImagePreview(null)
      fileInputRef.current && (fileInputRef.current.value = "")
      setExpanded(false)
      onCancelEdit?.()
    } catch {
      // toast handled in parent
    }
  }

  const avatarInitials = postingInitials ?? userInitials
  const avatarEl = (
    <span className="inline-flex shrink-0">
      <Avatar className="size-10">
        <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
          {avatarInitials}
        </AvatarFallback>
      </Avatar>
    </span>
  )

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/20"
      >
        <Tooltip>
          <TooltipTrigger asChild>{avatarEl}</TooltipTrigger>
          <TooltipContent>{postingDisplayName ? `Posting as ${postingDisplayName}` : "Posting as you"}</TooltipContent>
        </Tooltip>
        <span className="text-sm text-muted-foreground min-w-0 flex-1 truncate border-b border-border pb-2">
          {typingText}
          <span className="animate-pulse">|</span>
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors">
      <div className="flex gap-3">
        <Tooltip>
          <TooltipTrigger asChild>{avatarEl}</TooltipTrigger>
          <TooltipContent>{postingDisplayName ? `Posting as ${postingDisplayName}` : "Posting as you"}</TooltipContent>
        </Tooltip>
        <div className="flex-1 min-w-0">
          {expanded ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isPoll ? "Ask a question..." : "Title"}
                className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-transparent focus:border-border pb-1 mb-2"
                aria-label="Post title"
                autoFocus
              />
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Body text (optional). Type @ to mention someone"
                minHeight="80px"
                editorRef={editorRef}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full text-left text-sm text-muted-foreground py-1 pb-2 border-b border-border focus:outline-none"
            >
              <span>{typingText}</span>
              <span className="animate-pulse">|</span>
            </button>
          )}
          {isPoll && expanded && (
            <div className="mt-2 space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions]
                      next[i] = e.target.value
                      setPollOptions(next)
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    disabled={pollOptions.length <= 2}
                    className="shrink-0 size-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                    aria-label="Remove option"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {pollOptions.length < 15 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-xs text-primary hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
          )}
          {imagePreview && (
            <div className="mt-2 flex justify-center">
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-72 max-w-full rounded-lg object-contain" />
                <button
                type="button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                  fileInputRef.current && (fileInputRef.current.value = "")
                }}
                className="absolute -top-1 -right-1 size-6 rounded-full bg-muted-foreground/80 text-background flex items-center justify-center hover:bg-muted-foreground"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden
          />
          {expanded && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-9 items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-secondary hover:text-primary"
                  aria-label="Add photo"
                >
                  <ImageIcon className="size-4" />
                </button>
                {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsPoll(!isPoll)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors",
                    isPoll ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"
                  )}
                  aria-label="Add poll"
                  title="Poll"
                >
                  <BarChart3 className="size-4" />
                </button>
                )}
                <MentionPickerButton
                  onSelect={(id, label) => editorRef.current?.insertMention(id, label)}
                  triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                />
                {!isMobile && (
                <EmojiPicker
                  onSelect={(emoji) => editorRef.current?.insertContent(emoji)}
                  triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                />
                )}
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube, TikTok, etc. — pasted link embeds as video"
                className="input-text-xs flex-1 min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Social link"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditMode) {
                      onCancelEdit?.()
                    }
                    setExpanded(false)
                    setTitle("")
                    setContent("")
                    setUrl("")
                    setIsPoll(false)
                    setPollOptions(["", ""])
                    setImageFile(null)
                    setImagePreview(null)
                    fileInputRef.current && (fileInputRef.current.value = "")
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg px-5 py-1.5 text-sm font-medium transition-colors",
                    title.trim() && !submitting ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"
                  )}
                  disabled={!title.trim() || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (isEditMode ? "Saving…" : "Posting…") : (isEditMode ? "Save" : "Post")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Reply Composer (same as PostComposer but no title) ──
function ReplyComposer({
  userInitials,
  onSubmit,
  submitting,
  isMobile,
  onOpenDrawer,
  onCancel,
  forceExpanded,
  replyingToName,
  onClearReplyingTo,
  initialContent,
  isEditMode,
}: {
  userInitials: string
  onSubmit: (content: string) => Promise<void>
  submitting: boolean
  isMobile?: boolean
  onOpenDrawer?: () => void
  onCancel?: () => void
  forceExpanded?: boolean
  replyingToName?: string | null
  onClearReplyingTo?: () => void
  initialContent?: string
  isEditMode?: boolean
}) {
  const [content, setContent] = useState(initialContent ?? "")
  const [typingText, setTypingText] = useState("")
  const editorRef = useRef<{ insertContent: (content: string) => void; insertMention: (id: string, label: string) => void } | null>(null)

  const showCollapsed = !isEditMode && isMobile && onOpenDrawer && !forceExpanded

  useEffect(() => {
    if (initialContent !== undefined) setContent(initialContent)
  }, [initialContent])

  useEffect(() => {
    if (!showCollapsed) return
    const typingSentences = ["Write a reply...", "Type @ to mention someone...", "Share your thoughts..."]
    let sentenceIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      const sentence = typingSentences[sentenceIndex]
      if (isDeleting) {
        setTypingText(sentence.slice(0, charIndex - 1))
        charIndex--
        if (charIndex === 0) {
          isDeleting = false
          sentenceIndex = (sentenceIndex + 1) % typingSentences.length
          timeout = setTimeout(tick, 1200)
        } else {
          timeout = setTimeout(tick, 80)
        }
      } else {
        setTypingText(sentence.slice(0, charIndex + 1))
        charIndex++
        if (charIndex === sentence.length) {
          isDeleting = true
          timeout = setTimeout(tick, 3000)
        } else {
          timeout = setTimeout(tick, 120)
        }
      }
    }
    timeout = setTimeout(tick, 800)
    return () => clearTimeout(timeout)
  }, [showCollapsed])

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || submitting) return
    try {
      await onSubmit(trimmed)
      setContent("")
    } catch {
      // toast handled in parent
    }
  }

  const handleCancel = () => {
    setContent("")
    onCancel?.()
  }

  const hasContent = content.trim().length > 0

  if (showCollapsed) {
    return (
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex w-full items-center gap-2.5 rounded-full border border-border bg-card py-2 px-3 text-left transition-colors hover:border-primary/20"
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground min-w-0 flex-1 truncate">
          {typingText}
          <span className="animate-pulse">|</span>
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors">
      {replyingToName && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Replying to {replyingToName}</span>
          {onClearReplyingTo && (
            <button type="button" onClick={onClearReplyingTo} className="text-primary hover:underline">Cancel</button>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write a reply... Type @ to mention someone"
            disabled={submitting}
            minHeight="80px"
            editorRef={editorRef}
          />
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <MentionPickerButton
              onSelect={(id, label) => editorRef.current?.insertMention(id, label)}
              triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            />
            {!isMobile && (
            <EmojiPicker
              onSelect={(emoji) => editorRef.current?.insertContent(emoji)}
              triggerClassName="shrink-0 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-5 py-1.5 text-sm font-medium transition-colors",
                  hasContent && !submitting ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"
                )}
                disabled={!hasContent || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (isEditMode ? "Saving…" : "Posting…") : (isEditMode ? "Save" : "Reply")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Post Card (exported for profile page) ──
export function PostCard({
  post,
  userId,
  onLike,
  onBookmark,
  onOpenDetail,
  onVote,
  onEditPost,
  onDeletePost,
  onReportPost,
  onSharePost,
  onOpenUserProfile,
  onPinToSquad,
  isPinnedToSquad,
  deletePostToConfirm,
  onConfirmDeletePost,
  onCancelDeletePost,
  editPost,
  onSubmitPost,
  onCancelEditPost,
  submittingPost,
  userInitials,
  isMobile,
  sourceTag,
  onGoToSquad,
  sourceSquadId,
  trendingRank,
  likeDisabled,
}: {
  post: FeedPostWithAuthor
  userId: string | undefined
  onLike: () => void
  onBookmark: () => void
  onOpenDetail: () => void
  onVote: (optionId: string, phase: "before" | "after") => void | (() => void)
  onEditPost?: (post: FeedPostWithAuthor) => void
  onDeletePost?: (post: FeedPostWithAuthor) => void
  onReportPost?: (postId: string) => void
  onSharePost?: (post: FeedPostWithAuthor) => void
  onOpenUserProfile?: (authorId: string) => void
  /** Squad admin pin/unpin. When provided, shown in dropdown. */
  onPinToSquad?: (post: FeedPostWithAuthor) => void
  isPinnedToSquad?: boolean
  deletePostToConfirm?: FeedPostWithAuthor | null
  onConfirmDeletePost?: () => void
  onCancelDeletePost?: () => void
  editPost?: FeedPostWithAuthor | null
  onSubmitPost?: (title: string, content: string | null, imageFile?: File | null, url?: string | null, pollOptions?: string[]) => Promise<void>
  onCancelEditPost?: () => void
  submittingPost?: boolean
  userInitials?: string
  isMobile?: boolean
  /** Source tag for saved list: "Campus" or squad name. Shown top-right, left of menu. */
  sourceTag?: string | null
  /** When provided with sourceSquadId, shows "Go to squad" button for squad posts. */
  onGoToSquad?: (squadId: string) => void
  sourceSquadId?: string | null
  /** Trending rank (1-based). Shown top-right of card. */
  trendingRank?: number
  /** When true, like button is disabled (e.g. squad posts in trending). */
  likeDisabled?: boolean
}) {
  const isAuthor = !!userId && userId === post.author_id
  const showDeleteConfirm = deletePostToConfirm?.id === post.id
  const showInlineEdit = !isMobile && editPost?.id === post.id && onSubmitPost && onCancelEditPost

  if (showInlineEdit) {
    return (
      <article className="rounded-xl border border-border bg-card p-4 transition-colors">
        <NewPostForm
            onClose={onCancelEditPost!}
            onSubmit={onSubmitPost}
            authorId={userId ?? ""}
            userInitials={userInitials ?? ""}
            submitting={!!submittingPost}
            initialData={{ title: editPost!.title, content: editPost!.content, url: editPost!.url, image_path: editPost!.image_path, image_url: editPost!.image_url }}
            isEditMode
          />
      </article>
    )
  }

  const hoverColor = quadHoverColor(post.id)
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail() } }}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all hover:shadow-lg cursor-pointer",
        trendingRank != null && "relative",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
    >
      {trendingRank != null && (
        <div className="absolute right-4 top-4 z-10 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
          {trendingRank}
        </div>
      )}
      <div className="flex gap-3">
        <div className="shrink-0">
          {onOpenUserProfile ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenUserProfile(post.author_id)
              }}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
              aria-label={`View ${FeedService.postAuthorName(post)}'s profile`}
            >
              <AuthorAvatar
                profile={post.author}
                color={FeedService.avatarColor(post.author_id)}
                initials={FeedService.postInitials(post)}
                sizeClass="size-8"
                avatarUrl={post.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
              />
            </button>
          ) : (
            <AuthorAvatar
              profile={post.author}
              color={FeedService.avatarColor(post.author_id)}
              initials={FeedService.postInitials(post)}
              sizeClass="size-8"
              avatarUrl={post.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {onOpenUserProfile ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenUserProfile(post.author_id)
                }}
                className="text-sm font-semibold text-foreground hover:underline text-left"
                aria-label={`View ${FeedService.postAuthorName(post)}'s profile`}
              >
                {FeedService.postAuthorName(post)}
              </button>
            ) : (
              <span className="text-sm font-semibold text-foreground">
                {FeedService.postAuthorName(post)}
              </span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {FeedService.timeAgo(post.created_at)}
            </span>
            {sourceTag && (
              <span className="flex shrink-0 items-center gap-1">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium",
                    sourceTag === "Campus"
                      ? "bg-primary/12 text-primary"
                      : "bg-quad-blue/12 text-quad-blue"
                  )}
                >
                  {sourceTag}
                </span>
                {onGoToSquad && sourceSquadId && sourceTag !== "Campus" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onGoToSquad(sourceSquadId)
                    }}
                    className="flex items-center justify-center rounded-md p-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    aria-label="Go to squad"
                    title="Go to squad"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </span>
            )}
            {(isAuthor && (onEditPost || onDeletePost)) || (userId && !isAuthor) || onSharePost ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary active:bg-secondary/80 transition-colors" aria-label="More options" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="border-border">
                  {showDeleteConfirm ? (
                    <>
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Delete?</div>
                      <DropdownMenuItem onClick={onCancelDeletePost}>
                        Cancel
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={onConfirmDeletePost}>
                        Confirm
                      </DropdownMenuItem>
                    </>
                  ) : isAuthor ? (
                    <>
                      {onEditPost && (
                        <DropdownMenuItem onClick={() => onEditPost(post)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onSharePost && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSharePost(post) }}>
                          <Forward className="size-4" />
                          Share
                        </DropdownMenuItem>
                      )}
                      {onDeletePost && (
                        <DropdownMenuItem variant="destructive" onSelect={(e) => { e.preventDefault(); onDeletePost(post) }}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : null}
                  {!isAuthor && !showDeleteConfirm && onSharePost && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSharePost(post) }}>
                      <Forward className="size-4" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {!isAuthor && !showDeleteConfirm && onReportPost && (
                    <DropdownMenuItem onClick={() => onReportPost(post.id)}>
                      <Flag className="size-4" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="ml-auto size-8" />
            )}
          </div>
          <div className="mt-1.5 text-left w-full">
            {post.title && (
              <h3 className="text-lg font-semibold text-foreground leading-tight tracking-tight">{post.title}</h3>
            )}
            {post.content && (
              <SafeHtml
                content={post.content}
                className={cn("text-sm text-muted-foreground leading-relaxed line-clamp-8", post.title && "mt-2")}
                as="div"
              />
            )}
            {!post.title && !post.content && (
              <p className="text-sm text-muted-foreground italic">Post</p>
            )}
            {(() => {
              const embed = getEmbedInfo(post.url)
              return embed ? (
                <div className="mt-2 w-full overflow-hidden rounded-lg" style={{ aspectRatio: embed.aspectRatio }}>
                  <iframe
                    src={embed.embedUrl}
                    title="Embedded video"
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ) : post.url ? (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                >
                  <Link2 className="size-3 shrink-0" />
                  <span className="break-all">{post.url}</span>
                </a>
              ) : null
            })()}
            {(post.image_url ?? post.image_path) && (
              <img src={post.image_url ?? post.image_path ?? ''} alt="" className="mt-2 block mx-auto max-w-full max-h-96 rounded-lg object-contain" />
            )}
          </div>
          {(post.post_type === "poll" || post.post_type === "post") && post.poll_options && post.poll_options.length > 0 && (
            <PollVoteBlock
              postId={post.id}
              options={post.poll_options}
              currentUserVoteOptionId={post.current_user_vote_option_id}
              userId={userId}
              onVote={onVote}
            />
          )}
          <div className="mt-3 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {likeDisabled ? (
              <span
                className={cn(
                  "flex cursor-not-allowed items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 text-xs text-muted-foreground transition-opacity hover:opacity-50"
                )}
                aria-label="Liking disabled for squad posts"
              >
                <Heart className="size-4" fill="none" />
                <span>{post.heart_count ?? 0}</span>
              </span>
            ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onLike() }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 text-xs transition-colors",
                post.current_user_hearted ? "text-red-400" : "text-muted-foreground hover:text-red-400 active:text-red-500"
              )}
              aria-label={post.current_user_hearted ? "Unheart" : "Heart"}
            >
              <Heart className="size-4" fill={post.current_user_hearted ? "currentColor" : "none"} />
              <span>{post.heart_count ?? 0}</span>
            </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenDetail() }}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="size-4" />
              <span>{post.reply_count ?? 0}</span>
            </button>
            {onSharePost && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSharePost(post) }}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-primary"
                aria-label="Share"
              >
                <Forward className="size-4" />
                <span>{post.share_count ?? 0}</span>
              </button>
            )}
            {onPinToSquad && (
              <button
                onClick={(e) => { e.stopPropagation(); onPinToSquad(post) }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  isPinnedToSquad ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
                aria-label={isPinnedToSquad ? "Unpin from squad" : "Pin to squad"}
              >
                <Pin className={cn("size-4", isPinnedToSquad && "fill-current")} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onBookmark() }}
              className={cn(
                "ml-auto flex size-8 items-center justify-center rounded-md transition-colors",
                post.current_user_pinned ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              aria-label={post.current_user_pinned ? "Unpin" : "Bookmark"}
            >
              <Bookmark className={cn("size-4", post.current_user_pinned && "fill-current")} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Sidebar Panels ──
function PinnedPanel({
  posts,
  onOpenPost,
  onUnpin,
  onOpenUserProfile,
  userId,
}: {
  posts: FeedPostWithAuthor[]
  onOpenPost: (post: FeedPostWithAuthor) => void
  onUnpin?: (post: FeedPostWithAuthor) => void
  onOpenUserProfile?: (authorId: string) => void
  userId?: string
}) {
  if (posts.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bookmark className="size-4 text-primary fill-primary" />
        <h3 className="text-sm font-semibold text-foreground">Saved</h3>
      </div>
      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto p-2 pb-4 rounded-lg border border-border">
        {posts.map((post) => {
          const canOpenProfile = !!onOpenUserProfile && !!userId && post.author_id !== userId
          const hoverColor = quadHoverColor(post.id)
          return (
          <div
            key={post.id}
            className={cn(
              "flex items-start gap-2 rounded-lg p-3.5 transition-all hover:shadow-lg shrink-0",
              hoverColor === "quad-green" && "hover:shadow-quad-green/20",
              hoverColor === "quad-blue" && "hover:shadow-quad-blue/20",
              hoverColor === "quad-red" && "hover:shadow-quad-red/20",
              hoverColor === "quad-yellow" && "hover:shadow-quad-yellow/20"
            )}
          >
            {canOpenProfile ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenUserProfile!(post.author_id) }}
                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                aria-label={`View ${FeedService.postAuthorName(post)}'s profile`}
              >
                <AuthorAvatar
                  profile={post.author}
                  color={FeedService.avatarColor(post.author_id)}
                  initials={FeedService.postInitials(post)}
                  sizeClass="size-7"
                  className="mt-0.5"
                  avatarUrl={post.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
                />
              </button>
            ) : (
              <AuthorAvatar
                profile={post.author}
                color={FeedService.avatarColor(post.author_id)}
                initials={FeedService.postInitials(post)}
                sizeClass="size-7"
                className="mt-0.5"
                avatarUrl={post.override_author_name?.trim() ? QUADLY_AVATAR_URL : undefined}
              />
            )}
            <button
              type="button"
              onClick={() => onOpenPost(post)}
              className="flex-1 text-left min-w-0"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <span className="shrink-0">{FeedService.timeAgo(post.created_at)}</span>
                <span>·</span>
                <span>{post.heart_count ?? 0} <Heart className="size-2.5 inline align-middle" fill="none" /></span>
                <span>·</span>
                <span>{post.reply_count ?? 0} <MessageCircle className="size-2.5 inline align-middle" /></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                {canOpenProfile ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onOpenUserProfile!(post.author_id) }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenUserProfile!(post.author_id) } }}
                    className="font-medium text-foreground truncate hover:underline cursor-pointer"
                  >
                    {FeedService.postAuthorName(post)}
                  </span>
                ) : (
                  <span className="font-medium text-foreground truncate">{FeedService.postAuthorName(post)}</span>
                )}
              </div>
              {post.title ? (
                <p className="text-sm text-foreground">{post.title}</p>
              ) : post.content ? (
                <SafeHtml content={post.content} className="text-sm text-foreground" as="div" />
              ) : (
                <p className="text-sm text-foreground">Post</p>
              )}
            </button>
            {onUnpin && (
              <button
                type="button"
                onClick={() => onUnpin(post)}
                aria-label="Unpin"
                className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

function TrendingPanel({ onGoToSquad }: { onGoToSquad?: (squadId: string) => void }) {
  const [trending, setTrending] = useState<
    Awaited<ReturnType<typeof SquadsService.getTrendingSquads>>
  >([])
  const [loading, setLoading] = useState(true)
  const [squadsExpanded, setSquadsExpanded] = useState(false)

  useEffect(() => {
    SquadsService.getTrendingSquads()
      .then(setTrending)
      .catch(() => setTrending([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <TrendingUp className="size-4 text-primary" />
        Trending Squads
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Most active squads — {trendingWindowLabel(trending[0]?.window_hours)}
      </p>
      <div className="flex flex-col gap-3">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-lg border border-border bg-card animate-pulse" />
            ))}
          </>
        ) : trending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No trending squads yet.</p>
        ) : (
          <>
            {(squadsExpanded ? trending : trending.slice(0, 10)).map((squad, i) => (
              <TrendingSquadCard
                key={squad.id}
                squad={squad}
                compact
                homePageStyle
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
            {trending.length > 10 && (
              <button
                type="button"
                onClick={() => setSquadsExpanded((v) => !v)}
                className="mt-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                {squadsExpanded
                  ? "See less"
                  : `See ${trending.length - 10} more ${trending.length === 11 ? "squad" : "squads"}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MySquadsPanel({ squads, onGoToSquad }: { squads: { id: string; name: string; avatar_url?: string | null; cover_url?: string | null; member_count?: number; post_count?: number }[]; onGoToSquad?: (squadId: string) => void }) {
  const mySquads = squads.slice(0, 4)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">My Squads</h3>
      </div>
      <div className="flex flex-col gap-3">
        {mySquads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No squads yet</p>
        ) : (
          mySquads.map((squad) => {
            const hoverColor = quadHoverColor(squad.id)
            const postCount = squad.post_count ?? 0
            const hasCover = !!squad.cover_url
            return (
              <button
                key={squad.id}
                type="button"
                onClick={() => onGoToSquad?.(squad.id)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border border-border overflow-hidden p-3 text-left transition-all hover:shadow-lg w-full",
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
                  <Avatar className="size-10 shrink-0 rounded-full">
                    {squad.avatar_url ? (
                      <AvatarImage src={squad.avatar_url} alt="" className="rounded-full object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-full text-primary-foreground text-xs font-bold" style={{ backgroundColor: quadAvatarColor(squad.id) }}>
                      {squad.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-medium truncate block", hasCover ? "text-white" : "text-foreground")}>
                      #{squad.name}
                    </span>
                    <span className={cn("text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
                      {squad.member_count ?? 0} {(squad.member_count ?? 0) === 1 ? "member" : "members"} · {postCount} {postCount === 1 ? "post" : "posts"}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function ActiveFriendsPanel({
  friends,
  onViewUserProfile,
  onNavigateToExplore,
  isMobile,
}: {
  friends: Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>
  onViewUserProfile?: (id: string) => void
  onNavigateToExplore?: () => void
  isMobile: boolean
}) {
  const [quadlyMessageOpen, setQuadlyMessageOpen] = useState(false)
  const DESKTOP_MAX = 5
  const hasFriends = friends.length > 0
  const displayFriendsDesktop = friends.slice(0, DESKTOP_MAX)
  const hasMore = friends.length > DESKTOP_MAX

  const getInitials = (f: { full_name: string | null; public_name: string | null }) => {
    const name = f.public_name?.trim() || f.full_name?.trim() || "?"
    return name.slice(0, 2).toUpperCase()
  }
  const getName = (f: { full_name: string | null; public_name: string | null }) =>
    f.public_name?.trim() || f.full_name?.trim()?.split(/\s+/)[0] || "Friend"

  const renderMobileTile = (f: (typeof friends)[number]) => {
    const inner = (
      <>
        <div className="relative">
          <Avatar className="size-12">
            {f.avatar_url ? <AvatarImage src={f.avatar_url} alt="" /> : null}
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
              {getInitials(f)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary ring-[1.5px] ring-background" />
        </div>
        <span className="text-xs text-muted-foreground truncate w-12 text-center">{getName(f)}</span>
      </>
    )
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => onViewUserProfile?.(f.id)}
        className="flex flex-col items-center gap-0.5 shrink-0"
      >
        {inner}
      </button>
    )
  }

  if (isMobile) {
    if (!hasFriends) {
      return (
        <div className="relative z-10 w-full min-w-0 bg-background">
          <div className="flex items-center gap-3">
            <QuadlyMessagePopover
              variant="mobile"
              open={quadlyMessageOpen}
              onOpenChange={setQuadlyMessageOpen}
            />
            <div className="min-w-0 flex-1">
              {onNavigateToExplore ? (
                <button
                  type="button"
                  onClick={onNavigateToExplore}
                  className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  Add friends
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">No friends yet</p>
              )}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="relative z-10 w-full min-w-0 bg-background">
        <div
          className="flex gap-2.5 overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        >
          {friends.map((f) => renderMobileTile(f))}
        </div>
      </div>
    )
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground mb-3">Active Friends</h3>
      {!hasFriends ? (
        <div className="flex items-center gap-3">
          <QuadlyMessagePopover
            variant="desktop"
            open={quadlyMessageOpen}
            onOpenChange={setQuadlyMessageOpen}
          />
          <div className="min-w-0 flex-1">
            {onNavigateToExplore ? (
              <button
                type="button"
                onClick={onNavigateToExplore}
                className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                Add friends
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">No friends yet</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
        {displayFriendsDesktop.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onViewUserProfile?.(f.id)}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={`View ${getName(f)}'s profile`}
            >
              <Avatar className="size-9">
                {f.avatar_url ? <AvatarImage src={f.avatar_url} alt="" /> : null}
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                  {getInitials(f)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary ring-2 ring-card" />
            </button>
        ))}
        {hasMore && onNavigateToExplore && (
          <button
            type="button"
            onClick={onNavigateToExplore}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            See more
          </button>
        )}
        </div>
      )}
    </section>
  )
}

// ── Friends Feed Config Modal ──
function FriendsFeedConfigModal({
  open,
  onClose,
  config,
  friends,
  onSave,
  isMobile,
}: {
  open: boolean
  onClose: () => void
  config: { friend_ids: string[]; known_friend_ids: string[] } | null
  friends: Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>
  onSave: (friend_ids: string[]) => Promise<void>
  isMobile: boolean
}) {
  const knownSet = config ? new Set(config.known_friend_ids) : new Set<string>()
  const baseIds = config === null ? friends.map((f) => f.id) : config.friend_ids
  const newFriendIds = config ? friends.filter((f) => !knownSet.has(f.id)).map((f) => f.id) : []
  const selectedIds = [...new Set([...baseIds, ...newFriendIds])]
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set(selectedIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const known = config ? new Set(config.known_friend_ids) : new Set<string>()
      const base = config === null ? friends.map((f) => f.id) : config.friend_ids
      const newIds = config ? friends.filter((f) => !known.has(f.id)).map((f) => f.id) : []
      setSelectedFriends(new Set([...base, ...newIds]))
    }
  }, [open, config, friends])

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(Array.from(selectedFriends))
    } finally {
      setSaving(false)
    }
  }

  const body = (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">Choose which friends appear in your feed.</p>
      {friends.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Friends</span>
            <button
              type="button"
              onClick={() => {
                if (selectedFriends.size === friends.length)
                  setSelectedFriends(new Set())
                else
                  setSelectedFriends(new Set(friends.map((f) => f.id)))
              }}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {selectedFriends.size === friends.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {friends.map((friend) => {
              const name = friend.public_name?.trim() || friend.full_name?.trim() || "Unknown"
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleFriend(friend.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2.5 transition-colors text-left",
                    selectedFriends.has(friend.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <Avatar className="size-7 shrink-0 rounded-full">
                    {friend.avatar_url ? (
                      <AvatarImage src={friend.avatar_url} alt="" className="rounded-full object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate">{name}</span>
                  {selectedFriends.has(friend.id) && <Check className="size-3.5 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Add friends to configure your feed</p>
      )}
      <Button className="mt-2 w-full" disabled={saving || friends.length === 0} onClick={handleSave}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Configure Friends Feed</SheetTitle>
            <SheetDescription className="sr-only">Choose which friends appear</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Configure Friends Feed</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </div>
  )
}

// ── Custom Feed Config Modal ──
function CustomFeedConfigModal({
  open,
  onClose,
  config,
  joinedSquads,
  onSave,
  isMobile,
}: {
  open: boolean
  onClose: () => void
  config: { include_campus: boolean; squad_ids: string[]; known_squad_ids: string[] } | null
  joinedSquads: { id: string; name: string; avatar_url?: string | null }[]
  onSave: (cfg: { include_campus: boolean; squad_ids: string[] }) => Promise<void>
  isMobile: boolean
}) {
  const squadIds = joinedSquads.map((s) => s.id)
  const effectiveConfig = config ?? { include_campus: true, squad_ids: squadIds, known_squad_ids: [] }
  const knownSet = config ? new Set(config.known_squad_ids) : new Set<string>()
  const baseSquadIds = config === null ? squadIds : config.squad_ids
  const newSquadIds = config ? joinedSquads.filter((s) => !knownSet.has(s.id)).map((s) => s.id) : []
  const initialSquadIds = [...new Set([...baseSquadIds, ...newSquadIds])]
  const [includeCampus, setIncludeCampus] = useState(effectiveConfig.include_campus)
  const [selectedSquads, setSelectedSquads] = useState<Set<string>>(new Set(initialSquadIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const known = config ? new Set(config.known_squad_ids) : new Set<string>()
      const base = config === null ? squadIds : config.squad_ids
      const newIds = config ? joinedSquads.filter((s) => !known.has(s.id)).map((s) => s.id) : []
      setIncludeCampus(config?.include_campus ?? true)
      setSelectedSquads(new Set([...base, ...newIds]))
    }
  }, [open, config, joinedSquads])

  const toggleSquad = (id: string) => {
    setSelectedSquads((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ include_campus: includeCampus, squad_ids: Array.from(selectedSquads) })
    } finally {
      setSaving(false)
    }
  }

  const body = (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">Choose which feeds to combine into your custom feed.</p>

      {/* Campus toggle */}
      <button
        type="button"
        onClick={() => setIncludeCampus((v) => !v)}
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 transition-colors text-left",
          includeCampus
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/30"
        )}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          C
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">Campus Feed</span>
          <p className="text-xs text-muted-foreground mt-0.5">Posts from all campus users</p>
        </div>
        {includeCampus && <Check className="size-4 text-primary shrink-0" />}
      </button>

      {/* Squads */}
      {joinedSquads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Squads</span>
            <button
              type="button"
              onClick={() => {
                if (selectedSquads.size === joinedSquads.length)
                  setSelectedSquads(new Set())
                else
                  setSelectedSquads(new Set(joinedSquads.map((s) => s.id)))
              }}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {selectedSquads.size === joinedSquads.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {joinedSquads.map((squad) => (
              <button
                key={squad.id}
                type="button"
                onClick={() => toggleSquad(squad.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5 transition-colors text-left",
                  selectedSquads.has(squad.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Avatar className="size-7 shrink-0 rounded-full">
                  {squad.avatar_url ? (
                    <AvatarImage src={squad.avatar_url} alt="" className="rounded-full object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded-full text-primary-foreground text-xs font-bold" style={{ backgroundColor: quadAvatarColor(squad.id) }}>
                    {squad.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">#{squad.name}</span>
                {selectedSquads.has(squad.id) && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {joinedSquads.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Join some squads to add them here
        </p>
      )}

      <Button className="mt-2 w-full" disabled={saving} onClick={handleSave}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Configure Custom Feed</SheetTitle>
            <SheetDescription className="sr-only">Choose feeds to combine</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Configure Custom Feed</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </div>
  )
}

// ── Main Export ──
export function HomeFeed({
  onViewUserProfile,
  onGoToSquad,
  onNavigateToExplore,
  onNavigateToDiscoverSquads,
  initialPostId,
}: { onViewUserProfile?: (authorId: string) => void; onGoToSquad?: (squadId: string) => void; onNavigateToExplore?: () => void; onNavigateToDiscoverSquads?: () => void; initialPostId?: string | null } = {}) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const isMobile = useIsMobile()
  const { setIsSubView } = useSubView()
  const userId = user?.id

  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [feedTab, setFeedTab] = useState<"campus" | "friends" | "custom">("campus")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [sortAscending, setSortAscending] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [editPost, setEditPost] = useState<FeedPostWithAuthor | null>(null)
  const [deletePostToConfirm, setDeletePostToConfirm] = useState<FeedPostWithAuthor | null>(null)
  const [sharePost, setSharePost] = useState<FeedPostWithAuthor | null>(null)
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(null)
  const [detailPostSquadContext, setDetailPostSquadContext] = useState<{ squadReadOnly: boolean; squadBanner: SquadReadOnlyBanner } | null>(null)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [mySquads, setMySquads] = useState<{ id: string; name: string; avatar_url?: string | null; cover_url?: string | null; member_count?: number; post_count?: number }[]>([])
  const [myFriends, setMyFriends] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [myFriendsLoaded, setMyFriendsLoaded] = useState(false)

  // Friends feed
  const [friendsPosts, setFriendsPosts] = useState<FeedPostWithAuthor[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsHasMore, setFriendsHasMore] = useState(true)
  const [friendsLoadingMore, setFriendsLoadingMore] = useState(false)
  const friendsLengthRef = useRef(0)
  const friendsLoadingMoreRef = useRef(false)
  const [friendsConfig, setFriendsConfig] = useState<{ friend_ids: string[]; known_friend_ids: string[] } | null>(null)
  const [friendsConfigOpen, setFriendsConfigOpen] = useState(false)
  const [friendsConfigLoaded, setFriendsConfigLoaded] = useState(false)

  // Custom feed
  const [customPosts, setCustomPosts] = useState<FeedPostWithAuthor[]>([])
  const [customLoading, setCustomLoading] = useState(false)
  const [customHasMore, setCustomHasMore] = useState(true)
  const [customLoadingMore, setCustomLoadingMore] = useState(false)
  const customLengthRef = useRef(0)
  const customLoadingMoreRef = useRef(false)
  const [customConfig, setCustomConfig] = useState<{ include_campus: boolean; squad_ids: string[]; known_squad_ids: string[] } | null>(null)
  const [customConfigOpen, setCustomConfigOpen] = useState(false)
  const [customConfigLoaded, setCustomConfigLoaded] = useState(false)

  const [pinnedPosts, setPinnedPosts] = useState<FeedPostWithAuthor[]>([])

  const userFirstName = profile?.full_name?.trim().split(/\s+/)[0] || profile?.public_name?.replace(/^@/, "") || null
  const publicHandle = profile?.public_name?.trim().replace(/^@/, "")
  const fullNameInitials = profile?.full_name?.trim()
    ? profile.full_name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?"
  const userInitials = publicHandle ? publicHandle.slice(0, 2).toUpperCase() : fullNameInitials
  const postingInitials = userInitials
  const postingDisplayName = publicHandle ? `@${publicHandle}` : profile?.full_name?.trim() ?? null

  const PAGE_SIZE = 20
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const feedContainerRef = useRef<HTMLDivElement>(null)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const postsLengthRef = useRef(0)
  postsLengthRef.current = posts.length
  friendsLengthRef.current = friendsPosts.length

  const loadingMoreRef = useRef(false)

  useEffect(() => {
    const el = feedContainerRef.current
    if (!el) return
    const SIDEBAR_W = 288
    const GAP = 24
    const MIN_POST = 300
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w === 0) return
      setShowRightSidebar(w >= MIN_POST + SIDEBAR_W + GAP)
    })
    ro.observe(el)
    const w = el.getBoundingClientRect().width
    if (w > 0) setShowRightSidebar(w >= MIN_POST + SIDEBAR_W + GAP)
    return () => ro.disconnect()
  }, [detailPost])

  const loadPosts = useCallback(
    async (silent = false, append = false) => {
      if (append && loadingMoreRef.current) return
      const offset = append ? postsLengthRef.current : 0
      if (append) {
        loadingMoreRef.current = true
        setLoadingMore(true)
      }
      else if (!silent) setLoading(true)
      try {
        const limit = append ? PAGE_SIZE : Math.max(PAGE_SIZE, postsLengthRef.current)
        const list = await FeedService.listPosts(userId, { limit, offset })
        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const newPosts = list.filter((p) => !seen.has(p.id))
            return [...prev, ...newPosts]
          })
          setHasMore(list.length >= PAGE_SIZE)
        } else {
          setPosts(list)
          setHasMore(list.length >= PAGE_SIZE)
        }
      } catch {
        if (!append && !silent) setPosts([])
      } finally {
        if (append) {
          loadingMoreRef.current = false
          setLoadingMore(false)
        } else if (!silent) setLoading(false)
      }
    },
    [userId]
  )

  const loadPinnedPosts = useCallback(async () => {
    if (!userId) return
    try {
      const list = await FeedService.listPinnedPosts(userId)
      setPinnedPosts(list)
    } catch {
      setPinnedPosts([])
    }
  }, [userId])

  const handleOpenPost = useCallback(
    async (post: FeedPostWithAuthor) => {
      if (post.source_type === "squad" && post.source_id && userId) {
        const access = await SquadsService.getSquadPostAccess(post.source_id)
        if (!access) {
          toast.error("You can't interact with this post because you're not in the squad.")
          return
        }
        if (!access.can_view) {
          toast.error("You can't interact with this post because you're not in the squad.")
          return
        }
        setDetailPost(post)
        setDetailPostSquadContext(
          access.is_member ? null : { squadReadOnly: true, squadBanner: { squadName: access.squad_name, squadType: access.squad_type } }
        )
      } else {
        setDetailPost(post)
        setDetailPostSquadContext(null)
      }
    },
    [userId]
  )

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    loadPinnedPosts()
  }, [loadPinnedPosts])

  useEffect(() => {
    if (initialPostId && userId) {
      FeedService.getPost(initialPostId, userId).then((p) => {
        if (p) handleOpenPost(p)
      }).catch(() => {})
    }
  }, [initialPostId, userId, handleOpenPost])

  const loadCustomPosts = useCallback(
    async (silent = false, append = false) => {
      if (append && customLoadingMoreRef.current) return
      const offset = append ? customLengthRef.current : 0
      if (append) {
        customLoadingMoreRef.current = true
        setCustomLoadingMore(true)
      } else if (!silent) setCustomLoading(true)
      try {
        const limit = append ? PAGE_SIZE : Math.max(PAGE_SIZE, customLengthRef.current)
        const list = await FeedService.listCustomFeedPosts(userId, { limit, offset })
        if (append) {
          setCustomPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            return [...prev, ...list.filter((p) => !seen.has(p.id))]
          })
          setCustomHasMore(list.length >= PAGE_SIZE)
        } else {
          setCustomPosts(list)
          setCustomHasMore(list.length >= PAGE_SIZE)
        }
      } catch {
        if (!append && !silent) setCustomPosts([])
      } finally {
        if (append) {
          customLoadingMoreRef.current = false
          setCustomLoadingMore(false)
        } else if (!silent) setCustomLoading(false)
      }
    },
    [userId]
  )

  const loadFriendsPosts = useCallback(
    async (silent = false, append = false) => {
      if (!userId) return
      if (append && friendsLoadingMoreRef.current) return
      const offset = append ? friendsLengthRef.current : 0
      if (append) {
        friendsLoadingMoreRef.current = true
        setFriendsLoadingMore(true)
      } else if (!silent) setFriendsLoading(true)
      try {
        const limit = append ? PAGE_SIZE : Math.max(PAGE_SIZE, friendsLengthRef.current)
        const list = await FeedService.listFriendsFeedPosts(userId, { limit, offset })
        if (append) {
          setFriendsPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            return [...prev, ...list.filter((p) => !seen.has(p.id))]
          })
          setFriendsHasMore(list.length >= PAGE_SIZE)
        } else {
          setFriendsPosts(list)
          setFriendsHasMore(list.length >= PAGE_SIZE)
        }
      } catch {
        if (!append && !silent) setFriendsPosts([])
      } finally {
        if (append) {
          friendsLoadingMoreRef.current = false
          setFriendsLoadingMore(false)
        } else if (!silent) setFriendsLoading(false)
      }
    },
    [userId]
  )

  // Load custom feed config once (null = no row, first time)
  useEffect(() => {
    if (!userId || customConfigLoaded) return
    FeedService.getCustomFeedConfig()
      .then((cfg) => { setCustomConfig(cfg); setCustomConfigLoaded(true) })
      .catch(() => setCustomConfigLoaded(true))
  }, [userId, customConfigLoaded])

  // Load friends feed config once (null = no row, first time)
  useEffect(() => {
    if (!userId || friendsConfigLoaded) return
    FeedService.getFriendsFeedConfig()
      .then((cfg) => { setFriendsConfig(cfg); setFriendsConfigLoaded(true) })
      .catch(() => { setFriendsConfig(null); setFriendsConfigLoaded(true) })
  }, [userId, friendsConfigLoaded])

  // First-time: auto-create config with all squads/friends so user sees posts. Skip if no squads/friends.
  useEffect(() => {
    if (!userId || !customConfigLoaded || !friendsConfigLoaded) return
    if (customConfig === null && mySquads.length > 0) {
      const ids = mySquads.map((s) => s.id)
      FeedService.setCustomFeedConfig(true, ids)
        .then(() => {
          setCustomConfig({ include_campus: true, squad_ids: ids, known_squad_ids: ids })
          customLengthRef.current = 0
          loadCustomPosts()
        })
        .catch(() => {})
    }
    if (friendsConfig === null && myFriends.length > 0) {
      const ids = myFriends.map((f) => f.id)
      FeedService.setFriendsFeedConfig(ids)
        .then(() => {
          setFriendsConfig({ friend_ids: ids, known_friend_ids: ids })
          friendsLengthRef.current = 0
          loadFriendsPosts()
        })
        .catch(() => {})
    }
  }, [userId, customConfigLoaded, friendsConfigLoaded, customConfig, friendsConfig, mySquads, myFriends, loadCustomPosts, loadFriendsPosts])

  // Load friends posts when switching to friends tab. No friends = no posts (skip API call).
  useEffect(() => {
    if (feedTab === "friends" && friendsConfigLoaded && userId) {
      if (myFriends.length === 0) {
        setFriendsPosts([])
        setFriendsHasMore(false)
        setFriendsLoading(false)
      } else {
        friendsLengthRef.current = 0
        loadFriendsPosts()
      }
    }
  }, [feedTab, friendsConfigLoaded, userId, loadFriendsPosts, myFriends.length])

  // Load custom posts when switching to custom tab. No squads = no posts (skip API call).
  useEffect(() => {
    if (feedTab === "custom" && customConfigLoaded) {
      if (mySquads.length === 0) {
        setCustomPosts([])
        setCustomHasMore(false)
        setCustomLoading(false)
      } else {
        customLengthRef.current = 0
        loadCustomPosts()
      }
    }
  }, [feedTab, customConfigLoaded, loadCustomPosts, mySquads.length])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const isCustom = feedTab === "custom"
    const isFriends = feedTab === "friends"
    const currentHasMore = isCustom ? customHasMore : isFriends ? friendsHasMore : hasMore
    const currentLoading = isCustom ? customLoading : isFriends ? friendsLoading : loading
    const currentLoadingMore = isCustom ? customLoadingMore : isFriends ? friendsLoadingMore : loadingMore
    if (!currentHasMore || currentLoading || currentLoadingMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (isCustom) loadCustomPosts(true, true)
          else if (isFriends) loadFriendsPosts(true, true)
          else loadPosts(true, true)
        }
      },
      { rootMargin: "200px", threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [feedTab, loadPosts, loadCustomPosts, loadFriendsPosts, hasMore, loading, loadingMore, customHasMore, customLoading, customLoadingMore, friendsHasMore, friendsLoading, friendsLoadingMore])

  useEffect(() => {
    const onPostsChange = () => {
      if (feedTab === 'custom') loadCustomPosts(true)
      else if (feedTab === 'friends') loadFriendsPosts(true)
      else loadPosts(true)
    }
    const channel = FeedService.subscribeToFeedPosts(null, onPostsChange)
    const aux = FeedService.subscribeToFeedAuxiliary(null, onPostsChange)
    return () => {
      FeedService.unsubscribeFromFeedPosts(channel)
      aux.unsubscribe()
    }
  }, [feedTab, loadPosts, loadCustomPosts, loadFriendsPosts])

  useEffect(() => {
    if (!userId) return
    const fetchSquads = async () => {
      try {
        const squads = await SquadsService.getJoinedSquads()
        setMySquads(squads.map((s) => ({ id: s.id, name: s.name, avatar_url: s.avatar_url, cover_url: s.cover_url, member_count: s.member_count, post_count: s.post_count })))
      } catch {
        setMySquads([])
      }
    }
    fetchSquads()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setMyFriends([])
      setMyFriendsLoaded(false)
      return
    }
    setMyFriendsLoaded(false)
    FriendsService.getFriendsForUser(userId)
      .then(setMyFriends)
      .catch(() => setMyFriends([]))
      .finally(() => setMyFriendsLoaded(true))
  }, [userId])

  const inSubView = !!detailPost
  useEffect(() => {
    if (isMobile) setIsSubView(inSubView)
    return () => setIsSubView(false)
  }, [inSubView, isMobile, setIsSubView])

  const handleCreatePost = async (
    title: string,
    content: string | null,
    imageFile?: File | null,
    url?: string | null,
    pollOptions?: string[]
  ) => {
    if (!userId) {
      toast.error("Please sign in to post.")
      return
    }
    if (editPost) {
      setSubmittingPost(true)
      try {
        let imagePath: string | null = editPost.image_path ?? null
        if (imageFile) {
          imagePath = await FeedService.uploadPostImage(userId, editPost.id, imageFile)
        }
        await FeedService.updatePost(editPost.id, userId, {
          title,
          content,
          url: url?.trim() || null,
          image_path: imagePath,
        })
        await loadPosts()
        if (detailPost?.id === editPost.id) { setDetailPost(null); setDetailPostSquadContext(null) }
        setEditPost(null)
        setNewPostOpen(false)
        toast.success("Post updated!")
      } catch {
        toast.error("Failed to update post. Please try again.")
      } finally {
        setSubmittingPost(false)
      }
      return
    }
    setSubmittingPost(true)
    try {
      const opts = pollOptions?.map((o) => o.trim()).filter(Boolean)
      const post = await FeedService.createPost({
        author_id: userId,
        source_type: "user",
        post_type: "post",
        title,
        content,
        url: url?.trim() || null,
        poll_options: opts && opts.length >= 2 ? opts.map((text, i) => ({ option_text: text, sort_order: i })) : undefined,
      })
      if (imageFile) {
        const imagePath = await FeedService.uploadPostImage(userId, post.id, imageFile)
        await FeedService.updatePost(post.id, userId, { image_path: imagePath })
      }
      await loadPosts()
      setNewPostOpen(false)
      toast.success("Post created!")
    } catch {
      toast.error("Failed to post. Please try again.")
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleEditPost = (post: FeedPostWithAuthor) => {
    setEditPost(post)
    if (isMobile) setNewPostOpen(true)
  }

  const handleDeletePost = (post: FeedPostWithAuthor) => {
    if (!userId || userId !== post.author_id) return
    setDeletePostToConfirm(post)
  }

  const handleReportPost = async (postId: string) => {
    if (!userId) return
    try {
      await FeedService.reportPost(postId, userId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const handleReportReply = async (replyId: string) => {
    if (!userId) return
    try {
      await FeedService.reportReply(replyId, userId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const confirmDeletePost = async () => {
    if (!userId || !deletePostToConfirm) return
    const postId = deletePostToConfirm.id
    try {
      await FeedService.deletePost(postId, userId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setFriendsPosts((prev) => prev.filter((p) => p.id !== postId))
      setCustomPosts((prev) => prev.filter((p) => p.id !== postId))
      if (detailPost?.id === postId) { setDetailPost(null); setDetailPostSquadContext(null) }
      setDeletePostToConfirm(null)
      toast.success("Post deleted")
    } catch {
      toast.error("Failed to delete post")
    }
  }

  const handleBookmark = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    const nextPinned = !post.current_user_pinned
    updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_pinned: nextPinned }))
    try {
      const { pinned } = await FeedService.togglePinPost(post.id, userId)
      updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_pinned: pinned }))
      setPinnedPosts((prev) => {
        if (pinned) return [{ ...post, current_user_pinned: true }, ...prev.filter((p) => p.id !== post.id)]
        return prev.filter((p) => p.id !== post.id)
      })
    } catch {
      updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_pinned: post.current_user_pinned }))
    }
  }

  const handlePollVote = (post: FeedPostWithAuthor, optionId: string, phase: "before" | "after") => {
    if (phase === "after") return
    const prevOptionId = post.current_user_vote_option_id ?? null
    const updater = (p: FeedPostWithAuthor) => {
      if (p.id !== post.id || !p.poll_options) return p
      return {
        ...p,
        current_user_vote_option_id: optionId,
        poll_options: p.poll_options.map((o) => ({
          ...o,
          vote_count:
            (o.vote_count ?? 0) +
            (o.id === optionId ? 1 : 0) -
            (o.id === prevOptionId ? 1 : 0),
        })),
      }
    }
    setPosts((prev) => prev.map(updater))
    setFriendsPosts((prev) => prev.map(updater))
    setCustomPosts((prev) => prev.map(updater))
    return () => {
      const rollback = (p: FeedPostWithAuthor) => {
        if (p.id !== post.id || !p.poll_options) return p
        return {
          ...p,
          current_user_vote_option_id: prevOptionId,
          poll_options: p.poll_options.map((o) => ({
            ...o,
            vote_count:
              (o.vote_count ?? 0) -
              (o.id === optionId ? 1 : 0) +
              (o.id === prevOptionId ? 1 : 0),
          })),
        }
      }
      setPosts((prev) => prev.map(rollback))
      setFriendsPosts((prev) => prev.map(rollback))
      setCustomPosts((prev) => prev.map(rollback))
    }
  }

  const likingInProgressRef = useRef<Set<string>>(new Set())
  const updatePostInAllFeeds = useCallback(
    (postId: string, updater: (p: FeedPostWithAuthor) => FeedPostWithAuthor) => {
      setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)))
      setFriendsPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)))
      setCustomPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)))
    },
    []
  )

  const handleLike = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    if (post.source_type === "squad" && post.source_id) {
      const access = await SquadsService.getSquadPostAccess(post.source_id)
      if (!access?.is_member) {
        toast.error("You can't interact with this post because you're not in the squad.")
        return
      }
    }
    if (likingInProgressRef.current.has(post.id)) return
    likingInProgressRef.current.add(post.id)

    const prevHearted = post.current_user_hearted
    const prevCount = post.heart_count ?? 0
    const nextHearted = !prevHearted
    const nextCount = Math.max(0, prevCount + (nextHearted ? 1 : -1))

    updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_hearted: nextHearted, heart_count: nextCount }))
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId)
      const syncCount = hearted ? prevCount + 1 : Math.max(0, prevCount - 1)
      updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_hearted: hearted, heart_count: syncCount }))
    } catch {
      updatePostInAllFeeds(post.id, (p) => ({ ...p, current_user_hearted: prevHearted, heart_count: prevCount }))
      toast.error("Failed to update. Please try again.")
    } finally {
      likingInProgressRef.current.delete(post.id)
    }
  }

  const sortedPosts = [...posts].sort((a, b) => {
    let cmp: number
    switch (sortOption) {
      case "hearts":
        cmp = (b.heart_count ?? 0) - (a.heart_count ?? 0)
        break
      case "replies":
        cmp = (b.reply_count ?? 0) - (a.reply_count ?? 0)
        break
      case "newest":
      default:
        cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        break
    }
    return sortAscending ? -cmp : cmp
  })

  customLengthRef.current = customPosts.length

  const sortedFriendsPosts = [...friendsPosts].sort((a, b) => {
    let cmp: number
    switch (sortOption) {
      case "hearts":
        cmp = (b.heart_count ?? 0) - (a.heart_count ?? 0)
        break
      case "replies":
        cmp = (b.reply_count ?? 0) - (a.reply_count ?? 0)
        break
      default:
        cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return sortAscending ? -cmp : cmp
  })

  const sortedCustomPosts = [...customPosts].sort((a, b) => {
    let cmp: number
    switch (sortOption) {
      case "hearts":
        cmp = (b.heart_count ?? 0) - (a.heart_count ?? 0)
        break
      case "replies":
        cmp = (b.reply_count ?? 0) - (a.reply_count ?? 0)
        break
      case "newest":
      default:
        cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        break
    }
    return sortAscending ? -cmp : cmp
  })

  const activePosts = feedTab === "custom" ? sortedCustomPosts : sortedPosts
  const activeLoading = feedTab === "custom" ? customLoading : loading
  const activeLoadingMore = feedTab === "custom" ? customLoadingMore : loadingMore

  if (detailPost) {
    return (
      <>
        <NewPostModal
          open={newPostOpen && isMobile}
          onClose={() => { setNewPostOpen(false); setEditPost(null) }}
          isMobile={isMobile}
          onSubmit={handleCreatePost}
          authorId={userId ?? ""}
          userInitials={userInitials}
          submitting={submittingPost}
          editPost={editPost}
        />
        <SharePostModal
          open={!!sharePost}
          onClose={() => setSharePost(null)}
          post={sharePost}
          onShareSuccess={(postId, added) => {
            setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
            setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
            setFriendsPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
            setCustomPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
            setPinnedPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          }}
        />
        <div className="mx-auto w-full max-w-6xl h-full flex flex-col min-h-0 min-w-0 px-4 md:px-6 overflow-x-hidden">
          <div ref={feedContainerRef} className="flex flex-1 gap-6 min-h-0 overflow-hidden">
            <div className="flex-1 max-w-2xl mx-auto lg:mx-0 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
              <PostDetailView
                post={detailPost}
                userId={userId}
                currentUserInitials={userInitials}
                isMobile={isMobile}
                editPost={editPost}
                deletePostToConfirm={deletePostToConfirm}
                onConfirmDeletePost={confirmDeletePost}
                onCancelDeletePost={() => setDeletePostToConfirm(null)}
                onBack={() => {
                  setDetailPost(null)
                  setDetailPostSquadContext(null)
                  loadPosts(true)
                }}
                onEditPost={handleEditPost}
                onDeletePost={handleDeletePost}
                onReportPost={handleReportPost}
                onSharePost={(p) => setSharePost(p)}
                onReportReply={handleReportReply}
                onOpenUserProfile={userId ? onViewUserProfile : undefined}
                onCancelEditPost={() => setEditPost(null)}
                onSubmitPost={handleCreatePost}
                submittingPost={submittingPost}
                squadReadOnly={detailPostSquadContext?.squadReadOnly}
                squadBanner={detailPostSquadContext?.squadBanner}
                onGoToSquad={onGoToSquad}
              />
            </div>
            {showRightSidebar && (
              <aside className="hidden md:block w-72 shrink-0 min-h-0 pt-4 pb-nav-safe md:pb-8 overflow-y-auto">
                <div className="w-72 flex flex-col rounded-xl border border-border bg-card p-4">
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Active Friends</h3>
                    <div className="flex flex-wrap gap-2">
                      {["MR", "AK", "SW", "PP", "EF"].map((initials) => (
                        <div key={initials} className="relative">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary ring-2 ring-card" />
                        </div>
                      ))}
                    </div>
                  </section>
                  <div className="border-t border-border my-6" aria-hidden />
                  <section>
                    <TrendingPanel onGoToSquad={onGoToSquad} />
                  </section>
                  <div className="border-t border-border my-6" aria-hidden />
                  <section>
                    <MySquadsPanel squads={mySquads} onGoToSquad={onGoToSquad} />
                  </section>
                  {pinnedPosts.length > 0 && (
                    <>
                      <div className="border-t border-border my-6" aria-hidden />
                      <section>
                        <PinnedPanel posts={pinnedPosts} onOpenPost={handleOpenPost} onUnpin={userId ? handleBookmark : undefined} onOpenUserProfile={userId ? onViewUserProfile : undefined} userId={userId} />
                      </section>
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <NewPostModal
        open={newPostOpen && isMobile}
        onClose={() => { setNewPostOpen(false); setEditPost(null) }}
        isMobile={isMobile}
        onSubmit={handleCreatePost}
        authorId={userId ?? ""}
        userInitials={userInitials}
        submitting={submittingPost}
        editPost={editPost}
      />
      <SharePostModal
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
        onShareSuccess={(postId, added) => {
          setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
          setFriendsPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setCustomPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setPinnedPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
        }}
      />
      <div className="mx-auto w-full max-w-6xl h-full flex flex-col min-h-0 min-w-0 px-4 md:px-6 overflow-x-hidden">
        <div ref={feedContainerRef} className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
            {isMobile && userId && myFriendsLoaded && (
              <div className="shrink-0 py-1.5">
                <ActiveFriendsPanel
                  friends={myFriends}
                  onViewUserProfile={onViewUserProfile}
                  onNavigateToExplore={onNavigateToExplore}
                  isMobile={true}
                />
              </div>
            )}
            <div className={cn("pb-1 mb-2 bg-background", isMobile ? "pt-0" : "pt-3")}>
              <div className="inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
                {(["campus", "custom", "friends"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFeedTab(tab)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      feedTab === tab
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground active:bg-accent/50"
                    )}
                  >
                    {tab === "campus" ? "Campus" : tab === "friends" ? "Friends" : "Custom"}
                  </button>
                ))}
              </div>
            </div>
            {feedTab === "campus" && (
              <>
                <div className="mb-3">
                  <FeedSortRow
                    sort={sortOption}
                    ascending={sortAscending}
                    onSort={setSortOption}
                    onToggleOrder={() => setSortAscending((prev) => !prev)}
                  />
                </div>

                <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
                  <PostComposer
                    key="create"
                    onOpenDrawer={() => setNewPostOpen(true)}
                    isMobile={isMobile}
                    userInitials={userInitials}
                    userFirstName={userFirstName}
                    postingInitials={postingInitials}
                    postingDisplayName={postingDisplayName}
                    onSubmit={handleCreatePost}
                    submitting={submittingPost}
                  />
                  {loading ? (
                    <FeedSkeleton count={4} />
                  ) : (
                    <>
                      {sortedPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          userId={userId}
                          deletePostToConfirm={deletePostToConfirm}
                          onConfirmDeletePost={confirmDeletePost}
                          onCancelDeletePost={() => setDeletePostToConfirm(null)}
                          onLike={() => handleLike(post)}
                          onBookmark={() => handleBookmark(post)}
                          onOpenDetail={() => handleOpenPost(post)}
                          onVote={(optionId, phase) => handlePollVote(post, optionId, phase)}
                          onEditPost={handleEditPost}
                          onDeletePost={handleDeletePost}
                          onReportPost={handleReportPost}
                          onSharePost={(p) => setSharePost(p)}
                          onOpenUserProfile={userId && post.author_id !== userId ? onViewUserProfile : undefined}
                          editPost={editPost}
                          onSubmitPost={handleCreatePost}
                          onCancelEditPost={() => setEditPost(null)}
                          submittingPost={submittingPost}
                          userInitials={userInitials}
                          isMobile={isMobile}
                          sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                          sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                          onGoToSquad={onGoToSquad}
                        />
                      ))}
                      <div ref={loadMoreRef} className="min-h-4" />
                      {loadingMore && (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            {feedTab === "friends" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <FeedSortRow
                    sort={sortOption}
                    ascending={sortAscending}
                    onSort={setSortOption}
                    onToggleOrder={() => setSortAscending((prev) => !prev)}
                  />
                  <button
                    type="button"
                    onClick={() => setFriendsConfigOpen(true)}
                    disabled={myFriends.length === 0}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                      myFriends.length === 0
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "text-primary bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <Settings2 className="size-3.5" />
                    Configure
                  </button>
                </div>
                {myFriends.length === 0 ? (
                  <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <UserPlus className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No friends yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add friends to see their posts here</p>
                      {onNavigateToExplore && (
                        <button
                          type="button"
                          onClick={onNavigateToExplore}
                          className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Add friends
                        </button>
                      )}
                    </div>
                  </div>
                ) : friendsConfigLoaded && friendsConfig !== null && friendsConfig.friend_ids.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <UserPlus className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No friends selected</p>
                    <p className="text-xs text-muted-foreground mt-1">Tap Configure to choose which friends appear in your feed</p>
                    <button
                      type="button"
                      onClick={() => setFriendsConfigOpen(true)}
                      className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
                      {friendsLoading && friendsConfig !== null && friendsConfig.friend_ids.length > 0 ? (
                        <FeedSkeleton count={4} />
                      ) : sortedFriendsPosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <UserPlus className="size-12 text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">No posts from friends yet</p>
                          <p className="text-xs text-muted-foreground mt-1">When your friends post, they&apos;ll show up here</p>
                        </div>
                      ) : (
                        <>
                          {sortedFriendsPosts.map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              userId={userId}
                              deletePostToConfirm={deletePostToConfirm}
                              onConfirmDeletePost={confirmDeletePost}
                              onCancelDeletePost={() => setDeletePostToConfirm(null)}
                              onLike={() => handleLike(post)}
                              onBookmark={() => handleBookmark(post)}
                              onOpenDetail={() => handleOpenPost(post)}
                              onVote={(optionId, phase) => handlePollVote(post, optionId, phase)}
                              onEditPost={handleEditPost}
                              onDeletePost={handleDeletePost}
                              onReportPost={handleReportPost}
                              onSharePost={(p) => setSharePost(p)}
                              onOpenUserProfile={userId && post.author_id !== userId ? onViewUserProfile : undefined}
                              editPost={editPost}
                              onSubmitPost={handleCreatePost}
                              onCancelEditPost={() => setEditPost(null)}
                              submittingPost={submittingPost}
                              userInitials={userInitials}
                              isMobile={isMobile}
                              sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                              sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                              onGoToSquad={onGoToSquad}
                            />
                          ))}
                          <div ref={loadMoreRef} className="min-h-4" />
                          {friendsLoadingMore && (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <FriendsFeedConfigModal
                      open={friendsConfigOpen}
                      onClose={() => setFriendsConfigOpen(false)}
                      config={friendsConfig}
                      friends={myFriends}
                      onSave={async (friend_ids) => {
                        try {
                          await FeedService.setFriendsFeedConfig(friend_ids)
                          setFriendsConfig({ friend_ids, known_friend_ids: myFriends.map((f) => f.id) })
                          setFriendsConfigOpen(false)
                          friendsLengthRef.current = 0
                          loadFriendsPosts()
                          toast.success("Friends feed updated")
                        } catch {
                          toast.error("Failed to save. Try again.")
                        }
                      }}
                      isMobile={isMobile}
                    />
                  </>
                )}
              </>
            )}
            {feedTab === "custom" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <FeedSortRow
                    sort={sortOption}
                    ascending={sortAscending}
                    onSort={setSortOption}
                    onToggleOrder={() => setSortAscending((prev) => !prev)}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomConfigOpen(true)}
                    disabled={(customConfig?.include_campus ?? true) && (customConfig?.squad_ids?.length ?? 0) === 0 && mySquads.length === 0}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                      (customConfig?.include_campus ?? true) && (customConfig?.squad_ids?.length ?? 0) === 0 && mySquads.length === 0
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "text-primary bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <Settings2 className="size-3.5" />
                    Configure
                  </button>
                </div>

                {mySquads.length === 0 ? (
                  <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No squads yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Join squads to add them to your custom feed</p>
                      {onNavigateToDiscoverSquads && (
                        <button
                          type="button"
                          onClick={onNavigateToDiscoverSquads}
                          className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Discover squads
                        </button>
                      )}
                    </div>
                  </div>
                ) : !(customConfig?.include_campus ?? true) && (customConfig?.squad_ids?.length ?? 0) === 0 && !customLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Settings2 className="size-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Your custom feed is empty</p>
                    <p className="text-xs text-muted-foreground mt-1">Tap Configure to add Campus or your squads</p>
                    <button
                      type="button"
                      onClick={() => setCustomConfigOpen(true)}
                      className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Configure Feed
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
                    {customLoading && customConfig !== null ? (
                      <FeedSkeleton count={4} />
                    ) : sortedCustomPosts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-sm text-muted-foreground">No posts yet in your custom feed</p>
                      </div>
                    ) : (
                      <>
                        {sortedCustomPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            userId={userId}
                            deletePostToConfirm={deletePostToConfirm}
                            onConfirmDeletePost={confirmDeletePost}
                            onCancelDeletePost={() => setDeletePostToConfirm(null)}
                            onLike={() => handleLike(post)}
                            onBookmark={() => handleBookmark(post)}
                            onOpenDetail={() => handleOpenPost(post)}
                            onVote={(optionId, phase) => handlePollVote(post, optionId, phase)}
                            onEditPost={handleEditPost}
                            onDeletePost={handleDeletePost}
                            onReportPost={handleReportPost}
                            onSharePost={(p) => setSharePost(p)}
                            onOpenUserProfile={userId && post.author_id !== userId ? onViewUserProfile : undefined}
                            editPost={editPost}
                            onSubmitPost={handleCreatePost}
                            onCancelEditPost={() => setEditPost(null)}
                            submittingPost={submittingPost}
                            userInitials={userInitials}
                            isMobile={isMobile}
                            sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                            sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                            onGoToSquad={onGoToSquad}
                          />
                        ))}
                        <div ref={loadMoreRef} className="min-h-4" />
                        {customLoadingMore && (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Custom Feed Config Modal */}
                <CustomFeedConfigModal
                  open={customConfigOpen}
                  onClose={() => setCustomConfigOpen(false)}
                  config={customConfig}
                  joinedSquads={mySquads}
                  onSave={async (cfg) => {
                    try {
                      await FeedService.setCustomFeedConfig(cfg.include_campus, cfg.squad_ids)
                      setCustomConfig({ ...cfg, known_squad_ids: mySquads.map((s) => s.id) })
                      setCustomConfigOpen(false)
                      customLengthRef.current = 0
                      loadCustomPosts()
                      toast.success("Custom feed updated")
                    } catch {
                      toast.error("Failed to save. Try again.")
                    }
                  }}
                  isMobile={isMobile}
                />
              </>
            )}
          </div>

          {showRightSidebar && (
          <aside className="hidden md:block w-72 shrink-0 min-h-0 pt-4 pb-nav-safe md:pb-8 overflow-y-auto">
            <div className="w-72 flex flex-col rounded-xl border border-border bg-card p-4">
              {feedTab !== "friends" && myFriendsLoaded && (
                <>
                  <ActiveFriendsPanel
                    friends={myFriends}
                    onViewUserProfile={onViewUserProfile}
                    onNavigateToExplore={onNavigateToExplore}
                    isMobile={false}
                  />
                  <div className="border-t border-border my-6" aria-hidden />
                </>
              )}
              <section>
                <TrendingPanel onGoToSquad={onGoToSquad} />
              </section>
              <div className="border-t border-border my-6" aria-hidden />
              <section>
                <MySquadsPanel squads={mySquads} onGoToSquad={onGoToSquad} />
              </section>
              {pinnedPosts.length > 0 && (
                <>
                  <div className="border-t border-border my-6" aria-hidden />
                  <section>
                    <PinnedPanel posts={pinnedPosts} onOpenPost={handleOpenPost} onUnpin={userId ? handleBookmark : undefined} onOpenUserProfile={userId ? onViewUserProfile : undefined} userId={userId} />
                  </section>
                </>
              )}
            </div>
          </aside>
          )}
        </div>
      </div>
    </>
  )
}
