import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/contexts/ProfileContext"
import { SquadsService, type Squad, type SquadMember, type SquadDocument } from "@/services/squadsService"
import { FeedService, type FeedPostWithAuthor } from "@/services/feedService"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FeedSkeleton, SquadListCardSkeleton } from "@/components/ui/feed-skeletons"
import {
  Search,
  Users as UsersIcon,
  MessageSquare,
  ArrowLeft,
  Heart,
  MessageCircle,
  Plus,
  Crown,
  Pin,
  ChevronDown,
  FileText,
  LogOut,
  Trash2,
  Upload,
  ArrowUpDown,
  Clock,
  Lock,
  Loader2,
  Check,
  X,
  Settings2,
  Pencil,
  ImageIcon,
  Camera,
  Calendar,
  Globe,
  Info,
  BookOpen,
  Eye,
  MapPin,
  UserMinus,
  UserPlus,
  MessagesSquare,
  Forward,
  Settings,
  VolumeX,
  Volume2,
  EyeOff,
} from "lucide-react"
import { cn, pageMainTitleClass, quadAvatarColor } from "@/lib/utils"
import { useIsMobile, useShowSidebar } from "@/hooks/use-mobile"
import { useSubView } from "@/hooks/use-sub-view"
import { toast } from "sonner"
import { PostDetailView, PostCard, NewPostModal, PostComposer } from "@/components/pages/home-feed"
import { SharePostModal } from "@/components/share-post-modal"
import { ShareSquadModal } from "@/components/share-squad-modal"
import { ChatView } from "@/components/pages/messages-page"
import { supabase } from "@/lib/supabase"
import { MessagingService } from "@/services/messagingService"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SquiggleHoverCard,
  SquiggleHoverCardContent,
  SquiggleHoverCardTrigger,
} from "@/components/ui/hover-card-with-squiggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CATEGORIES, CATEGORY_LABELS, DISCOVER_PRIVACY_TOOLTIP, PRIVACY_BADGE_TOOLTIPS, PRIVACY_DESCRIPTIONS } from "@/lib/squad-constants"
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
  matchesDiscoverSquadSearch,
  type DiscoverSortOption,
} from "@/components/squads/discover-squad-filters"

export { CATEGORIES, DISCOVER_PRIVACY_TOOLTIP }

const SQUAD_HOVER_COLORS = ['quad-green', 'quad-blue', 'quad-red', 'quad-yellow'] as const
function squadHoverColor(id: string): (typeof SQUAD_HOVER_COLORS)[number] {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return SQUAD_HOVER_COLORS[Math.abs(i) % SQUAD_HOVER_COLORS.length]
}

function displayName(m: SquadMember): string {
  return m.profile?.public_name?.trim() || m.profile?.full_name?.trim() || 'Unknown'
}

function initials(m: SquadMember): string {
  const name = displayName(m)
  if (name === 'Unknown') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

// ── Sort Filter Row ──
type SortOption = "newest" | "hearts" | "replies"

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
          type="button"
          onClick={() => onSort(opt.id)}
          aria-pressed={sort === opt.id}
          aria-label={`Sort by ${opt.label}`}
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

// Parse info: "Title\n\nBody" → { title, body }. If no \n\n, whole string is body.
function parseInfo(info: string | null | undefined): { title: string; body: string } {
  if (!info?.trim()) return { title: '', body: '' }
  const idx = info.indexOf('\n\n')
  if (idx === -1) return { title: '', body: info.trim() }
  return { title: info.slice(0, idx).trim(), body: info.slice(idx + 2).trim() }
}
function serializeInfo(title: string, body: string): string {
  const t = title.trim()
  const b = body.trim()
  if (!t && !b) return ''
  if (!t) return b
  return b ? `${t}\n\n${b}` : t
}

function SquadDescription({ info, className = '' }: { info: string | null | undefined; className?: string }) {
  const { title, body } = parseInfo(info)
  if (!title && !body) return <p className={className}>No description.</p>
  return (
    <div className={className}>
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {body && <p className={cn("text-sm text-muted-foreground leading-relaxed", title && "mt-1")}>{body}</p>}
    </div>
  )
}

function SquadDescriptionPreview({ info, hasCover }: { info: string | null | undefined; hasCover?: boolean }) {
  const { title, body } = parseInfo(info)
  const text = [title, body].filter(Boolean).join(' — ') || 'No description.'
  return <p className={cn("mt-3 text-xs leading-relaxed line-clamp-2", hasCover ? "text-white/85" : "text-muted-foreground")}>{text}</p>
}

// ── Invite Squad Member Sheet ──
function InviteSquadSheet({
  open,
  onClose,
  squadId,
  squadName,
  memberIds,
  currentUserId,
  onInvited,
  isMobile,
}: {
  open: boolean
  onClose: () => void
  squadId: string
  squadName: string
  memberIds: string[]
  currentUserId: string | null
  onInvited: () => void
  isMobile: boolean
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!query.trim() || !currentUserId) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase.rpc("list_profiles_for_invite_search", {
        viewer_id_param: currentUserId,
        query_param: query.trim() || null,
      })
      const list = (data || [])
        .filter((p: { id: string }) => !memberIds.includes(p.id))
        .map((p: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }) => ({
          id: p.id,
          full_name: p.full_name,
          public_name: p.public_name,
          avatar_url: p.avatar_url,
        }))
      setResults(list)
      setLoading(false)
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, currentUserId, memberIds])

  const handleInvite = async (userId: string) => {
    setInvitingId(userId)
    try {
      await SquadsService.inviteSquadMember(squadId, userId)
      toast.success("Invite sent. Updates in Notifications.")
      onInvited()
      setQuery("")
      setResults([])
    } catch (e) {
      toast.error((e as Error).message || "Failed to invite")
    } finally {
      setInvitingId(null)
    }
  }

  const dn = (u: { full_name: string | null; public_name: string | null }) =>
    u.public_name?.trim() || u.full_name?.trim() || "Unknown"
  const ini = (u: { full_name: string | null; public_name: string | null }) => {
    const n = dn(u)
    if (n === "Unknown") return "?"
    const parts = n.trim().split(/\s+/)
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2) : n.slice(0, 2).toUpperCase()
  }

  const content = (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @username..."
          className="h-10 pl-9"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1 min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No users found</p>
        )}
        {!loading && results.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-8 shrink-0">
                {u.avatar_url ? <AvatarImage src={u.avatar_url} alt="" /> : null}
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{ini(u)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{dn(u)}</p>
                {u.public_name && <p className="text-xs text-muted-foreground">@{u.public_name.replace(/^@/, "")}</p>}
              </div>
            </div>
            <Button
              size="sm"
              disabled={invitingId === u.id}
              onClick={() => handleInvite(u.id)}
              className="shrink-0"
            >
              {invitingId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : "Invite"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Invite to {squadName}</SheetTitle>
            <SheetDescription>Search for someone to invite. They&apos;ll get a notification to accept or decline.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }
  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Invite to {squadName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Search for someone to invite</p>
        </div>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
    </div>
  )
}

// ── Create Squad Form ──
function CreateSquadFormContent({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void
  onSubmit: (name: string, info: string, category: string, privacy: 'open' | 'restricted' | 'private', meetingTimes: string | null, location: string | null, chatEnabled: boolean) => Promise<void>
  submitting: boolean
}) {
  const [name, setName] = useState("")
  const [descTitle, setDescTitle] = useState("")
  const [descBody, setDescBody] = useState("")
  const [category, setCategory] = useState("")
  const [privacy, setPrivacy] = useState<'open' | 'restricted' | 'private'>('open')
  const [meetingTimes, setMeetingTimes] = useState("")
  const [location, setLocation] = useState("")
  const [chatEnabled, setChatEnabled] = useState(true)

  const handleSubmit = async () => {
    const info = serializeInfo(descTitle, descBody)
    if (!name.trim() || !category) return
    try {
      await onSubmit(name.trim(), info, category, privacy, meetingTimes.trim() || null, location.trim() || null, chatEnabled)
      onClose()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to create squad')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Squad Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Squad name"
          className="bg-secondary border-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
        <div className="rounded-lg border-none bg-secondary focus-within:ring-2 focus-within:ring-primary/50 overflow-hidden">
          <input
            type="text"
            value={descTitle}
            onChange={(e) => setDescTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border"
          />
          <textarea
            value={descBody}
            onChange={(e) => setDescBody(e.target.value)}
            placeholder="Description"
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            rows={3}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Privacy</label>
        <p className="text-xs text-muted-foreground mb-1.5">Controls discover visibility and what others see on your profile. Tap (i) for details.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {(['open', 'restricted', 'private'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrivacy(p)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                privacy === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {p === 'open' ? <UsersIcon className="size-3.5" /> : <Lock className="size-3.5" />}
              {p.charAt(0).toUpperCase() + p.slice(1)}
              <SquiggleHoverCard>
                <SquiggleHoverCardTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-sm border-0 bg-transparent p-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${p} privacy details`}
                  >
                    <Info className="size-3 shrink-0 opacity-70" />
                  </button>
                </SquiggleHoverCardTrigger>
                <SquiggleHoverCardContent className="w-[min(17.5rem,calc(100vw-2rem))] whitespace-pre-line">
                  {PRIVACY_DESCRIPTIONS[p]}
                </SquiggleHoverCardContent>
              </SquiggleHoverCard>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Group Chat</p>
        </div>
        <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meeting Times</label>
        <Input
          value={meetingTimes}
          onChange={(e) => setMeetingTimes(e.target.value)}
          placeholder="Tuesdays 5pm"
          className="bg-secondary border-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Room 201"
          className="bg-secondary border-none"
        />
      </div>
      <Button
        className="mt-2 w-full"
        disabled={!name.trim() || !category || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Create Squad'}
      </Button>
    </div>
  )
}

function CreateSquadModal({ open, onClose, onSubmit, submitting, isMobile }: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, info: string, category: string, privacy: 'open' | 'restricted' | 'private', meetingTimes: string | null, location: string | null, chatEnabled: boolean) => Promise<void>
  submitting: boolean
  isMobile: boolean
}) {
  const content = (
    <CreateSquadFormContent key={open ? 'open' : 'closed'} onClose={onClose} onSubmit={onSubmit} submitting={submitting} />
  )
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Create a Squad</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }
  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Create a Squad</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
    </div>
  )
}

// ── Add Document Form ──
function AddDocumentFormContent({
  onClose,
  onSubmit,
  squadId,
  submitting,
}: {
  onClose: () => void
  onSubmit: (name: string, file: File) => Promise<void>
  squadId: string
  submitting: boolean
}) {
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Document title is required')
      return
    }
    if (!file) {
      toast.error('File is required')
      return
    }
    try {
      await onSubmit(name.trim(), file)
      onClose()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to add document')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Document Title</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Study Guide Chapter 5"
          className="bg-secondary border-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">File</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
        >
          <Upload className="size-5" />
          {file ? file.name : 'Upload a file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button onClick={handleSubmit} disabled={submitting || !file}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Add Document'}
      </Button>
    </div>
  )
}

function AddDocumentModal({ open, onClose, squadId, onSubmit, submitting, isMobile }: {
  open: boolean
  onClose: () => void
  squadId: string
  onSubmit: (name: string, file: File) => Promise<void>
  submitting: boolean
  isMobile: boolean
}) {
  const content = (
    <AddDocumentFormContent key={open ? 'open' : 'closed'} onClose={onClose} onSubmit={onSubmit} squadId={squadId} submitting={submitting} />
  )
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Add Document</SheetTitle>
            <SheetDescription>Share a document with your squad</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }
  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Add Document</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
    </div>
  )
}

// ── Confirm popup (bottom-right on desktop, bottom sheet on mobile) ──
function ConfirmPopup({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  confirmClassName,
  onConfirm,
  isMobile,
  errorMessage,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  confirmClassName?: string
  onConfirm: () => Promise<void>
  isMobile: boolean
  errorMessage: string
}) {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      toast.error((err as Error).message || errorMessage)
    } finally {
      setLoading(false)
    }
  }
  const buttons = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button size="sm" onClick={handleConfirm} disabled={loading} className={confirmClassName}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : confirmLabel}
      </Button>
    </div>
  )
  const content = (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{description}</p>
      {buttons}
    </div>
  )
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 pt-2">{buttons}</div>
        </SheetContent>
      </Sheet>
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

function DeleteSquadDialog({ open, onClose, squadName, onConfirm }: {
  open: boolean
  onClose: () => void
  squadName: string
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {squadName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All posts and documents in this squad will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} variant="outline" size="sm">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructiveSoft"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


// ── Edit Squad Modal ──
function EditSquadFormContent({
  squad,
  onClose,
  onSave,
}: {
  squad: Squad
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(squad.name)
  const [descTitle, setDescTitle] = useState(parseInfo(squad.info).title)
  const [descBody, setDescBody] = useState(parseInfo(squad.info).body)
  const [category, setCategory] = useState(squad.category)
  const [type, setType] = useState<'open' | 'restricted' | 'private'>(squad.type)
  const [nonMembersCanViewPosts, setNonMembersCanViewPosts] = useState(squad.non_members_can_view_posts ?? false)
  const [chatEnabled, setChatEnabled] = useState(squad.chat_enabled)
  const [rules, setRules] = useState(squad.rules || "")
  const [meetingTimes, setMeetingTimes] = useState(squad.meeting_times || "")
  const [squadLocation, setSquadLocation] = useState(squad.location || "")
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      setAvatarRemoved(false)
    }
    e.target.value = ""
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
      setCoverRemoved(false)
    }
    e.target.value = ""
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setAvatarRemoved(true)
  }

  const handleRemoveCover = () => {
    setCoverFile(null)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setCoverRemoved(true)
  }

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [avatarPreview, coverPreview])

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      let avatarPath: string | null | undefined
      let coverPath: string | null | undefined
      if (avatarFile || avatarRemoved) {
        if (squad.avatar_url) await SquadsService.removeSquadAvatarOrCover(squad.avatar_url)
        if (avatarFile) avatarPath = await SquadsService.uploadSquadAvatar(squad.id, avatarFile)
        else avatarPath = null
      }
      if (coverFile || coverRemoved) {
        if (squad.cover_url) await SquadsService.removeSquadAvatarOrCover(squad.cover_url)
        if (coverFile) coverPath = await SquadsService.uploadSquadCover(squad.id, coverFile)
        else coverPath = null
      }
      await SquadsService.updateSquad(squad.id, {
        name: name.trim(),
        info: serializeInfo(descTitle, descBody) || null,
        category,
        type,
        rules: rules.trim() || null,
        meeting_times: meetingTimes.trim() || null,
        location: squadLocation.trim() || null,
        non_members_can_view_posts: type === 'restricted' ? nonMembersCanViewPosts : false,
        ...(avatarPath !== undefined && { avatar_url: avatarPath }),
        ...(coverPath !== undefined && { cover_url: coverPath }),
      })
      // Handle chat toggle
      if (chatEnabled && !squad.chat_enabled) {
        await SquadsService.enableSquadChat(squad.id)
      } else if (!chatEnabled && squad.chat_enabled) {
        await SquadsService.disableSquadChat(squad.id)
      }
      toast.success("Squad updated")
      onSave()
      onClose()
    } catch (e) {
      toast.error((e as Error).message || "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const currentAvatarDisplay = avatarRemoved ? null : (avatarPreview || squad.avatar_url)
  const currentCoverDisplay = coverRemoved ? null : (coverPreview || squad.cover_url)

  return (
    <div className="flex flex-col gap-4">
      {/* Cover */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cover Image</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="relative w-full h-28 rounded-lg overflow-hidden border border-dashed border-border hover:border-primary/30 transition-colors group"
          >
            {currentCoverDisplay ? (
              <img src={currentCoverDisplay} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <ImageIcon className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="size-5 text-white" />
            </div>
          </button>
          {currentCoverDisplay && (
            <button
              type="button"
              onClick={handleRemoveCover}
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
              aria-label="Remove cover"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
      </div>

      {/* Avatar */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Avatar</label>
        <div className="relative w-fit">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative size-16 rounded-full overflow-hidden border border-dashed border-border hover:border-primary/30 transition-colors group"
          >
            {currentAvatarDisplay ? (
              <img src={currentAvatarDisplay} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center bg-secondary">
                <span className="text-lg font-bold text-muted-foreground">{(squad.name || '?').charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="size-4 text-white" />
            </div>
          </button>
          {currentAvatarDisplay && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
              aria-label="Remove avatar"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Squad Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-none" />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
        <div className="rounded-lg border-none bg-secondary focus-within:ring-2 focus-within:ring-primary/50 overflow-hidden">
          <input
            type="text"
            value={descTitle}
            onChange={(e) => setDescTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border"
          />
          <textarea
            value={descBody}
            onChange={(e) => setDescBody(e.target.value)}
            placeholder="Description"
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            rows={3}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Privacy</label>
        <p className="text-xs text-muted-foreground mb-1.5">Controls discover visibility and what others see on your profile. Tap (i) for details.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {(['open', 'restricted', 'private'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setType(p)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                type === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {p === 'open' ? <UsersIcon className="size-3.5" /> : <Lock className="size-3.5" />}
              {p.charAt(0).toUpperCase() + p.slice(1)}
              <SquiggleHoverCard>
                <SquiggleHoverCardTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-sm border-0 bg-transparent p-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${p} privacy details`}
                  >
                    <Info className="size-3 shrink-0 opacity-70" />
                  </button>
                </SquiggleHoverCardTrigger>
                <SquiggleHoverCardContent className="w-[min(17.5rem,calc(100vw-2rem))] whitespace-pre-line">
                  {PRIVACY_DESCRIPTIONS[p]}
                </SquiggleHoverCardContent>
              </SquiggleHoverCard>
            </button>
          ))}
        </div>
      </div>

      {/* Restricted: Allow non-members to view posts (chat always members-only) */}
      {type === 'restricted' && (
        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-foreground">Non-members can view posts</p>
              <p className="text-xs text-muted-foreground">View-only: no posting, replying, or group chat</p>
            </div>
          </div>
          <Switch checked={nonMembersCanViewPosts} onCheckedChange={setNonMembersCanViewPosts} />
        </div>
      )}

      {/* Group Chat */}
      <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Group Chat</p>
        </div>
        <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
      </div>

      {/* Rules */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rules</label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Rules"
          className="w-full resize-none rounded-lg border-none bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
          rows={4}
        />
      </div>

      {/* Meeting Times */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meeting Times</label>
        <Input
          value={meetingTimes}
          onChange={(e) => setMeetingTimes(e.target.value)}
          placeholder="Tuesdays 5pm"
          className="bg-secondary border-none"
        />
      </div>

      {/* Location */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
        <Input
          value={squadLocation}
          onChange={(e) => setSquadLocation(e.target.value)}
          placeholder="Room 201"
          className="bg-secondary border-none"
        />
      </div>

      <Button className="mt-2 w-full" disabled={!name.trim() || saving} onClick={handleSave}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
      </Button>
    </div>
  )
}

function EditSquadModal({ open, onClose, squad, onSave, isMobile }: {
  open: boolean
  onClose: () => void
  squad: Squad
  onSave: () => void
  isMobile: boolean
}) {
  const content = <EditSquadFormContent key={open ? 'open' : 'closed'} squad={squad} onClose={onClose} onSave={onSave} />
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Edit Squad</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }
  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Edit Squad</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
    </div>
  )
}

function EditRulesFormContent({ squad, onClose, onSave }: { squad: Squad; onClose: () => void; onSave: () => void }) {
  const [rules, setRules] = useState(squad.rules || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await SquadsService.updateSquad(squad.id, { rules: rules.trim() || null })
      toast.success("Rules updated")
      onSave()
      onClose()
    } catch (e) {
      toast.error((e as Error).message || "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Community Rules</label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Add rules for your squad..."
          className="w-full resize-none rounded-lg border-none bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
          rows={6}
        />
      </div>
      <Button className="mt-2 w-full" disabled={saving} onClick={handleSave}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  )
}

function EditRulesModal({ open, onClose, squad, onSave, isMobile }: {
  open: boolean
  onClose: () => void
  squad: Squad
  onSave: () => void
  isMobile: boolean
}) {
  const content = <EditRulesFormContent key={open ? 'open' : 'closed'} squad={squad} onClose={onClose} onSave={onSave} />
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Edit Rules</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }
  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Edit Rules</h3>
        <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
    </div>
  )
}

// (Uses PostCard from home-feed for consistent UI)

// ── Squad Detail ──
interface SquadDetailProps {
  squad: Squad
  onBack: () => void
  isMobile: boolean
  userId: string | undefined
  onViewUserProfile?: (authorId: string) => void
  showChat?: boolean
  onShowChatChange?: (v: boolean) => void
  onDetailViewChange?: (inDetail: boolean) => void
}

function SquadDetail({ squad, onBack, isMobile, userId, onViewUserProfile, showChat: showChatProp, onShowChatChange, onDetailViewChange }: SquadDetailProps) {
  const { profile } = useProfile()
  const showSidebar = useShowSidebar()

  const publicHandle = profile?.public_name?.trim().replace(/^@/, "")
  const fullNameInitials = profile?.full_name?.trim()
    ? profile.full_name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?"
  const userInitials = publicHandle ? publicHandle.slice(0, 2).toUpperCase() : fullNameInitials

  const [squadData, setSquadData] = useState<Squad>(squad)
  const [members, setMembers] = useState<SquadMember[]>([])
  const [documents, setDocuments] = useState<SquadDocument[]>([])
  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([])
  const [pinnedPosts, setPinnedPosts] = useState<FeedPostWithAuthor[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [sortAscending, setSortAscending] = useState(false)
  const [mobileTab, setMobileTab] = useState<'feed' | 'about'>('feed')
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [editPost, setEditPost] = useState<FeedPostWithAuthor | null>(null)
  const [deletePostToConfirm, setDeletePostToConfirm] = useState<FeedPostWithAuthor | null>(null)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [addingDoc, setAddingDoc] = useState(false)
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(null)
  const [detailPostSquadContext, setDetailPostSquadContext] = useState<{ squadReadOnly: boolean; squadBanner: { squadName: string; squadType: string } } | null>(null)
  const [sharePost, setSharePost] = useState<FeedPostWithAuthor | null>(null)
  const [shareSquadOpen, setShareSquadOpen] = useState(false)
  const [joinRequests, setJoinRequests] = useState<Array<{ id: string; user_id: string; status: string; created_at: string; profile?: { full_name: string | null; public_name: string | null; avatar_url: string | null } }>>([])
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [squadAvatarError, setSquadAvatarError] = useState(false)
  const [editSquadOpen, setEditSquadOpen] = useState(false)
  const [editRulesOpen, setEditRulesOpen] = useState(false)
  const [removeMember, setRemoveMember] = useState<SquadMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; invitee_id: string; created_at: string; profile: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null }>>([])
  const [deleteDoc, setDeleteDoc] = useState<SquadDocument | null>(null)
  const [showChatLocal, setShowChatLocal] = useState(false)
  const showChat = showChatProp ?? showChatLocal
  const setShowChat = onShowChatChange ?? setShowChatLocal
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [hideChatOpen, setHideChatOpen] = useState(false)
  const [squadChatMuted, setSquadChatMuted] = useState(false)

  useEffect(() => {
    onDetailViewChange?.(!!detailPost)
    return () => onDetailViewChange?.(false)
  }, [detailPost, onDetailViewChange])

  const showNonMemberWall =
    (squadData.type === 'private' && userId && !squadData.is_joined) ||
    (squadData.type === 'restricted' && userId && !squadData.is_joined && !squadData.non_members_can_view_posts)

  const loadSquad = useCallback(async () => {
    try {
      const s = await SquadsService.getSquad(squad.id)
      setSquadData((prev) => ({
        ...s,
        // Keep existing signed URLs to avoid cover/avatar reload when merging getSquad result
        avatar_url: prev.avatar_url?.startsWith('http') ? prev.avatar_url : s.avatar_url,
        cover_url: prev.cover_url?.startsWith('http') ? prev.cover_url : s.cover_url,
      }))
      if (s.conversation_id) {
        const muted = await MessagingService.getMuteStateForConversation(s.conversation_id)
        setSquadChatMuted(muted)
      }
    } catch {
      setSquadData(squad)
    }
  }, [squad.id])

  const loadAll = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [pinned, allPosts, mems, docs, reqs, pending] = await Promise.all([
        FeedService.listPinnedPostsForSquad(squad.id, userId),
        FeedService.listPostsForSquad(squad.id, userId),
        SquadsService.getSquadMembers(squad.id),
        SquadsService.getSquadDocuments(squad.id),
        SquadsService.getSquadJoinRequests(squad.id),
        SquadsService.getPendingInvitesForSquad(squad.id),
      ])
      setPinnedPosts(pinned)
      const pinnedIds = new Set(pinned.map((p) => p.id))
      setPosts(allPosts.filter((p) => !pinnedIds.has(p.id)))
      setMembers(mems)
      setDocuments(docs)
      setJoinRequests(reqs)
      setPendingInvites(pending)
    } catch {
      setPosts([])
      setPinnedPosts([])
      setMembers([])
      setDocuments([])
      setJoinRequests([])
      setPendingInvites([])
    } finally {
      setLoading(false)
    }
  }, [squad.id, userId])

  useEffect(() => {
    loadSquad()
  }, [loadSquad])

  useEffect(() => {
    setSquadAvatarError(false)
  }, [squad.id, squadData.avatar_url])

  const fetchChatUnreadCount = useCallback(async () => {
    if (!squadData.conversation_id) return
    try {
      const count = await MessagingService.getUnreadCountForConversation(squadData.conversation_id)
      setChatUnreadCount(count)
    } catch {
      setChatUnreadCount(0)
    }
  }, [squadData.conversation_id])


  useEffect(() => {
    fetchChatUnreadCount()
  }, [fetchChatUnreadCount])


  useEffect(() => {
    if (!squadData.conversation_id) return
    const channel = MessagingService.subscribeToConversationMessages(squadData.conversation_id, fetchChatUnreadCount)
    return () => MessagingService.unsubscribeFromConversationMessages(channel)
  }, [squadData.conversation_id, fetchChatUnreadCount])

  useEffect(() => {
    if (!showChat && squadData.conversation_id) fetchChatUnreadCount()
  }, [showChat, squadData.conversation_id, fetchChatUnreadCount])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const canViewFeed =
    squadData.is_joined ||
    squadData.type === 'open' ||
    (squadData.type === 'restricted' && !!squadData.non_members_can_view_posts)
  useEffect(() => {
    if (!canViewFeed) return
    const chPosts = FeedService.subscribeToFeedPosts(squad.id, loadAll)
    const chAux = FeedService.subscribeToFeedAuxiliary(squad.id, loadAll)
    return () => {
      FeedService.unsubscribeFromFeedPosts(chPosts)
      chAux.unsubscribe()
    }
  }, [squad.id, canViewFeed, loadAll])

  const handleJoin = async () => {
    if (!userId) return
    try {
      await SquadsService.joinSquad(squad.id)
      await loadSquad()
      await loadAll()
      toast.success('Joined squad')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to join')
    }
  }

  const handleRequestToJoin = async () => {
    if (!userId) return
    try {
      await SquadsService.requestToJoinSquad(squad.id)
      await loadSquad()
      toast.success('Request sent. Check Notifications for the response.')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to send request')
    }
  }

  const handleLeave = async () => {
    await SquadsService.leaveSquad(squad.id)
    onBack()
    toast.success('Left squad')
  }

  const handleDelete = async () => {
    await SquadsService.deleteSquad(squad.id)
    onBack()
    toast.success('Squad deleted')
  }

  const handleEditPost = (p: FeedPostWithAuthor) => {
    setEditPost(p)
    if (isMobile) setNewPostOpen(true)
  }

  const handleCreateOrEditPost = async (
    title: string,
    content: string | null,
    imageFile?: File | null,
    url?: string | null,
    pollOptions?: string[]
  ) => {
    if (!userId) { toast.error('Please sign in to post.'); return }
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
        await loadAll()
        if (detailPost?.id === editPost.id) { setDetailPost(null); setDetailPostSquadContext(null) }
        setEditPost(null)
        setNewPostOpen(false)
        toast.success('Post updated')
      } catch {
        toast.error('Failed to update post')
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
        source_type: 'squad',
        source_id: squad.id,
        post_type: 'post',
        title,
        content,
        url: url?.trim() || null,
        poll_options: opts && opts.length >= 2 ? opts.map((text, i) => ({ option_text: text, sort_order: i })) : undefined,
      })
      if (imageFile) {
        const imagePath = await FeedService.uploadPostImage(userId, post.id, imageFile)
        await FeedService.updatePost(post.id, userId, { image_path: imagePath })
      }
      await loadAll()
      setNewPostOpen(false)
      toast.success('Posted')
    } catch {
      toast.error('Failed to post')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleAddDocument = async (name: string, file: File) => {
    setAddingDoc(true)
    try {
      await SquadsService.uploadAndAddSquadDocument(squad.id, file, name)
      await loadAll()
      toast.success('Document added')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to add document')
    } finally {
      setAddingDoc(false)
    }
  }

  const handleOpenPost = useCallback((post: FeedPostWithAuthor) => {
    setDetailPost(post)
    setDetailPostSquadContext(
      squadData.is_joined ? null : { squadReadOnly: true, squadBanner: { squadName: squadData.name, squadType: squadData.type } }
    )
  }, [squadData.is_joined, squadData.name, squadData.type])

  const handleHeartPost = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    if (!squadData.is_joined) {
      toast.error("You can't interact with this post because you're not in the squad.")
      return
    }
    try {
      await FeedService.toggleHeartPost(post.id, userId)
      await loadAll()
    } catch {
      toast.error('Failed to heart')
    }
  }

  const handleBookmarkPost = async (post: FeedPostWithAuthor) => {
    if (!userId) return
    try {
      await FeedService.togglePinPost(post.id, userId)
      await loadAll()
    } catch {
      toast.error('Failed to bookmark')
    }
  }

  const handleToggleSquadPin = async (post: FeedPostWithAuthor) => {
    if (!userId || !squadData.is_admin) return
    try {
      const isPinned = pinnedPosts.some((p) => p.id === post.id)
      if (isPinned) {
        await SquadsService.unpinSquadPost(squad.id, post.id)
        toast.success('Unpinned from squad')
      } else {
        await SquadsService.pinSquadPost(squad.id, post.id)
        toast.success('Pinned to squad')
      }
      await loadAll()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update pin')
    }
  }

  const handleDeletePost = async () => {
    if (!userId || !deletePostToConfirm) return
    try {
      await FeedService.deletePost(deletePostToConfirm.id, userId)
      if (detailPost?.id === deletePostToConfirm.id) { setDetailPost(null); setDetailPostSquadContext(null) }
      setDeletePostToConfirm(null)
      await loadAll()
      toast.success('Post deleted')
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!userId) return
    try {
      await FeedService.reportPost(postId, userId)
      toast.success('Post reported')
    } catch {
      toast.error('Failed to report')
    }
  }

  const handlePollVote = (post: FeedPostWithAuthor, optionId: string, phase: "before" | "after") => {
    if (phase === "after") return
    const prevOptionId = post.current_user_vote_option_id ?? null
    const updateList = (list: FeedPostWithAuthor[]) =>
      list.map((p) => {
        if (p.id !== post.id || !p.poll_options) return p
        return {
          ...p,
          current_user_vote_option_id: optionId,
          poll_options: p.poll_options.map((o) => ({
            ...o,
            vote_count:
              o.id === optionId
                ? (o.vote_count ?? 0) + 1
                : o.id === prevOptionId
                  ? Math.max(0, (o.vote_count ?? 0) - 1)
                  : o.vote_count,
          })),
        }
      })
    setPosts((prev) => updateList(prev))
    setPinnedPosts((prev) => updateList(prev))
    return () => {
      const revertList = (list: FeedPostWithAuthor[]) =>
        list.map((p) => {
          if (p.id !== post.id || !p.poll_options) return p
          return {
            ...p,
            current_user_vote_option_id: prevOptionId,
            poll_options: p.poll_options.map((o) => ({
              ...o,
              vote_count:
                o.id === optionId
                  ? Math.max(0, (o.vote_count ?? 0) - 1)
                  : o.id === prevOptionId
                    ? (o.vote_count ?? 0) + 1
                    : o.vote_count,
            })),
          }
        })
      setPosts((prev) => revertList(prev))
      setPinnedPosts((prev) => revertList(prev))
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await SquadsService.approveSquadJoinRequest(requestId)
      await loadAll()
      await loadSquad()
      toast.success('Request approved')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to approve')
    }
  }

  const handleDenyRequest = async (requestId: string) => {
    try {
      await SquadsService.denySquadJoinRequest(requestId)
      await loadAll()
      toast.success('Request denied')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to deny')
    }
  }

  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null)
  const handleCancelInvite = async (inviteId: string) => {
    setCancelInviteId(inviteId)
    try {
      await SquadsService.cancelSquadInvite(inviteId)
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId))
      toast.success('Invite cancelled')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to cancel invite')
    } finally {
      setCancelInviteId(null)
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

  const coverBg = squadData.cover_url
    ? { backgroundImage: `url(${squadData.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: quadAvatarColor(squad.id) }

  // Desktop right sidebar / chat sidebar content (used in main layout and desktop chat layout)
  const sidebarContent = (
    <div className="flex flex-col gap-4">
      {/* Chat + Share + Invite (hidden on mobile; shown next to Feed/About toggles) */}
      {showSidebar && userId && (squadData.is_joined || canViewFeed) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {squadData.is_joined ? (squadData.conversation_id && squadData.chat_enabled ? (
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="relative flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <MessagesSquare className="size-3.5" />
              Chat
              {chatUnreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 flex size-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              ) : squadChatMuted ? (
                <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground" aria-label="Muted">
                  <VolumeX className="size-4" />
                </span>
              ) : null}
            </button>
          ) : squadData.is_admin ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await SquadsService.enableSquadChat(squadData.id)
                  await loadSquad()
                  toast.success('Group chat enabled')
                } catch (e) {
                  toast.error((e as Error).message || 'Failed to enable chat')
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <MessagesSquare className="size-3.5" /> Enable Chat
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  onClick={() => toast.info("Group chat isn't enabled")}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1.5 text-xs font-medium cursor-default"
                >
                  <MessagesSquare className="size-3.5" /> Chat
                </span>
              </TooltipTrigger>
              <TooltipContent>Group chat isn&apos;t enabled</TooltipContent>
            </Tooltip>
          )) : canViewFeed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="flex items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1.5 text-xs font-medium cursor-default"
                >
                  <MessagesSquare className="size-3.5" /> Chat
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {squadData.type === 'open' ? 'Join to access chat' : 'Request to join to access chat'}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {canViewFeed && squadData.type !== 'private' && (
            <button
              type="button"
              onClick={() => setShareSquadOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Forward className="size-3.5" /> Share
            </button>
          )}
          {squadData.is_joined && (squadData.type === 'open' || ((squadData.type === 'restricted' || squadData.type === 'private') && squadData.is_admin)) && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="size-3.5" /> Invite
            </button>
          )}
        </div>
      )}

      {/* About */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-foreground">About</h3>
          {userId && squadData.is_joined && (
            <Badge variant="outline" className="text-xs px-3 py-1.5 rounded-full text-primary border-primary/30 shrink-0">Joined</Badge>
          )}
        </div>
        <SquadDescription info={squadData.info} className="text-sm" />
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <UsersIcon className="size-3" /> {squadData.member_count ?? 0} {(squadData.member_count ?? 0) === 1 ? 'member' : 'members'}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare className="size-3" /> {squadData.post_count ?? 0} {(squadData.post_count ?? 0) === 1 ? 'post' : 'posts'}
          </span>
          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            {CATEGORY_LABELS[squadData.category] || squadData.category}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {squadData.created_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0" />
              Created {new Date(squadData.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {squadData.meeting_times && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 shrink-0" />
              {squadData.meeting_times}
            </span>
          )}
          {squadData.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0" />
              {squadData.location}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {squadData.is_admin && (
            <button
              type="button"
              onClick={() => setEditSquadOpen(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <Settings2 className="size-3" /> Configure Squad
            </button>
          )}
          <SquiggleHoverCard>
            <SquiggleHoverCardTrigger asChild>
              <button
                type="button"
                className="inline-flex ml-auto cursor-help border-0 bg-transparent p-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Squad privacy type"
              >
                <Badge variant="outline" className="text-xs inline-flex items-center gap-0.5">
                  {squadData.type === 'open' ? <UsersIcon className="size-2.5 shrink-0" /> : <Lock className="size-2.5 shrink-0" />}
                  {squadData.type === 'private' ? 'Private' : squadData.type === 'restricted' ? 'Restricted' : 'Open'}
                </Badge>
              </button>
            </SquiggleHoverCardTrigger>
            <SquiggleHoverCardContent className="w-[min(13.75rem,calc(100vw-2rem))] [text-wrap:normal]">
              {PRIVACY_BADGE_TOOLTIPS[squadData.type]}
            </SquiggleHoverCardContent>
          </SquiggleHoverCard>
        </div>
      </div>

      {/* Community Rules */}
      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen} className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors rounded-xl">
          <span className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            Community Rules
            {squadData.is_admin && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditRulesOpen(true) }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                aria-label="Edit rules"
              >
                <Pencil className="size-3" />
                Edit
              </button>
            )}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", rulesOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            {squadData.rules?.trim() ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{squadData.rules}</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                This squad doesn&apos;t have any rules right now. Please be respectful and kind to others.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Documents */}
      {squadData.is_joined && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Documents {documents.length > 0 && `(${documents.length})`}
          </h3>
          {documents.length > 0 ? (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => {
                const hasFile = !!(doc.file_url || doc.file_path)
                const handleDownload = hasFile ? async (e: React.MouseEvent) => {
                  e.preventDefault()
                  try {
                    const res = await fetch(doc.file_url!)
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = doc.name || 'document'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    window.open(doc.file_url!, '_blank')
                  }
                } : undefined
                return (
                  <div key={doc.id} className="flex items-center gap-2 group/doc">
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    {hasFile ? (
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="text-xs text-foreground truncate flex-1 hover:text-primary transition-colors text-left"
                      >
                        {doc.name}
                      </button>
                    ) : (
                      <span className="text-xs text-foreground truncate flex-1">{doc.name}</span>
                    )}
                    {squadData.is_admin && (
                      <button
                        type="button"
                        onClick={() => setDeleteDoc(doc)}
                        className="md:opacity-0 md:group-hover/doc:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No documents</p>
          )}
          {squadData.is_admin && (
            <button
              type="button"
              onClick={() => setAddDocOpen(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="size-3" /> Add Document
            </button>
          )}
        </div>
      )}

      {/* Sent invites (admins: always show) */}
      {squadData.is_admin && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Clock className="size-4 text-muted-foreground" />
            Sent invites ({pendingInvites.length})
          </h3>
          <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
            {pendingInvites.length > 0 ? (
              pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2.5">
                  <Avatar className="size-7 shrink-0">
                    {inv.profile?.avatar_url && <AvatarImage src={inv.profile.avatar_url} alt="" />}
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {(inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {inv.profile?.public_name?.trim() || inv.profile?.full_name?.trim() || 'Unknown'} — awaiting response
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 shrink-0 text-xs"
                    disabled={cancelInviteId === inv.id}
                    onClick={() => handleCancelInvite(inv.id)}
                    aria-label="Cancel invite"
                  >
                    {cancelInviteId === inv.id ? <Loader2 className="size-3 animate-spin" /> : <><X className="size-3" /> Cancel invite</>}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No pending invites</p>
            )}
          </div>
        </div>
      )}

      {/* Pending requests (restricted admins: always show) */}
      {squadData.type === 'restricted' && squadData.is_admin && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <UsersIcon className="size-4 text-muted-foreground" />
            Join requests ({joinRequests.length})
          </h3>
          <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
            {joinRequests.length > 0 ? (
              joinRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-7 shrink-0">
                      {req.profile?.avatar_url && <AvatarImage src={req.profile.avatar_url} alt="" />}
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                        {(req.profile?.public_name?.trim() || req.profile?.full_name?.trim() || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-foreground truncate">
                      {req.profile?.public_name?.trim() || req.profile?.full_name?.trim() || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleDenyRequest(req.id)} aria-label="Deny" className="h-7 px-2">
                      <X className="size-3" />
                    </Button>
                    <Button size="sm" onClick={() => handleApproveRequest(req.id)} aria-label="Approve" className="h-7 px-2">
                      <Check className="size-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No pending requests</p>
            )}
          </div>
        </div>
      )}

      {/* Members — hidden from non-members of private/restricted squads */}
      {(squadData.is_joined || squadData.type === 'open') && (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UsersIcon className="size-4 text-muted-foreground" />
            {(squadData.member_count ?? 0) === 1 ? 'Member' : 'Members'} ({squadData.member_count ?? 0})
          </h3>
        </div>
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 group/member">
              {onViewUserProfile && m.user_id !== userId ? (
                <button
                  type="button"
                  onClick={() => onViewUserProfile(m.user_id)}
                  className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
                  aria-label={`View ${displayName(m)}'s profile`}
                >
                  <Avatar className="size-7">
                    {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt="" />}
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {initials(m)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <Avatar className="size-7 shrink-0">
                  {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt="" />}
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                    {initials(m)}
                  </AvatarFallback>
                </Avatar>
              )}
              {onViewUserProfile && m.user_id !== userId ? (
                <button
                  type="button"
                  onClick={() => onViewUserProfile(m.user_id)}
                  className="text-xs text-foreground truncate flex-1 text-left hover:underline"
                >
                  {displayName(m)}
                </button>
              ) : (
                <span className="text-xs text-foreground truncate flex-1">{displayName(m)}</span>
              )}
              {m.role === 'admin' && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30 px-1.5 py-0">
                  <Crown className="size-2 mr-0.5" /> Admin
                </Badge>
              )}
              {squadData.is_admin && m.role !== 'admin' && m.user_id !== userId && (
                <button
                  type="button"
                  onClick={() => setRemoveMember(m)}
                  className="md:opacity-0 md:group-hover/member:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                  aria-label={`Remove ${displayName(m)}`}
                >
                  <UserMinus className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">No members yet</p>
          )}
        </div>
      </div>
      )}

      {/* Actions */}
      {squadData.is_joined && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              if (squadData.is_admin) {
                toast.error("You're the only admin. Delete the squad to leave.")
                return
              }
              setLeaveOpen(true)
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-xs transition-colors",
              squadData.is_admin
                ? "text-muted-foreground cursor-not-allowed opacity-60"
                : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            )}
          >
            <LogOut className="size-3.5" /> Leave Squad
          </button>
          {squadData.is_admin && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-3.5" /> Delete Squad
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (showChat && squadData.conversation_id && userId) {
    if (isMobile) {
      return (
        <>
          <ConfirmPopup
            open={hideChatOpen}
            onClose={() => setHideChatOpen(false)}
            title="Hide this squad chat?"
            description="This will hide the squad chat from your Messages list. You'll see it again if someone messages."
            confirmLabel="Hide"
            onConfirm={async () => {
              if (!squadData.conversation_id) return
              await MessagingService.hideConversation(squadData.conversation_id)
              setShowChat(false)
              setHideChatOpen(false)
              toast.success('Chat hidden')
            }}
            isMobile={isMobile}
            errorMessage="Failed to hide"
          />
          <div
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 flex flex-col bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3 z-10">
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
                aria-label="Back to squad"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate rounded-2xl bg-white/50 backdrop-blur-md px-3 py-1 shadow-[0_0_12px_rgba(0,0,0,0.08)] dark:bg-black/50">
                  {squadData.name}
                </p>
                <div className="flex shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
                      aria-label="Settings"
                    >
                      <Settings className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border-border">
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          const nowMuted = await MessagingService.toggleMuteConversation(squadData.conversation_id!)
                          setSquadChatMuted(nowMuted)
                          toast.success(nowMuted ? 'Notifications muted' : 'Notifications unmuted')
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to toggle mute')
                        }
                      }}
                    >
                      {squadChatMuted ? (
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setHideChatOpen(true)}>
                      <EyeOff className="size-4" />
                      Hide chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <ChatView
                conversationId={squadData.conversation_id}
                otherDisplayName={squadData.name}
                otherAvatarUrl={squadData.avatar_url}
                isGroup
                currentUserId={userId ?? null}
                onBack={() => setShowChat(false)}
                embedded
                embeddedWithOverlay
                squadChat
                muted={squadChatMuted}
                onMuteToggle={async () => {
                  try {
                    const nowMuted = await MessagingService.toggleMuteConversation(squadData.conversation_id!)
                    setSquadChatMuted(nowMuted)
                    toast.success(nowMuted ? 'Notifications muted' : 'Notifications unmuted')
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed to toggle mute')
                  }
                }}
                onDeleteGroup={() => setHideChatOpen(true)}
              />
            </div>
          </div>
        </>
      )
    }
    return (
      <>
        <EditSquadModal
          open={editSquadOpen}
          onClose={() => setEditSquadOpen(false)}
          squad={squadData}
          onSave={() => { loadSquad(); loadAll() }}
          isMobile={isMobile}
        />
        <EditRulesModal
          open={editRulesOpen}
          onClose={() => setEditRulesOpen(false)}
          squad={squadData}
          onSave={() => loadSquad()}
          isMobile={isMobile}
        />
        <AddDocumentModal
          open={addDocOpen}
          onClose={() => setAddDocOpen(false)}
          squadId={squad.id}
          onSubmit={handleAddDocument}
          submitting={addingDoc}
          isMobile={isMobile}
        />
        <ConfirmPopup
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          title={`Leave ${squadData.name}?`}
          description="You'll no longer see posts from this squad in your feed. You can rejoin anytime."
          confirmLabel="Leave Squad"
          confirmClassName="bg-warning text-warning-foreground hover:bg-warning/90"
          onConfirm={handleLeave}
          isMobile={isMobile}
          errorMessage="Failed to leave"
        />
        <DeleteSquadDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} squadName={squadData.name} onConfirm={handleDelete} />
        <ConfirmPopup
          open={!!removeMember}
          onClose={() => setRemoveMember(null)}
          title={`Remove ${removeMember ? displayName(removeMember) : ''}?`}
          description="They will no longer be able to see posts or participate in this squad. They can rejoin or request to join again."
          confirmLabel="Remove"
          confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onConfirm={async () => {
            if (!removeMember) return
            await SquadsService.removeSquadMember(squad.id, removeMember.user_id)
            toast.success(`${displayName(removeMember)} has been removed`)
            setRemoveMember(null)
            loadAll()
            loadSquad()
          }}
          isMobile={isMobile}
          errorMessage="Failed to remove member"
        />
        <InviteSquadSheet
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          squadId={squad.id}
          squadName={squadData.name}
          memberIds={members.map((m) => m.user_id)}
          currentUserId={userId ?? null}
          onInvited={() => { loadSquad(); loadAll() }}
          isMobile={isMobile}
        />
        <ConfirmPopup
          open={!!deleteDoc}
          onClose={() => setDeleteDoc(null)}
          title={deleteDoc ? `Delete "${deleteDoc.name}"?` : 'Delete document?'}
          description="This document and its file will be permanently deleted."
          confirmLabel="Delete"
          confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onConfirm={async () => {
            if (!deleteDoc) return
            await SquadsService.deleteSquadDocument(squad.id, deleteDoc.id)
            toast.success('Document deleted')
            setDeleteDoc(null)
            loadAll()
          }}
          isMobile={isMobile}
          errorMessage="Failed to delete document"
        />
        <ConfirmPopup
          open={hideChatOpen}
          onClose={() => setHideChatOpen(false)}
          title="Hide this squad chat?"
          description="This will hide the squad chat from your Messages list. You'll see it again if someone messages."
          confirmLabel="Hide"
          onConfirm={async () => {
            if (!squadData.conversation_id) return
            await MessagingService.hideConversation(squadData.conversation_id)
            setShowChat(false)
            setHideChatOpen(false)
            toast.success('Chat hidden')
          }}
          isMobile={isMobile}
          errorMessage="Failed to hide"
        />
        <div className="flex flex-1 min-w-0 relative flex-col overflow-hidden">
          <div className="absolute top-0 left-0 right-0 flex items-center gap-2 pl-6 pr-4 py-3 z-10">
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
              aria-label="Back to squad"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate rounded-2xl bg-white/50 backdrop-blur-md px-3 py-1 shadow-[0_0_12px_rgba(0,0,0,0.08)] dark:bg-black/50">
                {squadData.name}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex size-9 shrink-0 items-center justify-center rounded-[50%] bg-white/50 backdrop-blur-md text-muted-foreground hover:bg-white/70 hover:text-foreground shadow-[0_0_12px_rgba(0,0,0,0.08)] transition-colors dark:bg-black/50 dark:hover:bg-black/70"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-border">
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const nowMuted = await MessagingService.toggleMuteConversation(squadData.conversation_id!)
                      setSquadChatMuted(nowMuted)
                      toast.success(nowMuted ? 'Notifications muted' : 'Notifications unmuted')
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to toggle mute')
                    }
                  }}
                >
                  {squadChatMuted ? (
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setHideChatOpen(true)}>
                  <EyeOff className="size-4" />
                  Hide chat
                </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ChatView
            conversationId={squadData.conversation_id}
            otherDisplayName={squadData.name}
            otherAvatarUrl={squadData.avatar_url}
            isGroup
            currentUserId={userId ?? null}
            onBack={() => setShowChat(false)}
            embedded
            embeddedWithOverlay
            squadChat
            muted={squadChatMuted}
            onMuteToggle={async () => {
              try {
                const nowMuted = await MessagingService.toggleMuteConversation(squadData.conversation_id!)
                setSquadChatMuted(nowMuted)
                toast.success(nowMuted ? 'Notifications muted' : 'Notifications unmuted')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to toggle mute')
              }
            }}
            onDeleteGroup={() => setHideChatOpen(true)}
          />
        </div>
      </>
    )
  }

  if (detailPost) {
    return (
      <>
        <SharePostModal
          open={!!sharePost}
          onClose={() => setSharePost(null)}
          post={sharePost}
          onShareSuccess={(postId, added) => {
            setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
            setPinnedPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
            setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
          }}
        />
        <NewPostModal
          open={newPostOpen && isMobile}
          onClose={() => { setNewPostOpen(false); setEditPost(null) }}
          isMobile={isMobile}
          onSubmit={handleCreateOrEditPost}
          authorId={userId ?? ''}
          userInitials={userInitials}
          submitting={submittingPost}
          editPost={editPost}
        />
        <div className="mx-auto w-full max-w-6xl h-full flex flex-col min-h-0 min-w-0 px-4 md:px-6 overflow-x-hidden">
          <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
            <div className="flex-1 max-w-2xl mx-auto lg:mx-0 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
            <PostDetailView
              post={detailPost}
              userId={userId}
              currentUserInitials={userInitials}
              isMobile={isMobile}
              onBack={() => { setDetailPost(null); setDetailPostSquadContext(null); loadAll() }}
              backLabel={`Back to ${squadData.name}`}
              squadReadOnly={detailPostSquadContext?.squadReadOnly}
              squadBanner={detailPostSquadContext?.squadBanner}
              onGoToSquad={detailPost.source_type === "squad" && detailPost.source_id ? () => { setDetailPost(null); setDetailPostSquadContext(null) } : undefined}
              onEditPost={handleEditPost}
              onDeletePost={(p) => setDeletePostToConfirm(p)}
              onReportPost={handleReportPost}
              onSharePost={(p) => setSharePost(p)}
              onOpenUserProfile={onViewUserProfile}
              editPost={editPost}
              deletePostToConfirm={deletePostToConfirm}
              onConfirmDeletePost={handleDeletePost}
              onCancelDeletePost={() => setDeletePostToConfirm(null)}
              onCancelEditPost={() => { setEditPost(null); setNewPostOpen(false) }}
              onSubmitPost={handleCreateOrEditPost}
              submittingPost={submittingPost}
            />
          </div>
          {showSidebar && (
            <aside className="hidden md:block w-72 shrink-0 min-h-0 pt-4 pb-nav-safe md:pb-8 overflow-y-auto">
              <div className="sticky top-4">
                {sidebarContent}
              </div>
            </aside>
          )}
          </div>
        </div>
      </>
    )
  }

  // Shared PostCard props builder
  const postCardProps = (post: FeedPostWithAuthor, pinned: boolean) => ({
    post,
    userId,
    onLike: () => handleHeartPost(post),
    onBookmark: () => handleBookmarkPost(post),
    onOpenDetail: () => handleOpenPost(post),
    onVote: (optionId: string, phase: "before" | "after") => handlePollVote(post, optionId, phase),
    onEditPost: handleEditPost,
    onDeletePost: (p: FeedPostWithAuthor) => setDeletePostToConfirm(p),
    onReportPost: handleReportPost,
    onSharePost: (p: FeedPostWithAuthor) => setSharePost(p),
    onOpenUserProfile: userId && post.author_id !== userId ? onViewUserProfile : undefined,
    onPinToSquad: squadData.is_admin ? handleToggleSquadPin : undefined,
    isPinnedToSquad: pinned,
    deletePostToConfirm,
    onConfirmDeletePost: handleDeletePost,
    onCancelDeletePost: () => setDeletePostToConfirm(null),
    editPost,
    onSubmitPost: handleCreateOrEditPost,
    onCancelEditPost: () => { setEditPost(null); setNewPostOpen(false) },
    submittingPost,
    userInitials,
    isMobile,
  } as const)

  return (
    <div className="flex flex-col">
      <EditSquadModal
        open={editSquadOpen}
        onClose={() => setEditSquadOpen(false)}
        squad={squadData}
        onSave={() => { loadSquad(); loadAll() }}
        isMobile={isMobile}
      />
      <EditRulesModal
        open={editRulesOpen}
        onClose={() => setEditRulesOpen(false)}
        squad={squadData}
        onSave={() => loadSquad()}
        isMobile={isMobile}
      />
      <AddDocumentModal
        open={addDocOpen}
        onClose={() => setAddDocOpen(false)}
        squadId={squad.id}
        onSubmit={handleAddDocument}
        submitting={addingDoc}
        isMobile={isMobile}
      />
      <ConfirmPopup
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={`Leave ${squadData.name}?`}
        description="You'll no longer see posts from this squad in your feed. You can rejoin anytime."
        confirmLabel="Leave Squad"
        confirmClassName="bg-warning text-warning-foreground hover:bg-warning/90"
        onConfirm={handleLeave}
        isMobile={isMobile}
        errorMessage="Failed to leave"
      />
      <DeleteSquadDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} squadName={squadData.name} onConfirm={handleDelete} />
      <ConfirmPopup
        open={!!removeMember}
        onClose={() => setRemoveMember(null)}
        title={`Remove ${removeMember ? displayName(removeMember) : ''}?`}
        description="They will no longer be able to see posts or participate in this squad. They can rejoin or request to join again."
        confirmLabel="Remove"
        confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={async () => {
          if (!removeMember) return
          await SquadsService.removeSquadMember(squad.id, removeMember.user_id)
          toast.success(`${displayName(removeMember)} has been removed`)
          setRemoveMember(null)
          loadAll()
          loadSquad()
        }}
        isMobile={isMobile}
        errorMessage="Failed to remove member"
      />
      <SharePostModal
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
        onShareSuccess={(postId, added) => {
          setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setPinnedPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
        }}
      />
      <ShareSquadModal
        open={shareSquadOpen}
        onClose={() => setShareSquadOpen(false)}
        squad={shareSquadOpen ? { id: squadData.id, name: squadData.name, type: squadData.type, member_count: squadData.member_count, post_count: squadData.post_count, category: squadData.category, avatar_path: squadData.avatar_path, created_at: squadData.created_at } : null}
      />
      <InviteSquadSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        squadId={squad.id}
        squadName={squadData.name}
        memberIds={members.map((m) => m.user_id)}
        currentUserId={userId ?? null}
        onInvited={() => { loadSquad(); loadAll() }}
        isMobile={isMobile}
      />
      <ConfirmPopup
        open={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title={deleteDoc ? `Delete "${deleteDoc.name}"?` : 'Delete document?'}
        description="This document and its file will be permanently deleted."
        confirmLabel="Delete"
        confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={async () => {
          if (!deleteDoc) return
          await SquadsService.deleteSquadDocument(squad.id, deleteDoc.id)
          toast.success('Document deleted')
          setDeleteDoc(null)
          loadAll()
        }}
        isMobile={isMobile}
        errorMessage="Failed to delete document"
      />

      {/* Squad Header */}
      <div className="relative overflow-visible">
        <div className={cn("h-24 md:h-32 rounded-xl", !squadData.cover_url && "opacity-30")} style={coverBg} />
        {squadData.cover_url && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-background/75 via-background/30 to-transparent" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
          <button
            onClick={onBack}
            className="absolute top-2 left-4 md:top-4 flex size-8 items-center justify-center rounded-lg bg-background/80 text-foreground hover:bg-background transition-colors backdrop-blur-sm"
            aria-label="Back to squads"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-end gap-4 translate-y-16">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold ring-4 ring-background bg-primary text-primary-foreground">
              {squadData.avatar_url && !squadAvatarError ? (
                <img
                  src={squadData.avatar_url}
                  alt=""
                  className="size-full object-cover"
                  onError={() => setSquadAvatarError(true)}
                />
              ) : (
                <span>{(squadData.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap translate-y-3 -translate-x-1">
                <h2 className={pageMainTitleClass}>{squadData.name}</h2>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {userId && !squadData.is_joined && squadData.type === 'open' && (
                <Button size="sm" onClick={handleJoin}>Join Squad</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restricted/Private non-member wall (restricted with non_members_can_view_posts shows feed instead) */}
      {showNonMemberWall && (
        <>
          <div className="mt-20 flex justify-center">
            {squadData.type === 'private' ? (
              <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
                <Lock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">This is a private squad — invite only</span>
              </div>
            ) : squadData.join_request_status === 'pending' ? (
              <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Request sent — waiting for approval</span>
              </div>
            ) : (
              <Button onClick={handleRequestToJoin} size="lg" className="rounded-full px-6">
                {squadData.join_request_status === 'denied' ? 'Request again' : 'Request to join'}
              </Button>
            )}
          </div>
          <div className="mt-6 relative">
            <div className="blur-md pointer-events-none select-none rounded-xl overflow-hidden min-h-[400px] bg-secondary/50">
              <div className="p-6 space-y-4">
                <div className="h-10 bg-muted/50 rounded-lg w-3/4" />
                <div className="h-24 bg-muted/50 rounded-xl" />
                <div className="h-24 bg-muted/50 rounded-xl" />
                <div className="h-24 bg-muted/50 rounded-xl" />
                <div className="h-32 bg-muted/50 rounded-xl w-1/2" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Feed / About tabs when sidebar is hidden (below md breakpoint) */}
      {!showSidebar && !showNonMemberWall && (
        <div className="mt-20 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
            {(["feed", "about"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  mobileTab === tab
                    ? "bg-accent text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground active:bg-accent/50"
                )}
              >
                {tab === "feed" ? "Feed" : (squadData.is_admin ? "About & Settings" : "About")}
              </button>
            ))}
          </div>
          {((userId && squadData.is_joined) || canViewFeed) && (
            <div className="flex items-center gap-2 shrink-0">
              {squadData.is_joined ? (squadData.conversation_id && squadData.chat_enabled ? (
                <button
                  type="button"
                  onClick={() => setShowChat(true)}
                  className="relative flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <MessagesSquare className="size-3.5" />
                  Chat
                  {chatUnreadCount > 0 ? (
                    <span className="absolute -right-2 -top-2 flex size-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                      {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                    </span>
                  ) : squadChatMuted ? (
                    <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground" aria-label="Muted">
                      <VolumeX className="size-4" />
                    </span>
                  ) : null}
                </button>
              ) : squadData.is_admin ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await SquadsService.enableSquadChat(squadData.id)
                      await loadSquad()
                      toast.success('Group chat enabled')
                    } catch (e) {
                      toast.error((e as Error).message || 'Failed to enable chat')
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <MessagesSquare className="size-3.5" /> Enable Chat
                </button>
              ) : (
                <span
                  onClick={() => toast.info("Group chat isn't enabled")}
                  className="flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1.5 text-xs font-medium cursor-default"
                >
                  <MessagesSquare className="size-3.5" /> Chat
                </span>
              )) : canViewFeed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1.5 text-xs font-medium cursor-default"
                    >
                      <MessagesSquare className="size-3.5" /> Chat
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {squadData.type === "open" ? "Join to access chat" : "Request to join to access chat"}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {canViewFeed && squadData.type !== 'private' && (
                <button
                  type="button"
                  onClick={() => setShareSquadOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Forward className="size-3.5" /> Share
                </button>
              )}
              {squadData.is_joined && (squadData.type === 'open' || ((squadData.type === 'restricted' || squadData.type === 'private') && squadData.is_admin)) && (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="size-3.5" /> Invite
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Two-column layout when sidebar visible; single column with tab switch when sidebar hidden */}
      {!showNonMemberWall && (
      <div className={cn(!showSidebar ? "mt-4" : "mt-20", !showSidebar ? "flex flex-col" : "flex gap-6")}>
        {/* Feed column: when sidebar visible always; when tabs, only when Feed tab */}
        {(showSidebar || mobileTab === 'feed') && (
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Join requests (admin) */}
          {squadData.is_admin && joinRequests.length > 0 && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary">Join requests ({joinRequests.length})</span>
                <Button variant="ghost" size="sm" onClick={() => setRequestsOpen(!requestsOpen)}>
                  {requestsOpen ? 'Hide' : 'Show'}
                </Button>
              </div>
              {requestsOpen && (
                <div className="flex flex-col gap-2">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8">
                          {req.profile?.avatar_url && <AvatarImage src={req.profile.avatar_url} alt="" />}
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                            {req.profile?.public_name?.trim()?.slice(0, 2) || req.profile?.full_name?.trim()?.slice(0, 2) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {req.profile?.public_name?.trim() || req.profile?.full_name?.trim() || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => handleDenyRequest(req.id)} aria-label="Deny request"><X className="size-3.5" /></Button>
                        <Button size="sm" onClick={() => handleApproveRequest(req.id)} aria-label="Approve request"><Check className="size-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pinned Posts */}
          {canViewFeed && pinnedPosts.length > 0 && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Pin className="size-3 text-primary" />
                <span className="text-xs font-medium text-primary">Pinned</span>
              </div>
              <div className="flex flex-col gap-3">
                {pinnedPosts.map((post) => <PostCard key={post.id} {...postCardProps(post, true)} />)}
              </div>
            </div>
          )}

          {/* Post Composer */}
          {squadData.is_joined && (
            <div className="mb-4">
              <PostComposer
                onOpenDrawer={() => { setEditPost(null); setNewPostOpen(true) }}
                isMobile={isMobile}
                userInitials={userInitials}
                postingInitials={userInitials}
                postingDisplayName={profile?.public_name || profile?.full_name}
                onSubmit={handleCreateOrEditPost}
                submitting={submittingPost}
                placeholderText={`Share something with ${squadData.name}`}
              />
            </div>
          )}

          <NewPostModal
            open={newPostOpen && isMobile}
            onClose={() => { setNewPostOpen(false); setEditPost(null) }}
            isMobile={isMobile}
            onSubmit={handleCreateOrEditPost}
            authorId={userId ?? ''}
            userInitials={userInitials}
            submitting={submittingPost}
            editPost={editPost}
          />

          {/* Feed Sort + Posts */}
          {canViewFeed && (
            <>
              <div className="mb-3">
                <FeedSortRow
                  sort={sortOption}
                  ascending={sortAscending}
                  onSort={setSortOption}
                  onToggleOrder={() => setSortAscending((prev) => !prev)}
                />
              </div>
              <div className="flex flex-col gap-3">
                {loading ? (
                  <FeedSkeleton count={4} />
                ) : (
                  sortedPosts.map((post) => <PostCard key={post.id} {...postCardProps(post, false)} />)
                )}
              </div>
              {!loading && sortedPosts.length === 0 && pinnedPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="size-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to share something</p>
                </div>
              )}
            </>
          )}

          {!userId && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
              <Lock className="size-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sign in to view squad details and participate.</p>
            </div>
          )}

          {userId && !squadData.is_joined && squadData.type === 'open' && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">Join to post, chat, and get updates</p>
              <Button size="sm" onClick={handleJoin}>Join Squad</Button>
            </div>
          )}
        </div>
        )}

        {/* Sidebar: when sidebar visible, show in column; when tabs, show in About tab */}
        {(showSidebar || mobileTab === 'about') && (
          <aside className={!showSidebar ? "w-full" : "w-72 shrink-0 md:-mt-12"}>
            <div className="sticky top-4">
              {sidebarContent}
            </div>
          </aside>
        )}
      </div>
      )}
    </div>
  )
}

// ── Squad Card (exported for Explore discover) ──
export function SquadCard({ squad, onClick }: { squad: Squad; onClick: () => void }) {
  const isMobile = useIsMobile()
  const [imgError, setImgError] = useState(false)
  const avatarUrl = squad.avatar_url && !imgError ? squad.avatar_url : null
  const hoverColor = squadHoverColor(squad.id)
  const hasCover = !!squad.cover_url

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-xl border border-border overflow-hidden p-4 text-left transition-all hover:shadow-lg",
        !hasCover && "bg-card",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
      style={hasCover ? { backgroundImage: `url(${squad.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {hasCover && <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/15 to-black/10" aria-hidden />}
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
            (squad.name || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-base font-semibold truncate", hasCover ? "text-white" : "text-foreground")}>{squad.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
              {CATEGORY_LABELS[squad.category] || squad.category}
            </span>
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
                    {squad.type === 'open' ? <UsersIcon className="size-2.5 shrink-0" /> : <Lock className="size-2.5 shrink-0" />}
                    {squad.type === 'private' ? 'Private' : squad.type === 'restricted' ? 'Restricted' : 'Open'}
                  </Badge>
                </button>
              </SquiggleHoverCardTrigger>
              <SquiggleHoverCardContent className="w-[min(13.75rem,calc(100vw-2rem))] [text-wrap:normal]">
                {PRIVACY_BADGE_TOOLTIPS[squad.type]}
              </SquiggleHoverCardContent>
            </SquiggleHoverCard>
          </div>
        </div>
        {squad.is_joined && (
          <Badge variant="outline" className={cn("text-xs px-3 py-1.5 rounded-full text-primary border-primary/30 shrink-0", hasCover && "bg-white border-white/80")}>
            Joined
          </Badge>
        )}
        {squad.type === 'restricted' && !squad.is_joined && squad.join_request_status === 'pending' && (
          <Badge variant="secondary" className={cn("text-xs shrink-0", hasCover && "bg-white text-foreground border-transparent")}>
            Request sent
          </Badge>
        )}
      </div>
      <SquadDescriptionPreview info={squad.info} hasCover={hasCover} />
      <div className="mt-3 flex items-center gap-4">
        <span className={cn("flex items-center gap-1 text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
          <UsersIcon className="size-3" /> {squad.member_count ?? 0} {(squad.member_count ?? 0) === 1 ? 'member' : 'members'}
        </span>
        <span className={cn("flex items-center gap-1 text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
          <MessageSquare className="size-3" /> {squad.post_count ?? 0} {(squad.post_count ?? 0) === 1 ? 'post' : 'posts'}
        </span>
      </div>
      </div>
    </button>
  )
}

// ── Main Export ──
export function SquadsPage({
  squadToOpenId,
  onSquadOpenCleared,
  onViewUserProfile,
}: {
  squadToOpenId?: string | null
  onSquadOpenCleared?: () => void
  onViewUserProfile?: (authorId: string) => void
} = {}) {
  const { user } = useAuth()
  const { setIsSubView } = useSubView()
  const [joinedSquads, setJoinedSquads] = useState<Squad[]>([])
  const [discoverSquads, setDiscoverSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(!!user)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [filter, setFilter] = useState<"joined" | "discover">("joined")
  const [search, setSearch] = useState("")
  const [discoverCategory, setDiscoverCategory] = useState<string[]>([])
  const [discoverPrivacy, setDiscoverPrivacy] = useState<string[]>([])
  const [discoverSort, setDiscoverSort] = useState<DiscoverSortOption>(DISCOVER_DEFAULT_SORT)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const isMobile = useIsMobile()

  const loadSquads = useCallback(async () => {
    if (!user) {
      setJoinedSquads([])
      setDiscoverSquads([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [joined, discover] = await Promise.all([
        SquadsService.getJoinedSquads(),
        SquadsService.getSquadsForDiscover(),
      ])
      setJoinedSquads(joined)
      setDiscoverSquads(discover)
    } catch {
      setJoinedSquads([])
      setDiscoverSquads([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSquads()
  }, [loadSquads])

  useEffect(() => {
    if (squadToOpenId) {
      SquadsService.getSquad(squadToOpenId)
        .then((squad) => {
          setSelectedSquad(squad)
          onSquadOpenCleared?.()
        })
        .catch(() => onSquadOpenCleared?.())
    }
  }, [squadToOpenId, onSquadOpenCleared])

  useEffect(() => {
    if (isMobile) setIsSubView(!!selectedSquad)
    return () => setIsSubView(false)
  }, [selectedSquad, isMobile, setIsSubView])

  const filteredSquads =
    filter === "joined"
      ? joinedSquads.filter((s) => matchesDiscoverSquadSearch(s, search))
      : filterDiscoverSquadsList(
          discoverSquads,
          search,
          discoverCategory,
          discoverPrivacy,
          discoverSort
        )

  const handleCreateSquad = async (name: string, info: string, category: string, privacy: 'open' | 'restricted' | 'private', meetingTimes: string | null, location: string | null, chatEnabled: boolean) => {
    if (!user) return
    setCreateSubmitting(true)
    try {
      const squad = await SquadsService.createSquad(name, info, category, meetingTimes, location, privacy, chatEnabled)
      try {
        await FeedService.createSquadWelcomePost(squad.id, user!.id)
      } catch {
        // Welcome post optional; squad still created
      }
      await loadSquads()
      setSelectedSquad(await SquadsService.getSquad(squad.id))
      toast.success('Squad created')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to create squad')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const [showChat, setShowChat] = useState(false)
  const [inDetailView, setInDetailView] = useState(false)
  useEffect(() => setShowChat(false), [selectedSquad?.id])
  useEffect(() => setInDetailView(false), [selectedSquad?.id])

  if (selectedSquad) {
    const wrapperClass = showChat && !isMobile
      ? "flex h-[calc(100dvh-4rem)] overflow-hidden"
      : inDetailView
        ? "flex flex-col flex-1 min-h-0 overflow-y-auto"
        : "mx-auto w-full max-w-5xl flex flex-col flex-1 min-h-0 px-4 py-4 md:px-6 md:py-6 pb-6 overflow-y-auto"
    return (
      <div className={wrapperClass}>
        <SquadDetail
          squad={selectedSquad}
          onBack={() => { setSelectedSquad(null); loadSquads() }}
          isMobile={isMobile}
          userId={user?.id}
          onViewUserProfile={onViewUserProfile}
          showChat={showChat}
          onShowChatChange={setShowChat}
          onDetailViewChange={setInDetailView}
        />
      </div>
    )
  }

  return (
    <>
      <CreateSquadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSquad}
        submitting={createSubmitting}
        isMobile={isMobile}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6 md:py-6 pb-nav-safe md:pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={pageMainTitleClass}>Squads</h2>
            <p className="hidden text-sm text-muted-foreground md:block">Find your people</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="size-4" />
            <span className="hidden md:inline ml-2">Create Squad</span>
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={filter === "joined" ? "Search your squads by name" : "Search by squad name"}
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={filter === "joined" ? "Search your squads" : "Search squads"}
          />
        </div>

        <div className="mb-4 inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
          {(["joined", "discover"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === tab
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground active:bg-accent/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {filter === "discover" && (
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SquadListCardSkeleton key={i} />)
          ) : (
            filteredSquads.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                onClick={() => setSelectedSquad(squad)}
              />
            ))
          )}
        </div>

        {!loading && filteredSquads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "joined" ? "You haven't joined any squads yet" : "No squads found"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "joined" ? "Discover squads to join" : "Try a different search or filter"}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
