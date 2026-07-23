import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useProfile } from "@/contexts/ProfileContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { FeedService, type FeedPostWithAuthor } from "@/services/feedService"
import { SquadsService } from "@/services/squadsService"
import { PostCard, PostDetailView, NewPostModal } from "@/components/pages/home-feed"
import { FeedVirtualizedPostBlock } from "@/components/feed/feed-virtualized-post-block"
import { SharePostModal } from "@/components/share-post-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSubView } from "@/hooks/use-sub-view"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  Edit3,
  MapPin,
  GraduationCap,
  Calendar,
  Heart,
  MessageCircle,
  MoreHorizontal,
  BookOpen,
  Users,
  Grid3X3,
  Bookmark,
  Bell,
  Shield,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Check,
  X,
  Instagram,
  Linkedin,
  Github,
  Twitter,
  AlertCircle,
  Globe,
  Lock,
  ArrowLeft,
  FileText,
  ImagePlus,
  UserPlus,
  Dices,
  Loader2,
  UserCheck,
  Clock,
  Ban,
  EyeOff,
  Info,
} from "lucide-react"
import { cn, pageMainTitleClass, quadHoverColor } from "@/lib/utils"
import { FeedSkeleton, ProfileSquadsSkeleton, ProfileHeaderSkeleton } from "@/components/ui/feed-skeletons"
import { navigateWithoutReload } from "@/lib/navigation"
import { isValidSocialUrl, normalizeSocialUrl } from "@/lib/urlUtils"
import { FriendsService, type FriendRequestStatus } from "@/services/friendsService"
import { BlocksService } from "@/services/blocksService"
import { MessagingService, type DmConversationRow } from "@/services/messagingService"
import { BlockInfoDialog, BLOCK_INFO, type BlockInfoAnchorRect } from "@/components/block-info-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const HARVARD_SCHOOLS = [
  "Harvard College (Undergraduate)",
  "Harvard Kenneth C. Griffin Graduate School of Arts and Sciences",
  "Harvard John A. Paulson School of Engineering and Applied Sciences (SEAS)",
  "Harvard Law School",
  "Harvard Medical School",
  "Harvard School of Dental Medicine",
  "Harvard Business School",
  "Harvard Kennedy School (Government)",
  "Harvard Graduate School of Design",
  "Harvard Graduate School of Education",
  "Harvard Divinity School",
  "Harvard T.H. Chan School of Public Health",
  "Harvard Radcliffe Institute",
  "Division of Continuing Education (includes Harvard Extension School and Harvard Summer School)",
]

type ProfileData = {
  full_name: string | null
  public_name: string | null
  class_year: string | null
  major: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  location: string | null
  created_at: string | null
  instagram_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  github_url: string | null
  is_public: boolean | null
  theme: string | null
}

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const mo = d.toLocaleString("en-US", { month: "short" })
  const yr = d.getFullYear()
  return `Joined ${mo} ${yr}`
}

const PROFILE_COVERS_BUCKET = "profile-covers"

const DICEBEAR_STYLES = ["croodles", "notionists"] as const
function buildDiceBearAvatarUrl(): string {
  const style = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)]
  const seed = Math.random().toString(36).substring(2, 12)
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`
}

function ProfileHeaderAddFriend({
  status,
  loading,
  onAddFriend,
  onAcceptFriend,
  onCancelRequest,
  onUnfriend,
}: {
  status: { isFriend: boolean; requestStatus: FriendRequestStatus } | null
  loading: boolean
  onAddFriend: () => Promise<void>
  onAcceptFriend: () => Promise<void>
  onCancelRequest?: () => Promise<void>
  onUnfriend?: () => Promise<void>
}) {
  if (status?.isFriend) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <UserCheck className="size-3.5" />
          Friends
        </span>
        <Button size="sm" variant="secondary" className="h-8 rounded-full px-3 text-xs" disabled={loading} onClick={onUnfriend}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Unfriend
        </Button>
      </div>
    )
  }
  if (status?.requestStatus === "pending_sent") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Pending
        </span>
        <Button size="sm" variant="secondary" className="h-8 rounded-full px-3 text-xs" disabled={loading} onClick={onCancelRequest}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Cancel request
        </Button>
      </div>
    )
  }
  if (status?.requestStatus === "pending_received") {
    return (
      <Button size="sm" variant="default" className="h-8 rounded-full px-3 text-xs" disabled={loading} onClick={onAcceptFriend}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
        Accept
      </Button>
    )
  }
  return (
    <Button size="sm" variant="default" className="h-8 rounded-full px-3 text-xs" disabled={loading} onClick={onAddFriend}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
      Add Friend
    </Button>
  )
}

// ── Profile Header (social links display-only; edit in Settings) ──
function ProfileHeader({
  profile,
  postCount,
  friendCount,
  squadCount,
  editing,
  userId,
  onEdit,
  onSave,
  onCancel,
  onRerollAvatar,
  saving,
  canEdit = true,
  addFriendSlot,
  moreActionsSlot,
}: {
  profile: ProfileData | null
  postCount: number
  friendCount: number
  squadCount: number
  editing: boolean
  userId?: string | null
  onEdit: () => void
  onSave: (values: { full_name: string; public_name: string; class_year: string; major: string; bio: string; location: string; cover_url?: string | null }) => void
  onCancel: () => void
  onRerollAvatar?: (avatarUrl: string) => void
  saving: boolean
  canEdit?: boolean
  addFriendSlot?: React.ReactNode
  moreActionsSlot?: React.ReactNode
}) {
  const fullName = profile?.full_name || "User"
  const publicHandle = profile?.public_name ? `@${profile.public_name.replace(/^@/, "")}` : ""
  const [name, setName] = useState(fullName)
  const [publicName, setPublicName] = useState(profile?.public_name?.replace(/^@/, "") ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [major, setMajor] = useState(profile?.major ?? "")
  const [year, setYear] = useState(profile?.class_year ?? "")
  const [location, setLocation] = useState(profile?.location ?? "")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverSignedUrl, setCoverSignedUrl] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [rerollingAvatar, setRerollingAvatar] = useState(false)

  useEffect(() => {
    setName(profile?.full_name || "User")
    setPublicName(profile?.public_name?.replace(/^@/, "") ?? "")
    setBio(profile?.bio ?? "")
    setMajor(profile?.major ?? "")
    setYear(profile?.class_year ?? "")
    setLocation(profile?.location ?? "")
  }, [profile])

  useEffect(() => {
    if (!editing) {
      setCoverFile(null)
      setRemoveCover(false)
    }
  }, [editing])

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile)
      setCoverPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setCoverPreview(null)
  }, [coverFile])

  useEffect(() => {
    if (!profile?.cover_url || profile.cover_url.startsWith("http")) {
      setCoverSignedUrl(null)
      return
    }
    let cancelled = false
    import("@/lib/signedStorageUrl").then(({ getSignedUrl }) =>
      getSignedUrl(PROFILE_COVERS_BUCKET, profile.cover_url!).then((url) => {
        if (!cancelled) setCoverSignedUrl(url)
      })
    )
    return () => { cancelled = true }
  }, [profile?.cover_url])

  const handleSave = async () => {
    let coverPath: string | null = removeCover ? null : (profile?.cover_url ?? null)
    if (coverFile && userId && !removeCover) {
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg"
      const path = `${userId}/cover.${ext}`
      if (profile?.cover_url && profile.cover_url !== path) {
        await supabase.storage.from(PROFILE_COVERS_BUCKET).remove([profile.cover_url])
      }
      const { error } = await supabase.storage.from(PROFILE_COVERS_BUCKET).upload(path, coverFile, { contentType: coverFile.type || "image/jpeg", upsert: true })
      if (error) {
        toast.error("Failed to upload cover image")
        return
      }
      coverPath = path
    } else if (removeCover && profile?.cover_url && !profile.cover_url.startsWith("http")) {
      await supabase.storage.from(PROFILE_COVERS_BUCKET).remove([profile.cover_url])
    }
    onSave({
      full_name: name.trim() || profile?.full_name || "",
      public_name: publicName.trim().replace(/^@/, "") || "",
      class_year: year.trim(),
      major: major.trim(),
      bio: bio.trim(),
      location: location.trim(),
      cover_url: coverPath,
    })
    setCoverFile(null)
    setRemoveCover(false)
  }

  const handleRerollAvatar = async () => {
    if (!userId || !onRerollAvatar) return
    setRerollingAvatar(true)
    try {
      const avatarUrl = buildDiceBearAvatarUrl()
      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("id", userId)
      if (error) {
        toast.error("Failed to update avatar")
        return
      }
      onRerollAvatar(avatarUrl)
    } catch {
      toast.error("Failed to update avatar")
    } finally {
      setRerollingAvatar(false)
    }
  }

  const avatarInitials = fullName ? (fullName.split(/\s+/).length >= 2
    ? (fullName.split(/\s+/)[0][0] + fullName.split(/\s+/).pop()![0]).toUpperCase()
    : fullName.charAt(0).toUpperCase())
  : "?"

  const coverDisplayUrl = removeCover ? null : (coverPreview ?? (coverSignedUrl || (profile?.cover_url?.startsWith("http") ? profile.cover_url : null)))

  return (
    <div className="relative">
      {/* Cover */}
      <div className="relative h-28 md:h-36 rounded-xl bg-primary/20 overflow-hidden">
        {coverDisplayUrl ? (
          <img src={coverDisplayUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {editing && canEdit && userId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
            <label className="flex items-center gap-2 text-white text-sm font-medium cursor-pointer hover:text-white/90">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setCoverFile(f)
                    setRemoveCover(false)
                  }
                  e.target.value = ""
                }}
              />
              <ImagePlus className="size-4" />
              {coverDisplayUrl ? "Change cover" : "Add cover image"}
            </label>
            {(coverDisplayUrl || profile?.cover_url) && (
              <button
                type="button"
                onClick={() => {
                  setRemoveCover(true)
                  setCoverFile(null)
                }}
                className="text-white/80 text-xs hover:text-white"
              >
                Remove cover
              </button>
            )}
          </div>
        )}
      </div>

      {/* Avatar & Info */}
      <div className="relative px-4 md:px-6 -mt-6 md:-mt-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="relative flex flex-col items-start gap-2">
            <Avatar className="size-20 md:size-24 ring-4 ring-background bg-background">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {avatarInitials}
                </AvatarFallback>
              )}
            </Avatar>
            {editing && canEdit && userId && onRerollAvatar && (
              <button
                type="button"
                onClick={handleRerollAvatar}
                disabled={rerollingAvatar}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  rerollingAvatar
                    ? "border-border bg-secondary text-muted-foreground cursor-not-allowed"
                    : "border-primary bg-background text-primary hover:bg-primary/10"
                )}
              >
                <Dices className={cn("size-3.5", rerollingAvatar && "animate-spin")} />
                {rerollingAvatar ? "Rolling…" : "Roll again"}
              </button>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {editing ? (
                  <>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      className={cn(
                        pageMainTitleClass,
                        "bg-transparent border-b border-primary focus:outline-none w-full max-w-xs"
                      )}
                    />
                    <input
                      value={publicName}
                      onChange={(e) => setPublicName(e.target.value)}
                      placeholder="@public_name"
                      className="mt-1 text-sm text-muted-foreground bg-transparent border-b border-border focus:outline-none focus:border-primary w-full max-w-xs"
                    />
                  </>
                ) : (
                  <>
                    <h2 className={pageMainTitleClass}>{fullName}</h2>
                    {publicHandle && <p className="text-sm text-muted-foreground">{publicHandle}</p>}
                  </>
                )}
              </div>
              {!editing && (addFriendSlot || moreActionsSlot) && (
                <div className="shrink-0 flex items-center gap-2 flex-shrink-0">
                  {addFriendSlot}
                  {moreActionsSlot}
                </div>
              )}
              {editing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <X className="size-3.5" /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="size-3.5" /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio & Meta */}
        <div className="mt-4">
          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add your bio | e.g. CS Major | Harvard '27"
              className="w-full text-sm text-foreground/90 bg-transparent border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed placeholder:text-muted-foreground"
              rows={2}
            />
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed">{bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            {editing ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GraduationCap className="size-3.5" />
                  <input
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="Major"
                    className="bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground min-w-[120px]"
                  />
                  {" - "}
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Year"
                    className="bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground w-16"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground appearance-none cursor-pointer"
                  >
                    <option value="">Select school</option>
                    {HARVARD_SCHOOLS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GraduationCap className="size-3.5" /> {major} - {year}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> {location || "—"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" /> {formatJoinedDate(profile?.created_at ?? null)}
                </span>
              </>
            )}
          </div>

          {/* Social links - display only; edit in Settings tab */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {(
              [
                { key: "instagram" as const, Icon: Instagram, label: "Instagram", url: profile?.instagram_url },
                { key: "linkedin" as const, Icon: Linkedin, label: "LinkedIn", url: profile?.linkedin_url },
                { key: "twitter" as const, Icon: Twitter, label: "X", url: profile?.twitter_url },
                { key: "github" as const, Icon: Github, label: "GitHub", url: profile?.github_url },
              ] as const
            ).map(({ key, Icon, label, url }) =>
              !isValidSocialUrl(url) ? (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs bg-secondary text-muted-foreground cursor-default">
                      <Icon className="size-3.5" />
                      {label}
                      {canEdit && <AlertCircle className="size-3 text-warning" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>No link attached{canEdit ? " — add in Settings" : ""}</TooltipContent>
                </Tooltip>
              ) : (
                <a
                  key={key}
                  href={normalizeSocialUrl(url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors bg-secondary text-foreground hover:bg-secondary/80"
                >
                  <Icon className="size-3.5" />
                  {label}
                </a>
              )
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <button className="flex items-center gap-1.5 group">
            <span className="text-sm font-semibold text-foreground tabular-nums">{postCount}</span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{postCount === 1 ? 'Post' : 'Posts'}</span>
          </button>
          <button className="flex items-center gap-1.5 group">
            <span className="text-sm font-semibold text-foreground tabular-nums">{friendCount}</span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{friendCount === 1 ? 'Friend' : 'Friends'}</span>
          </button>
          <button className="flex items-center gap-1.5 group">
            <span className="text-sm font-semibold text-foreground tabular-nums">{squadCount}</span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{squadCount === 1 ? 'Squad' : 'Squads'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const PROFILE_POSTS_PAGE_SIZE = 20

function ProfilePosts({
  userId,
  currentUserId,
  profile,
  onPostDeleted,
  canCreatePost = true,
  onViewUserProfile,
  onGoToSquad,
}: {
  userId: string | undefined
  currentUserId?: string | undefined
  profile: { full_name: string | null; public_name: string | null } | null
  onPostDeleted?: () => void
  canCreatePost?: boolean
  onViewUserProfile?: (userId: string) => void
  onGoToSquad?: (squadId: string) => void
}) {
  const isMobile = useIsMobile()
  const { setIsSubView } = useSubView()
  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(null)
  const [detailPostSquadContext, setDetailPostSquadContext] = useState<{ squadReadOnly: boolean; squadBanner: { squadName: string; squadType: string } } | null>(null)
  const [editPost, setEditPost] = useState<FeedPostWithAuthor | null>(null)
  const [deletePostToConfirm, setDeletePostToConfirm] = useState<FeedPostWithAuthor | null>(null)
  const [sharePost, setSharePost] = useState<FeedPostWithAuthor | null>(null)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const likingInProgressRef = useRef<Set<string>>(new Set())
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const profilePostsScrollRef = useRef<HTMLDivElement>(null)
  const postsLengthRef = useRef(0)
  const loadingMoreRef = useRef(false)
  postsLengthRef.current = posts.length

  const handleOpenPost = useCallback(
    async (post: FeedPostWithAuthor) => {
      const isAuthor = !!currentUserId && post.author_id === currentUserId
      if (post.source_type === "squad" && post.source_id && currentUserId && !isAuthor) {
        const access = await SquadsService.getSquadPostAccess(post.source_id)
        if (!access?.can_view) {
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
    [currentUserId]
  )

  const userInitials = profile
    ? (profile.public_name?.trim() || profile.full_name?.trim() || "?").slice(0, 2).toUpperCase()
    : "?"

  const loadPosts = useCallback(
    async (silent = false, append = false) => {
      if (!userId) {
        setPosts([])
        setHasMore(false)
        setLoading(false)
        return
      }
      if (append && loadingMoreRef.current) return
      const offset = append ? postsLengthRef.current : 0
      if (append) {
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else if (!silent) {
        setLoading(true)
      }
      try {
        const limit = append ? PROFILE_POSTS_PAGE_SIZE : Math.max(PROFILE_POSTS_PAGE_SIZE, postsLengthRef.current)
        const list = await FeedService.listPostsByAuthor(userId, currentUserId ?? userId, { limit, offset })
        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const newPosts = list.filter((p) => !seen.has(p.id))
            return [...prev, ...newPosts]
          })
          setHasMore(list.length >= PROFILE_POSTS_PAGE_SIZE)
        } else {
          setPosts(list)
          setHasMore(list.length >= PROFILE_POSTS_PAGE_SIZE)
        }
      } catch {
        if (!append && !silent) {
          setPosts([])
          setHasMore(false)
        }
      } finally {
        if (append) {
          loadingMoreRef.current = false
          setLoadingMore(false)
        } else if (!silent) {
          setLoading(false)
        }
      }
    },
    [userId, currentUserId]
  )

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || loading || loadingMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPosts(true, true)
      },
      { rootMargin: "200px", threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadPosts, hasMore, loading, loadingMore])

  useEffect(() => {
    if (!userId) return
    const channel = FeedService.subscribeToAuthorPosts(userId, () => loadPosts(true))
    const aux = FeedService.subscribeToFeedAuxiliary(null, () => loadPosts(true))
    return () => {
      FeedService.unsubscribeFromFeedPosts(channel)
      aux.unsubscribe()
    }
  }, [userId, loadPosts])

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
    if (!userId) return
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
    if (!currentUserId || currentUserId !== post.author_id) return
    setDeletePostToConfirm(post)
  }

  const confirmDeletePost = async () => {
    if (!currentUserId || !deletePostToConfirm) return
    try {
      await FeedService.deletePost(deletePostToConfirm.id, currentUserId)
      await loadPosts()
      if (detailPost?.id === deletePostToConfirm.id) { setDetailPost(null); setDetailPostSquadContext(null) }
      setDeletePostToConfirm(null)
      onPostDeleted?.()
      toast.success("Post deleted")
    } catch {
      toast.error("Failed to delete post")
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!currentUserId) return
    try {
      await FeedService.reportPost(postId, currentUserId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const handleReportReply = async (replyId: string) => {
    if (!currentUserId) return
    try {
      await FeedService.reportReply(replyId, currentUserId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const handleBookmark = async (post: FeedPostWithAuthor) => {
    if (!currentUserId) return
    const nextPinned = !post.current_user_pinned
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, current_user_pinned: nextPinned } : p))
    )
    try {
      await FeedService.togglePinPost(post.id, currentUserId)
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_pinned: post.current_user_pinned } : p))
      )
    }
  }

  const handlePollVote = (post: FeedPostWithAuthor, optionId: string, phase: "before" | "after") => {
    if (phase === "after") return
    const prevOptionId = post.current_user_vote_option_id ?? null
    setPosts((prev) =>
      prev.map((p) => {
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
      })
    )
    return () => {
      setPosts((prev) =>
        prev.map((p) => {
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
        })
      )
    }
  }

  const handleLike = async (post: FeedPostWithAuthor) => {
    if (!currentUserId) return
    const isAuthor = post.author_id === currentUserId
    if (post.source_type === "squad" && post.source_id && !isAuthor) {
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
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, current_user_hearted: nextHearted, heart_count: nextCount } : p
      )
    )
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, currentUserId)
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_hearted: hearted } : p))
      )
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, current_user_hearted: prevHearted, heart_count: prevCount } : p
        )
      )
      toast.error("Failed to update. Please try again.")
    } finally {
      likingInProgressRef.current.delete(post.id)
    }
  }

  if (detailPost) {
    return (
      <>
        {canCreatePost && (
          <NewPostModal
            open={newPostOpen && isMobile}
            onClose={() => {
              setNewPostOpen(false)
              setEditPost(null)
            }}
            isMobile={isMobile}
            onSubmit={handleCreatePost}
            authorId={userId ?? ""}
            userInitials={userInitials}
            submitting={submittingPost}
            editPost={editPost}
          />
        )}
        <PostDetailView
          post={detailPost}
          userId={currentUserId ?? userId}
          currentUserInitials={userInitials}
          isMobile={isMobile}
          backLabel="Back"
          onBack={() => {
            setDetailPost(null)
            setDetailPostSquadContext(null)
            loadPosts()
          }}
          squadReadOnly={detailPostSquadContext?.squadReadOnly}
          squadBanner={detailPostSquadContext?.squadBanner}
          onGoToSquad={detailPost?.source_type === "squad" && detailPost?.source_id ? onGoToSquad : undefined}
          editPost={editPost}
          deletePostToConfirm={deletePostToConfirm}
          onConfirmDeletePost={confirmDeletePost}
          onCancelDeletePost={() => setDeletePostToConfirm(null)}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onReportPost={handleReportPost}
          onSharePost={(p) => setSharePost(p)}
          onReportReply={handleReportReply}
          onOpenUserProfile={currentUserId ? onViewUserProfile : undefined}
          onCancelEditPost={() => setEditPost(null)}
          onSubmitPost={handleCreatePost}
          submittingPost={submittingPost}
        />
      </>
    )
  }

  return (
    <>
      <SharePostModal
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
        onShareSuccess={(postId, added) => {
          setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
        }}
      />
      {canCreatePost && (
        <NewPostModal
          open={newPostOpen && isMobile}
          onClose={() => {
            setNewPostOpen(false)
            setEditPost(null)
          }}
          isMobile={isMobile}
          onSubmit={handleCreatePost}
          authorId={userId ?? ""}
          userInitials={userInitials}
          submitting={submittingPost}
          editPost={editPost}
        />
      )}
      <div className="flex flex-col overflow-x-hidden">
        <div ref={profilePostsScrollRef} className="flex flex-col">
          <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
            {loading ? (
              <FeedSkeleton count={4} />
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Grid3X3 className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your posts will appear here</p>
              </div>
            ) : (
              <FeedVirtualizedPostBlock
                posts={posts}
                virtualize={false}
                scrollParentRef={profilePostsScrollRef}
                loadMoreRef={loadMoreRef}
                loadingMore={loadingMore}
                renderPost={(post) => (
                  <PostCard
                    post={post}
                    userId={currentUserId ?? userId}
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
                    onOpenUserProfile={currentUserId && post.author_id !== currentUserId ? onViewUserProfile : undefined}
                    editPost={editPost}
                    onSubmitPost={handleCreatePost}
                    onCancelEditPost={() => setEditPost(null)}
                    submittingPost={submittingPost}
                    userInitials={userInitials}
                    isMobile={isMobile}
                    sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                    onGoToSquad={onGoToSquad}
                    sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ProfileSaved({
  userId,
  currentUserId,
  profile,
  onViewUserProfile,
  onGoToSquad,
}: {
  userId: string | undefined
  currentUserId?: string | undefined
  profile: { full_name: string | null; public_name: string | null } | null
  onViewUserProfile?: (userId: string) => void
  onGoToSquad?: (squadId: string) => void
}) {
  const effectiveCurrentUserId = currentUserId ?? userId
  const isMobile = useIsMobile()
  const { setIsSubView } = useSubView()
  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(null)
  const [detailPostSquadContext, setDetailPostSquadContext] = useState<{ squadReadOnly: boolean; squadBanner: { squadName: string; squadType: string } } | null>(null)
  const [editPost, setEditPost] = useState<FeedPostWithAuthor | null>(null)
  const [deletePostToConfirm, setDeletePostToConfirm] = useState<FeedPostWithAuthor | null>(null)
  const [sharePost, setSharePost] = useState<FeedPostWithAuthor | null>(null)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const likingInProgressRef = useRef<Set<string>>(new Set())
  const profileSavedScrollRef = useRef<HTMLDivElement>(null)
  const savedLoadMoreRef = useRef<HTMLDivElement>(null)

  const handleOpenPost = useCallback(
    async (post: FeedPostWithAuthor) => {
      const isAuthor = !!effectiveCurrentUserId && post.author_id === effectiveCurrentUserId
      if (post.source_type === "squad" && post.source_id && effectiveCurrentUserId && !isAuthor) {
        const access = await SquadsService.getSquadPostAccess(post.source_id)
        if (!access?.can_view) {
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
    [effectiveCurrentUserId]
  )

  const userInitials = profile
    ? (profile.public_name?.trim() || profile.full_name?.trim() || "?").slice(0, 2).toUpperCase()
    : "?"

  const loadPosts = useCallback(async () => {
    if (!userId) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await FeedService.listPinnedPosts(userId)
      setPosts(list)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

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
    if (!userId) return
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
    }
  }

  const handleEditPost = (post: FeedPostWithAuthor) => {
    setEditPost(post)
    if (isMobile) setNewPostOpen(true)
  }

  const handleDeletePost = (post: FeedPostWithAuthor) => {
    if (!effectiveCurrentUserId || effectiveCurrentUserId !== post.author_id) return
    setDeletePostToConfirm(post)
  }

  const confirmDeletePost = async () => {
    if (!effectiveCurrentUserId || !deletePostToConfirm) return
    try {
      await FeedService.deletePost(deletePostToConfirm.id, effectiveCurrentUserId)
      await loadPosts()
      if (detailPost?.id === deletePostToConfirm.id) { setDetailPost(null); setDetailPostSquadContext(null) }
      setDeletePostToConfirm(null)
      toast.success("Post deleted")
    } catch {
      toast.error("Failed to delete post")
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!effectiveCurrentUserId) return
    try {
      await FeedService.reportPost(postId, effectiveCurrentUserId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const handleReportReply = async (replyId: string) => {
    if (!effectiveCurrentUserId) return
    try {
      await FeedService.reportReply(replyId, effectiveCurrentUserId)
      toast.success("Report submitted. Thanks for helping keep the community safe.")
    } catch {
      toast.error("Failed to submit report. Please try again.")
    }
  }

  const handleBookmark = async (post: FeedPostWithAuthor) => {
    if (!effectiveCurrentUserId) return
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
    try {
      await FeedService.togglePinPost(post.id, effectiveCurrentUserId)
      if (detailPost?.id === post.id) { setDetailPost(null); setDetailPostSquadContext(null) }
    } catch {
      setPosts((prev) => [...prev, post])
    }
  }

  const handlePollVote = (post: FeedPostWithAuthor, optionId: string, phase: "before" | "after") => {
    if (phase === "after") return
    const prevOptionId = post.current_user_vote_option_id ?? null
    setPosts((prev) =>
      prev.map((p) => {
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
      })
    )
    return () => {
      setPosts((prev) =>
        prev.map((p) => {
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
        })
      )
    }
  }

  const handleLike = async (post: FeedPostWithAuthor) => {
    if (!effectiveCurrentUserId) return
    const isAuthor = post.author_id === effectiveCurrentUserId
    if (post.source_type === "squad" && post.source_id && !isAuthor) {
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
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, current_user_hearted: nextHearted, heart_count: nextCount } : p
      )
    )
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, effectiveCurrentUserId)
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, current_user_hearted: hearted } : p))
      )
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, current_user_hearted: prevHearted, heart_count: prevCount } : p
        )
      )
      toast.error("Failed to update. Please try again.")
    } finally {
      likingInProgressRef.current.delete(post.id)
    }
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
            setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
          }}
        />
        <NewPostModal
          open={newPostOpen && isMobile}
          onClose={() => {
            setNewPostOpen(false)
            setEditPost(null)
          }}
          isMobile={isMobile}
          onSubmit={handleCreatePost}
          authorId={userId ?? ""}
          userInitials={userInitials}
          submitting={submittingPost}
          editPost={editPost}
        />
        <PostDetailView
          post={detailPost}
          userId={effectiveCurrentUserId}
          currentUserInitials={userInitials}
          isMobile={isMobile}
          backLabel="Back"
          onBack={() => {
            setDetailPost(null)
            setDetailPostSquadContext(null)
            loadPosts()
          }}
          squadReadOnly={detailPostSquadContext?.squadReadOnly}
          squadBanner={detailPostSquadContext?.squadBanner}
          onGoToSquad={detailPost?.source_type === "squad" && detailPost?.source_id ? onGoToSquad : undefined}
          editPost={editPost}
          deletePostToConfirm={deletePostToConfirm}
          onConfirmDeletePost={confirmDeletePost}
          onCancelDeletePost={() => setDeletePostToConfirm(null)}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onReportPost={handleReportPost}
          onSharePost={(p) => setSharePost(p)}
          onReportReply={handleReportReply}
          onOpenUserProfile={effectiveCurrentUserId ? onViewUserProfile : undefined}
          onCancelEditPost={() => setEditPost(null)}
          onSubmitPost={handleCreatePost}
          submittingPost={submittingPost}
        />
      </>
    )
  }

  return (
    <>
      <SharePostModal
        open={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
        onShareSuccess={(postId, added) => {
          setPosts((p) => p.map((x) => (x.id === postId ? { ...x, share_count: (x.share_count ?? 0) + added } : x)))
          setDetailPost((d) => (d?.id === postId ? { ...d, share_count: (d.share_count ?? 0) + added } : d))
        }}
      />
      <NewPostModal
        open={newPostOpen && isMobile}
        onClose={() => {
          setNewPostOpen(false)
          setEditPost(null)
        }}
        isMobile={isMobile}
        onSubmit={handleCreatePost}
        authorId={userId ?? ""}
        userInitials={userInitials}
        submitting={submittingPost}
        editPost={editPost}
      />
      <div className="flex flex-col overflow-x-hidden">
        <div ref={profileSavedScrollRef} className="flex flex-col">
          <div className="flex flex-col gap-3 pb-nav-safe md:pb-4">
            {loading ? (
              <FeedSkeleton count={4} />
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bookmark className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No saved posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Bookmark posts to find them here later</p>
              </div>
            ) : (
              <FeedVirtualizedPostBlock
                posts={posts}
                virtualize={false}
                scrollParentRef={profileSavedScrollRef}
                loadMoreRef={savedLoadMoreRef}
                loadingMore={false}
                renderPost={(post) => (
                  <PostCard
                    post={post}
                    userId={effectiveCurrentUserId}
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
                    onOpenUserProfile={
                      effectiveCurrentUserId && post.author_id !== effectiveCurrentUserId ? onViewUserProfile : undefined
                    }
                    editPost={editPost}
                    onSubmitPost={handleCreatePost}
                    onCancelEditPost={() => setEditPost(null)}
                    submittingPost={submittingPost}
                    userInitials={userInitials}
                    isMobile={isMobile}
                    sourceTag={post.source_type === "squad" && post.source_name ? post.source_name : "Campus"}
                    onGoToSquad={onGoToSquad}
                    sourceSquadId={post.source_type === "squad" && post.source_id ? post.source_id : null}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ProfileSquads({
  profileUserId,
  isOwnProfile,
  currentUserId,
  onGoToSquad,
  onNavigateToDiscoverSquads,
}: {
  profileUserId: string | null
  isOwnProfile: boolean
  currentUserId?: string | null
  onGoToSquad: (squadId: string) => void
  onNavigateToDiscoverSquads?: () => void
}) {
  const [squads, setSquads] = useState<Array<{ id: string; name: string; type: "open" | "restricted" | "private"; member_count?: number; post_count?: number; category: string; avatar_url?: string | null; cover_url?: string | null }>>([])
  const [currentUserSquadIds, setCurrentUserSquadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!!profileUserId)
  const [actionSquadId, setActionSquadId] = useState<string | null>(null)

  useEffect(() => {
    if (!profileUserId) {
      setSquads([])
      setLoading(false)
      return
    }
    setLoading(true)
    if (isOwnProfile) {
      SquadsService.getSquads()
        .then((all) => setSquads(all.filter((s) => s.is_joined).map((s) => ({ ...s, type: s.type }))))
        .catch(() => setSquads([]))
        .finally(() => setLoading(false))
    } else {
      Promise.all([
        SquadsService.getSquadsForUser(profileUserId),
        currentUserId ? SquadsService.getSquadIdsForUser(currentUserId) : Promise.resolve([]),
      ])
        .then(([squadList, ids]) => {
          setSquads(squadList)
          setCurrentUserSquadIds(new Set(ids))
        })
        .catch(() => setSquads([]))
        .finally(() => setLoading(false))
    }
  }, [profileUserId, isOwnProfile, currentUserId])

  if (loading) {
    return <ProfileSquadsSkeleton />
  }

  if (squads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="size-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">{isOwnProfile ? "No squads yet" : "No squads"}</p>
        <p className="text-xs text-muted-foreground mt-1">{isOwnProfile ? "Join squads to see them here" : "This user is not in any squads"}</p>
        {isOwnProfile && onNavigateToDiscoverSquads && (
          <Button variant="default" size="sm" className="mt-4 rounded-full" onClick={onNavigateToDiscoverSquads}>
            Discover squads
          </Button>
        )}
      </div>
    )
  }

  const handleJoin = async (e: React.MouseEvent, squadId: string, isPrivate: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    if (!currentUserId || actionSquadId) return
    setActionSquadId(squadId)
    try {
      if (isPrivate) {
        await SquadsService.requestToJoinSquad(squadId)
        toast.success("Request sent. Check Notifications for the response.")
      } else {
        await SquadsService.joinSquad(squadId)
        toast.success("Joined squad")
        setCurrentUserSquadIds((prev) => new Set([...prev, squadId]))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setActionSquadId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {squads.map((squad) => {
        const hoverColor = quadHoverColor(squad.id)
        const showJoinButton = !isOwnProfile && currentUserId && !currentUserSquadIds.has(squad.id) && squad.type !== 'private'
        const hasCover = !!squad.cover_url
        return (
        <div
          key={squad.id}
          role="button"
          tabIndex={0}
          onClick={() => onGoToSquad(squad.id)}
          onKeyDown={(e) => e.key === "Enter" && onGoToSquad(squad.id)}
          className={cn(
            "relative flex items-center gap-3 rounded-xl border border-border overflow-hidden p-3.5 text-left w-full transition-all hover:shadow-lg cursor-pointer",
            !hasCover && "bg-card",
            hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
            hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
            hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
            hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
          )}
          style={hasCover ? { backgroundImage: `url(${squad.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {hasCover && <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/15 to-black/10" aria-hidden />}
          <div className="relative z-10 flex items-center gap-3 w-full">
          {squad.avatar_url ? (
            <img src={squad.avatar_url} alt="" className="size-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
              {squad.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", hasCover ? "text-white" : "text-foreground")}>{squad.name}</p>
            <p className={cn("text-xs", hasCover ? "text-white/90" : "text-muted-foreground")}>
              {squad.member_count ?? 0} {(squad.member_count ?? 0) === 1 ? "member" : "members"} · {squad.post_count ?? 0} {(squad.post_count ?? 0) === 1 ? "post" : "posts"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{squad.category}</span>
            {showJoinButton && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                disabled={actionSquadId === squad.id}
                onClick={(e) => handleJoin(e, squad.id, squad.type === "restricted")}
              >
                {actionSquadId === squad.id ? "…" : squad.type === "restricted" ? "Request to join" : "Join"}
              </Button>
            )}
          </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

function ProfileFriends({
  viewingUserId,
  currentUserId,
  onViewUserProfile,
  onNavigateToExplore,
  onFriendsChanged,
}: {
  viewingUserId: string | null
  currentUserId?: string | null
  onViewUserProfile?: (userId: string) => void
  onNavigateToExplore?: () => void
  onFriendsChanged?: () => void
}) {
  const [friends, setFriends] = useState<Array<{ id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [friendStatusMap, setFriendStatusMap] = useState<Record<string, { isFriend: boolean; requestStatus: FriendRequestStatus }>>({})
  const [requestsSent, setRequestsSent] = useState<Array<{ to_user_id: string; full_name: string | null; public_name: string | null; avatar_url: string | null; status: string; created_at: string }>>([])
  const [requestsSentLoading, setRequestsSentLoading] = useState(false)
  const [cancelRequestAction, setCancelRequestAction] = useState<string | null>(null)
  const [requestsReceived, setRequestsReceived] = useState<Array<{ from_user_id: string; full_name: string | null; public_name: string | null; avatar_url: string | null; created_at: string }>>([])
  const [requestsReceivedLoading, setRequestsReceivedLoading] = useState(false)
  const [acceptAction, setAcceptAction] = useState<string | null>(null)
  const [declineAction, setDeclineAction] = useState<string | null>(null)

  useEffect(() => {
    if (!viewingUserId) {
      setFriends([])
      setFriendStatusMap({})
      return
    }
    setLoading(true)
    FriendsService.getFriendsForUser(viewingUserId)
      .then((data) => {
        setFriends(data)
        return data
      })
      .finally(() => setLoading(false))
  }, [viewingUserId])

  useEffect(() => {
    if (!viewingUserId || !currentUserId || viewingUserId === currentUserId || friends.length === 0) {
      setFriendStatusMap({})
      return
    }
    const others = friends.filter((f) => f.id !== currentUserId)
    if (others.length === 0) return
    FriendsService.getFriendStatusBatch(currentUserId, others.map((p) => p.id))
      .then(setFriendStatusMap)
      .catch(() => setFriendStatusMap({}))
  }, [viewingUserId, currentUserId, friends])

  const isOwnProfile = viewingUserId === currentUserId

  useEffect(() => {
    if (isOwnProfile && currentUserId) {
      setRequestsSentLoading(true)
      FriendsService.getSentFriendRequests()
        .then(setRequestsSent)
        .finally(() => setRequestsSentLoading(false))
    } else {
      setRequestsSent([])
      setRequestsSentLoading(false)
    }
  }, [isOwnProfile, currentUserId])

  useEffect(() => {
    if (isOwnProfile && currentUserId) {
      setRequestsReceivedLoading(true)
      FriendsService.getReceivedFriendRequests()
        .then(setRequestsReceived)
        .finally(() => setRequestsReceivedLoading(false))
    } else {
      setRequestsReceived([])
      setRequestsReceivedLoading(false)
    }
  }, [isOwnProfile, currentUserId])

  if (!viewingUserId) return null

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
            <div className="size-11 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const handleCancelFriendRequest = async (toUserId: string) => {
    setCancelRequestAction(toUserId)
    try {
      await FriendsService.cancelFriendRequest(toUserId)
      setRequestsSent((prev) => prev.filter((r) => r.to_user_id !== toUserId))
      toast.success("Friend request cancelled")
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to cancel request")
    } finally {
      setCancelRequestAction(null)
    }
  }

  const handleAcceptFriendRequest = async (fromUserId: string) => {
    setAcceptAction(fromUserId)
    try {
      await FriendsService.acceptFriendRequest(fromUserId)
      setRequestsReceived((prev) => prev.filter((r) => r.from_user_id !== fromUserId))
      const data = await FriendsService.getFriendsForUser(viewingUserId!)
      setFriends(data)
      onFriendsChanged?.()
      toast.success("Friend request accepted")
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to accept request")
    } finally {
      setAcceptAction(null)
    }
  }

  const handleDeclineFriendRequest = async (fromUserId: string) => {
    setDeclineAction(fromUserId)
    try {
      await FriendsService.declineFriendRequest(fromUserId)
      setRequestsReceived((prev) => prev.filter((r) => r.from_user_id !== fromUserId))
      toast.success("Friend request declined")
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to decline request")
    } finally {
      setDeclineAction(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isOwnProfile && (
        <>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Requests received</h3>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            {requestsReceivedLoading ? (
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
            ) : requestsReceived.length > 0 ? (
              requestsReceived.map((req) => {
                const name = req.public_name?.trim() || req.full_name?.trim() || "Unknown"
                const initials = name.slice(0, 2).toUpperCase()
                const hoverColor = quadHoverColor(req.from_user_id)
                const accepting = acceptAction === req.from_user_id
                const declining = declineAction === req.from_user_id
                return (
                  <div
                    key={req.from_user_id}
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
                        onClick={() => onViewUserProfile(req.from_user_id)}
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
                        {onViewUserProfile ? (
                          <button
                            type="button"
                            onClick={() => onViewUserProfile(req.from_user_id)}
                            className="font-medium hover:underline"
                          >
                            {name}
                          </button>
                        ) : (
                          <span className="font-medium">{name}</span>
                        )}
                        {" "}wants to be friends
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="size-3" /> {FeedService.timeAgo(req.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2.5 text-xs"
                        disabled={!!(acceptAction || declineAction)}
                        onClick={() => handleAcceptFriendRequest(req.from_user_id)}
                      >
                        {accepting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2.5 text-xs"
                        disabled={!!(acceptAction || declineAction)}
                        onClick={() => handleDeclineFriendRequest(req.from_user_id)}
                      >
                        {declining ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        Decline
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending requests</p>
            )}
          </div>
        </div>
        <div>
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
                      Cancel
                    </Button>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending requests</p>
            )}
          </div>
        </div>
        </>
      )}
      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserPlus className="size-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">{isOwnProfile ? "No friends yet" : "No friends"}</p>
          <p className="text-xs text-muted-foreground mt-1">{isOwnProfile ? "Friends you add will appear here" : "This user has no friends yet"}</p>
          {isOwnProfile && onNavigateToExplore && (
            <Button variant="default" size="sm" className="mt-4 rounded-full" onClick={() => onNavigateToExplore?.()}>
              Add friends
            </Button>
          )}
        </div>
      ) : (
      <div className="flex flex-col gap-2">
      {friends.map((friend) => {
        const name = friend.public_name?.trim() || friend.full_name?.trim() || "Unknown"
        const initials = name.slice(0, 2).toUpperCase()
        const hoverColor = quadHoverColor(friend.id)
        const friendStatus = friend.id !== currentUserId ? friendStatusMap[friend.id] : undefined
        const showFriendButton = !isOwnProfile && currentUserId && friend.id !== currentUserId && friendStatus !== undefined
        const isFriend = friendStatus?.isFriend
        const requestStatus = friendStatus?.requestStatus
        return (
          <ProfileFriendCard
            key={friend.id}
            friend={friend}
            name={name}
            initials={initials}
            hoverColor={hoverColor}
            showFriendButton={!!showFriendButton}
            isFriend={!!isFriend}
            requestStatus={requestStatus ?? null}
            onViewUserProfile={onViewUserProfile}
            onAddFriendSuccess={() =>
              setFriendStatusMap((prev) => ({ ...prev, [friend.id]: { isFriend: prev[friend.id]?.isFriend ?? false, requestStatus: "pending_sent" } }))
            }
            onAcceptSuccess={() => setFriendStatusMap((prev) => ({ ...prev, [friend.id]: { isFriend: true, requestStatus: null } }))}
            onCancelSuccess={() =>
              setFriendStatusMap((prev) => ({ ...prev, [friend.id]: { isFriend: prev[friend.id]?.isFriend ?? false, requestStatus: null } }))
            }
            onUnfriendSuccess={() => {
              setFriendStatusMap((prev) => ({ ...prev, [friend.id]: { isFriend: false, requestStatus: null } }))
              if (isOwnProfile) {
                setFriends((prev) => prev.filter((f) => f.id !== friend.id))
                onFriendsChanged?.()
              }
            }}
          />
        )
      })}
      </div>
      )}
    </div>
  )
}

function ProfileFriendCard({
  friend,
  name,
  initials,
  hoverColor,
  showFriendButton,
  isFriend,
  requestStatus,
  onViewUserProfile,
  onAddFriendSuccess,
  onAcceptSuccess,
  onCancelSuccess,
  onUnfriendSuccess,
}: {
  friend: { id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }
  name: string
  initials: string
  hoverColor: string
  showFriendButton: boolean
  isFriend: boolean
  requestStatus: FriendRequestStatus | null
  onViewUserProfile?: (userId: string) => void
  onAddFriendSuccess?: () => void
  onAcceptSuccess?: () => void
  onCancelSuccess?: () => void
  onUnfriendSuccess?: () => void
}) {
  const [actionLoading, setActionLoading] = useState(false)

  const handleCardClick = () => onViewUserProfile?.(friend.id)

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionLoading) return
    setActionLoading(true)
    try {
      await FriendsService.sendFriendRequest(friend.id)
      toast.success("Friend request sent")
      onAddFriendSuccess?.()
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to send request")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionLoading) return
    setActionLoading(true)
    try {
      await FriendsService.acceptFriendRequest(friend.id)
      toast.success("Friend request accepted")
      onAcceptSuccess?.()
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to accept")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelRequest = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionLoading) return
    setActionLoading(true)
    try {
      await FriendsService.cancelFriendRequest(friend.id)
      toast.success("Friend request cancelled")
      onCancelSuccess?.()
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to cancel")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnfriend = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionLoading) return
    setActionLoading(true)
    try {
      await FriendsService.removeFriend(friend.id)
      toast.success("Removed from friends")
      onUnfriendSuccess?.()
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to remove friend")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div
      role={onViewUserProfile ? "button" : undefined}
      tabIndex={onViewUserProfile ? 0 : undefined}
      onClick={onViewUserProfile ? handleCardClick : undefined}
      onKeyDown={onViewUserProfile ? (e) => (e.key === "Enter" || e.key === " ") && handleCardClick() : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-lg",
        onViewUserProfile && "cursor-pointer",
        hoverColor === "quad-green" && "hover:border-quad-green/30 hover:shadow-quad-green/20",
        hoverColor === "quad-blue" && "hover:border-quad-blue/30 hover:shadow-quad-blue/20",
        hoverColor === "quad-red" && "hover:border-quad-red/30 hover:shadow-quad-red/20",
        hoverColor === "quad-yellow" && "hover:border-quad-yellow/30 hover:shadow-quad-yellow/20"
      )}
      aria-label={onViewUserProfile ? `View ${name}'s profile` : undefined}
    >
      <Avatar className="size-11 shrink-0">
        {friend.avatar_url ? <AvatarImage src={friend.avatar_url} alt="" /> : null}
        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
      </div>
      {showFriendButton && (
        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isFriend ? (
            <>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                <UserCheck className="size-3.5" />
                Friends
              </span>
              <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" disabled={actionLoading} onClick={handleUnfriend}>
                {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Unfriend
              </Button>
            </>
          ) : requestStatus === "pending_sent" ? (
            <>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                Pending
              </span>
              <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" disabled={actionLoading} onClick={handleCancelRequest}>
                {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Cancel request
              </Button>
            </>
          ) : requestStatus === "pending_received" ? (
            <Button size="sm" variant="default" className="h-7 px-2.5 text-xs" disabled={actionLoading} onClick={handleAccept}>
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              Accept
            </Button>
          ) : (
            <Button size="sm" variant="default" className="h-7 px-2.5 text-xs" disabled={actionLoading} onClick={handleAddFriend}>
              {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              Add Friend
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileSettings({
  onEditProfile,
  profile,
  onSaveSocial,
  onSavePrivacy,
  onSaveAppearance,
  canEdit = true,
}: {
  onEditProfile?: () => void
  profile?: ProfileData | null
  onSaveSocial?: (platform: "instagram" | "linkedin" | "twitter" | "github", url: string) => void
  onSavePrivacy?: (isPublic: boolean) => void
  onSaveAppearance?: (theme: "light" | "dark" | "system") => void
  canEdit?: boolean
}) {
  const isMobile = useIsMobile()
  const { signOut } = useAuth()
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [editingSocial, setEditingSocial] = useState<"instagram" | "linkedin" | "twitter" | "github" | null>(null)
  const [socialInput, setSocialInput] = useState("")
  const { theme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Array<{ blocked_id: string; full_name: string | null; public_name: string | null; avatar_url: string | null }>>([])
  const [blockedLoading, setBlockedLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const [blockedListExpanded, setBlockedListExpanded] = useState(false)
  const [hiddenConversations, setHiddenConversations] = useState<DmConversationRow[]>([])
  const [hiddenLoading, setHiddenLoading] = useState(true)
  const [unhidingId, setUnhidingId] = useState<string | null>(null)
  const [hiddenListExpanded, setHiddenListExpanded] = useState(false)
  useEffect(() => setThemeMounted(true), [])

  useEffect(() => {
    if (blockedListExpanded) {
      setBlockedLoading(true)
      BlocksService.getBlockedUsers()
        .then(setBlockedUsers)
        .catch(() => setBlockedUsers([]))
        .finally(() => setBlockedLoading(false))
    }
  }, [blockedListExpanded])

  useEffect(() => {
    if (hiddenListExpanded) {
      setHiddenLoading(true)
      MessagingService.getHiddenConversations()
        .then(setHiddenConversations)
        .catch(() => setHiddenConversations([]))
        .finally(() => setHiddenLoading(false))
    }
  }, [hiddenListExpanded])

  const socialPlatforms = [
    { key: "instagram" as const, Icon: Instagram, label: "Instagram", url: profile?.instagram_url },
    { key: "linkedin" as const, Icon: Linkedin, label: "LinkedIn", url: profile?.linkedin_url },
    { key: "twitter" as const, Icon: Twitter, label: "X", url: profile?.twitter_url },
    { key: "github" as const, Icon: Github, label: "GitHub", url: profile?.github_url },
  ] as const

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: Edit3, label: "Edit Profile", desc: "Update your personal information" },
        { icon: Bell, label: "Notifications", desc: "Manage your notification preferences", comingSoon: true as const },
        { icon: Shield, label: "Privacy", desc: "Public or private profile visibility", isPrivacy: true },
      ],
    },
    {
      title: "Social Accounts",
      isSocial: true,
    },
    {
      title: "Preferences",
      items: [
        { icon: Moon, label: "Appearance", desc: "Dark mode, theme, font size" },
        { icon: BookOpen, label: "Academic Info", desc: "Update your courses and schedule", comingSoon: true as const },
      ],
    },
    {
      title: "Blocked users",
      items: [{ icon: Ban, label: "Blocked users", desc: "Manage people you've blocked", isBlockedList: true }],
    },
    {
      title: "Hidden chats",
      items: [{ icon: EyeOff, label: "Hidden chats", desc: "Chats you've hidden from your list", isHiddenList: true }],
    },
    {
      title: "Support",
      items: [
        { icon: FileText, label: "Repository Privacy Notice", desc: "Review the public-repository privacy notice", href: "/privacy" },
        { icon: FileText, label: "Project Status", desc: "Review the project-status notice", href: "/terms" },
        { icon: FileText, label: "User Guide", desc: "Coming soon", href: "/user-guide" },
        { icon: LogOut, label: "Sign Out", desc: "Log out of your account", isSignOut: true as const },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {settingsGroups.map((group) => (
        <div key={group.title}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.title}</h4>
          <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
            {"isSocial" in group && group.isSocial ? (
              socialPlatforms.map(({ key, Icon, label, url }, idx) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 text-left",
                    idx < socialPlatforms.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingSocial === key && canEdit ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={socialInput}
                          onChange={(e) => setSocialInput(e.target.value)}
                          placeholder={`${label} URL`}
                          className="flex-1 min-w-0 text-sm bg-transparent border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                          autoFocus={!isMobile}
                        />
                        <button
                          onClick={() => {
                            onSaveSocial?.(key, socialInput.trim())
                            setEditingSocial(null)
                          }}
                          className="text-xs font-medium text-primary hover:text-primary/90 shrink-0"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingSocial(null)
                            setSocialInput("")
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : !isValidSocialUrl(url) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              if (canEdit) {
                                setEditingSocial(key)
                                setSocialInput(url ?? "")
                              }
                            }}
                            className="flex items-center gap-2 w-full text-left hover:bg-secondary/50 -mx-4 px-4 py-2 -my-1.5 rounded-lg transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">Connect your {label} account</p>
                            {canEdit && <AlertCircle className="size-3.5 text-warning shrink-0 ml-auto" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>No link attached{canEdit ? " — click to add" : ""}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => {
                          if (canEdit) {
                            setEditingSocial(key)
                            setSocialInput(url ?? "")
                          } else {
                            window.open(normalizeSocialUrl(url)!, "_blank")
                          }
                        }}
                        className="flex items-center gap-2 w-full text-left hover:bg-secondary/50 -mx-4 px-4 py-2 -my-1.5 rounded-lg transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{url}</p>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-auto" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              ("items" in group && group.items != null ? group.items : []).map((item, idx, arr) =>
                "isPrivacy" in item && item.isPrivacy ? (
                  <div
                    key={item.label}
                    className={cn(idx < arr.length - 1 && "border-b border-border")}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <item.icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      {canEdit && onSavePrivacy && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-xs", (profile?.is_public ?? true) ? "text-muted-foreground" : "text-foreground font-medium")}>
                            <Lock className="size-3.5 inline mr-0.5" />
                            Private
                          </span>
                          <Switch
                            checked={profile?.is_public ?? true}
                            onCheckedChange={onSavePrivacy}
                          />
                          <span className={cn("text-xs", (profile?.is_public ?? true) ? "text-foreground font-medium" : "text-muted-foreground")}>
                            <Globe className="size-3.5 inline mr-0.5" />
                            Public
                          </span>
                        </div>
                      )}
                    </div>
                    <Collapsible
                      defaultOpen={false}
                      className="border-t border-border [&[data-state=open]_button_.privacy-about-chevron]:rotate-90"
                    >
                      <CollapsibleTrigger
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-foreground transition-colors",
                          "hover:bg-muted/50 active:bg-muted/60"
                        )}
                      >
                        <Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        About privacy
                        <ChevronRight
                          className="privacy-about-chevron ml-auto size-4 shrink-0 text-muted-foreground transition-transform"
                          aria-hidden
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div
                          className="border-t border-border bg-muted/25 px-4 pb-3 pt-2"
                          role="region"
                          aria-label="About profile privacy"
                        >
                          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                            <p>
                              <span className="font-medium text-foreground">Public</span>
                              {" — "}
                              You can appear in the People tab under Explore (blocked users won’t see each other there). On your profile, others can open Posts, Squads, and Friends and see that content. Your header stays visible too: photo, name, @handle, bio, school details, social links, and post/friend/squad counts.
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Private</span>
                              {" — "}
                              You don’t appear in Explore → People. You may still show up in other searches (for example new messages, squad invites, or @mentions). If someone opens your profile, they see the same header fields as above, but not your posts, squads, or friend list—only a note that the profile is private. You always see your own profile in full.
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ) : item.label === "Appearance" ? (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5",
                      idx < arr.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <item.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {(["light", "dark", "system"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTheme(t)
                            onSaveAppearance?.(t)
                          }}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                            (themeMounted && (theme ?? "system") === t)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t === "light" && <Sun className="size-3" />}
                          {t === "dark" && <Moon className="size-3" />}
                          {t === "system" && <Monitor className="size-3" />}
                          {t === "system" ? "System" : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : "isBlockedList" in item && item.isBlockedList ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setBlockedListExpanded((v) => !v)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <item.icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <ChevronRight className={cn("size-4 text-muted-foreground shrink-0 transition-transform", blockedListExpanded && "rotate-90")} />
                    </button>
                    <Collapsible
                      defaultOpen={false}
                      className="border-t border-border [&[data-state=open]_button_.blocking-about-chevron]:rotate-90"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <CollapsibleTrigger
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-foreground transition-colors",
                          "hover:bg-muted/50 active:bg-muted/60"
                        )}
                      >
                        <Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        About blocking
                        <ChevronRight
                          className="blocking-about-chevron ml-auto size-4 shrink-0 text-muted-foreground transition-transform"
                          aria-hidden
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div
                          className="border-t border-border bg-muted/25 px-4 pb-3 pt-2"
                          role="region"
                          aria-label="About blocking"
                        >
                          <ul className="list-none space-y-2 pl-0 text-xs leading-relaxed text-muted-foreground">
                            {BLOCK_INFO.map((line, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="shrink-0 text-muted-foreground/60">•</span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {blockedListExpanded && (
                      <div className="border-t border-border px-4 py-3.5">
                        {blockedLoading ? (
                          <div className="flex items-center gap-3 py-2">
                            <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1">
                              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                            </div>
                          </div>
                        ) : blockedUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No blocked users</p>
                        ) : (
                          blockedUsers.map((u) => {
                            const name = u.public_name?.trim() || u.full_name?.trim() || "Unknown"
                            const initials = name === "Unknown" ? "?" : name.trim().split(/\s+/).length >= 2
                              ? (name.trim().split(/\s+/)[0][0] + name.trim().split(/\s+/).pop()![0]).toUpperCase().slice(0, 2)
                              : name.slice(0, 2).toUpperCase()
                            return (
                              <div
                                key={u.blocked_id}
                                className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
                              >
                                <Avatar className="size-9 shrink-0">
                                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt="" /> : null}
                                  <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-medium">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                                  {u.public_name?.trim() && <p className="text-xs text-muted-foreground truncate">@{u.public_name.replace(/^@/, "")}</p>}
                                </div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="shrink-0"
                                  disabled={unblockingId === u.blocked_id}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    setUnblockingId(u.blocked_id)
                                    try {
                                      await BlocksService.unblockUser(u.blocked_id)
                                      setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== u.blocked_id))
                                      toast.success("User unblocked")
                                    } catch (err) {
                                      toast.error((err as Error).message ?? "Failed to unblock")
                                    } finally {
                                      setUnblockingId(null)
                                    }
                                  }}
                                >
                                  {unblockingId === u.blocked_id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                                  Unblock
                                </Button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </>
                ) : "isHiddenList" in item && item.isHiddenList ? (
                  <>
                    <button
                      onClick={() => setHiddenListExpanded((v) => !v)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors w-full",
                        "border-b border-border"
                      )}
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <item.icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <ChevronRight className={cn("size-4 text-muted-foreground shrink-0 transition-transform", hiddenListExpanded && "rotate-90")} />
                    </button>
                    {hiddenListExpanded && (
                      <div className="border-t border-border px-4 py-3.5">
                        {hiddenLoading ? (
                          <div className="flex items-center gap-3 py-2">
                            <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1">
                              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                            </div>
                          </div>
                        ) : hiddenConversations.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No hidden chats</p>
                        ) : (
                          hiddenConversations.map((conv) => {
                            const name = conv.other_display_name?.trim() || "Unknown"
                            const initials = name === "Unknown" ? "?" : name.trim().split(/\s+/).length >= 2
                              ? (name.trim().split(/\s+/)[0][0] + name.trim().split(/\s+/).pop()![0]).toUpperCase().slice(0, 2)
                              : name.slice(0, 2).toUpperCase()
                            return (
                              <div
                                key={conv.id}
                                className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
                              >
                                <Avatar className="size-9 shrink-0">
                                  {conv.other_avatar_url ? <AvatarImage src={conv.other_avatar_url} alt="" /> : null}
                                  <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-medium">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                                    {conv.squad_id && (
                                      <span className="shrink-0 inline-flex items-center justify-center text-xs font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                                        Squad
                                      </span>
                                    )}
                                  </div>
                                  {conv.last_message_content && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_content}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="shrink-0"
                                  disabled={unhidingId === conv.id}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    setUnhidingId(conv.id)
                                    try {
                                      await MessagingService.unhideConversation(conv.id)
                                      setHiddenConversations((prev) => prev.filter((c) => c.id !== conv.id))
                                      toast.success("Chat unhidden")
                                    } catch (err) {
                                      toast.error((err as Error).message ?? "Failed to unhide")
                                    } finally {
                                      setUnhidingId(null)
                                    }
                                  }}
                                >
                                  {unhidingId === conv.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                                  Unhide
                                </Button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </>
                ) : "href" in item && item.href ? (
                  <button
                    key={item.label}
                    onClick={() => navigateWithoutReload(item.href)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors w-full",
                      idx < arr.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <item.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </button>
                ) : "comingSoon" in item && item.comingSoon ? (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 text-left w-full",
                      idx < arr.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <item.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
                      Coming soon
                    </Badge>
                  </div>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    disabled={signOutLoading && "isSignOut" in item && item.isSignOut}
                    onClick={
                      item.label === "Edit Profile"
                        ? onEditProfile
                        : "isSignOut" in item && item.isSignOut
                          ? async () => {
                              setSignOutLoading(true)
                              try {
                                const { error } = await signOut()
                                if (error) toast.error(error.message ?? "Couldn't sign out")
                              } finally {
                                setSignOutLoading(false)
                              }
                            }
                          : undefined
                    }
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors w-full",
                      idx < arr.length - 1 && "border-b border-border",
                      signOutLoading && "isSignOut" in item && item.isSignOut && "opacity-70"
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                      <item.icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", item.label === "Sign Out" ? "text-destructive" : "text-foreground")}>{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {signOutLoading && "isSignOut" in item && item.isSignOut ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                )
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export type ProfilePageInitialTab = "posts" | "squads" | "friends" | "saved" | "settings"

export function ProfilePage({
  viewingUserId,
  onBackFromViewing,
  onViewUserProfile,
  onGoToSquad,
  onNavigateToExplore,
  onNavigateToDiscoverSquads,
  initialTab,
  onInitialTabUsed,
}: {
  viewingUserId?: string | null
  onBackFromViewing?: () => void
  onViewUserProfile?: (userId: string) => void
  onGoToSquad?: (squadId: string) => void
  onNavigateToExplore?: () => void
  onNavigateToDiscoverSquads?: () => void
  /** Deep-link (e.g. global search) — cleared via {@link onInitialTabUsed} after user picks another tab. */
  initialTab?: ProfilePageInitialTab | null
  onInitialTabUsed?: () => void
} = {}) {
  const { user } = useAuth()
  const { profile: contextProfile, loading: contextLoading, invalidate } = useProfile()
  const profileUserId = viewingUserId ?? user?.id
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [postCount, setPostCount] = useState<number>(0)
  const [friendCount, setFriendCount] = useState<number>(0)
  const [squadCount, setSquadCount] = useState<number>(0)
  const [loading, setLoading] = useState(!!profileUserId)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "squads" | "friends" | "saved" | "settings">(
    () => initialTab ?? "posts"
  )
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  const selectTab = useCallback(
    (t: ProfilePageInitialTab) => {
      setActiveTab(t)
      onInitialTabUsed?.()
    },
    [onInitialTabUsed]
  )
  const [headerFriendStatus, setHeaderFriendStatus] = useState<{ isFriend: boolean; requestStatus: FriendRequestStatus } | null>(null)
  const [headerFriendLoading, setHeaderFriendLoading] = useState(false)
  const [headerBlocked, setHeaderBlocked] = useState(false)
  const [headerBlockLoading, setHeaderBlockLoading] = useState(false)
  const [blockInfoOpen, setBlockInfoOpen] = useState(false)
  const [blockInfoAnchorRect, setBlockInfoAnchorRect] = useState<BlockInfoAnchorRect | null>(null)

  const isOwnProfile = !viewingUserId || viewingUserId === user?.id

  useEffect(() => {
    if (!profileUserId || !user?.id || isOwnProfile || !onBackFromViewing) return
    BlocksService.isBlockedEither(user.id, profileUserId)
      .then((blocked) => {
        if (blocked) {
          toast.error("You cannot view this profile. Unblock in Settings.")
          onBackFromViewing()
        }
      })
      .catch(() => {})
  }, [profileUserId, user?.id, isOwnProfile, onBackFromViewing])

  useEffect(() => {
    if (!isOwnProfile && (activeTab === "saved" || activeTab === "settings")) {
      setActiveTab("posts")
    }
  }, [isOwnProfile, activeTab])

  useEffect(() => {
    if (!profileUserId || !user?.id || isOwnProfile) {
      setHeaderFriendStatus(null)
      return
    }
    FriendsService.getFriendStatusBatch(user.id, [profileUserId])
      .then((map) => {
        const s = map[profileUserId]
        setHeaderFriendStatus(s ? { isFriend: s.isFriend, requestStatus: s.requestStatus } : null)
      })
      .catch(() => setHeaderFriendStatus(null))
  }, [profileUserId, user?.id, isOwnProfile])

  useEffect(() => {
    if (!profileUserId || !user?.id || isOwnProfile) {
      setHeaderBlocked(false)
      return
    }
    BlocksService.isBlockedByMe(profileUserId)
      .then(setHeaderBlocked)
      .catch(() => setHeaderBlocked(false))
  }, [profileUserId, user?.id, isOwnProfile])

  useEffect(() => {
    if (!profileUserId || !user) {
      setSquadCount(0)
      return
    }
    SquadsService.getSquadCountForUser(profileUserId)
      .then(setSquadCount)
      .catch(() => setSquadCount(0))
  }, [profileUserId, user?.id])

  useEffect(() => {
    if (!profileUserId) {
      setFriendCount(0)
      return
    }
    FriendsService.getFriendCountForUser(profileUserId)
      .then(setFriendCount)
      .catch(() => setFriendCount(0))
  }, [profileUserId])

  useEffect(() => {
    if (!profileUserId) {
      setLoading(false)
      return
    }
    if (isOwnProfile) {
      if (contextLoading) return
      if (contextProfile) {
        setProfile({
          full_name: contextProfile.full_name,
          public_name: contextProfile.public_name,
          class_year: contextProfile.class_year,
          major: contextProfile.major,
          bio: contextProfile.bio,
          avatar_url: contextProfile.avatar_url,
          cover_url: contextProfile.cover_url ?? null,
          location: contextProfile.location,
          created_at: contextProfile.created_at,
          instagram_url: contextProfile.instagram_url,
          linkedin_url: contextProfile.linkedin_url,
          twitter_url: contextProfile.twitter_url,
          github_url: contextProfile.github_url,
          is_public: contextProfile.is_public,
          theme: contextProfile.theme,
        })
        FeedService.getPostCountForUser(profileUserId, user?.id).then(setPostCount)
      } else {
        setProfile({
          full_name: user?.user_metadata?.full_name ?? null,
          public_name: null,
          class_year: null,
          major: null,
          bio: null,
          avatar_url: null,
          cover_url: null,
          location: null,
          created_at: null,
          instagram_url: null,
          linkedin_url: null,
          twitter_url: null,
          github_url: null,
          is_public: true,
          theme: null,
        })
        setPostCount(0)
      }
      setLoading(false)
      return
    }
    const fetchProfile = async () => {
      const [profileRes, postCount] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, public_name, class_year, major, bio, avatar_url, cover_url, location, created_at, instagram_url, linkedin_url, twitter_url, github_url, is_public, theme")
          .eq("id", profileUserId)
          .maybeSingle(),
        FeedService.getPostCountForUser(profileUserId, user?.id),
      ])
      const { data, error } = profileRes
      if (!error && data) {
        setProfile({
          full_name: data.full_name ?? null,
          public_name: data.public_name ?? null,
          class_year: data.class_year ?? null,
          major: data.major ?? null,
          bio: data.bio ?? null,
          avatar_url: data.avatar_url ?? null,
          cover_url: data.cover_url ?? null,
          location: data.location ?? null,
          created_at: data.created_at ?? null,
          instagram_url: data.instagram_url ?? null,
          linkedin_url: data.linkedin_url ?? null,
          twitter_url: data.twitter_url ?? null,
          github_url: data.github_url ?? null,
          is_public: data.is_public ?? true,
          theme: data.theme ?? null,
        })
      } else {
        setProfile(null)
      }
      setPostCount(postCount)
      setLoading(false)
    }
    fetchProfile()
  }, [profileUserId, isOwnProfile, user, contextProfile])

  const handleSaveProfile = async (values: {
    full_name: string
    public_name: string
    class_year: string
    major: string
    bio: string
    location: string
    cover_url?: string | null
  }) => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name || null,
        public_name: values.public_name || null,
        class_year: values.class_year || null,
        major: values.major || null,
        bio: values.bio || null,
        location: values.location || null,
        ...(values.cover_url !== undefined && { cover_url: values.cover_url }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
    if (!error) {
      setProfile((p) =>
        p
          ? {
              ...p,
              full_name: values.full_name || null,
              public_name: values.public_name || null,
              class_year: values.class_year || null,
              major: values.major || null,
              bio: values.bio || null,
              location: values.location || null,
              cover_url: values.cover_url ?? p.cover_url,
            }
          : null
      )
      invalidate()
      setEditing(false)
      toast.success("Profile updated")
    }
    setSaving(false)
  }

  const handleSaveAppearance = async (theme: "light" | "dark" | "system") => {
    if (!user) return
    const { error } = await supabase
      .from("profiles")
      .update({ theme, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (!error) {
      setProfile((p) => (p ? { ...p, theme } : null))
      invalidate()
      toast.success("Edits saved")
    } else {
      toast.error("Failed to save. Try again.")
    }
  }

  const handleSavePrivacy = async (isPublic: boolean) => {
    if (!user) return
    const { error } = await supabase
      .from("profiles")
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (!error) {
      setProfile((p) => (p ? { ...p, is_public: isPublic } : null))
      invalidate()
      toast.success(isPublic ? "Profile is now public" : "Profile is now private")
    } else {
      toast.error("Failed to save. Try again.")
    }
  }

  const handleSaveSocial = async (platform: "instagram" | "linkedin" | "twitter" | "github", url: string) => {
    if (!user) return
    const col = `${platform}_url` as const
    const value = url.trim() || null
    const { error } = await supabase
      .from("profiles")
      .update({ [col]: value, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (!error) {
      setProfile((p) => (p ? { ...p, [col]: value } : null))
      invalidate()
      toast.success("Link saved")
    } else {
      toast.error("Failed to save. Try again.")
    }
  }

  const tabs = [
    { id: "posts" as const, label: "Posts", icon: Grid3X3 },
    { id: "squads" as const, label: "Squads", icon: Users },
    { id: "friends" as const, label: "Friends", icon: UserPlus },
    { id: "saved" as const, label: "Saved", icon: Bookmark },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ]

  const displayProfile = profile ?? null

  if (loading && profileUserId) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 pb-nav-safe md:px-6 md:py-6 md:pb-6">
        <ProfileHeaderSkeleton />
      </div>
    )
  }

  const isPrivate = !isOwnProfile && !(displayProfile?.is_public ?? true)
  const showTabs = isOwnProfile || (displayProfile?.is_public ?? true)
  const tabsToShow = isOwnProfile ? tabs : tabs.filter((t) => t.id !== "settings" && t.id !== "saved")

  return (
    <>
      <BlockInfoDialog
        open={blockInfoOpen}
        onOpenChange={(o) => {
          setBlockInfoOpen(o)
          if (!o) setBlockInfoAnchorRect(null)
        }}
        anchorRect={blockInfoAnchorRect}
      />
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 pb-nav-safe md:px-6 md:py-6 md:pb-6">
      {!isOwnProfile && onBackFromViewing && (
        <button
          onClick={onBackFromViewing}
          className="mb-4 flex shrink-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}
      <div className="shrink-0">
      <ProfileHeader
        profile={displayProfile}
        postCount={postCount}
        friendCount={friendCount}
        squadCount={squadCount}
        editing={editing}
        userId={profileUserId ?? user?.id ?? null}
        onEdit={() => user && setEditing(true)}
        onSave={handleSaveProfile}
        onCancel={() => setEditing(false)}
        onRerollAvatar={isOwnProfile && user ? (avatarUrl) => { setProfile((p) => (p ? { ...p, avatar_url: avatarUrl } : null)); invalidate() } : undefined}
        saving={saving}
        canEdit={isOwnProfile && !!user}
        moreActionsSlot={
          !isOwnProfile && profileUserId && user?.id ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary active:bg-secondary/80 transition-colors"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="size-4" />
                    <span>More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border">
                  <DropdownMenuItem
                    variant={headerBlocked ? "default" : "destructive"}
                    disabled={headerBlockLoading}
                    onClick={async () => {
                      if (!profileUserId) return
                      setHeaderBlockLoading(true)
                      try {
                        if (headerBlocked) {
                          await BlocksService.unblockUser(profileUserId)
                          toast.success("User unblocked")
                          setHeaderBlocked(false)
                        } else {
                        await BlocksService.blockUser(profileUserId)
                        toast.success("User blocked. You can unblock in Settings.")
                          setHeaderBlocked(true)
                        }
                      } catch (e) {
                        toast.error((e as Error).message ?? "Failed")
                      } finally {
                        setHeaderBlockLoading(false)
                      }
                    }}
                  >
                    {headerBlockLoading ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                    {headerBlocked ? "Unblock" : "Block"}
                  </DropdownMenuItem>
                  {!headerBlocked && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        const el = e.currentTarget as HTMLElement
                        const r = el.getBoundingClientRect()
                        setBlockInfoAnchorRect({
                          left: r.left,
                          top: r.top,
                          width: r.width,
                          height: r.height,
                        })
                        setBlockInfoOpen(true)
                      }}
                    >
                      <Info className="size-4" />
                      About blocking
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : undefined
        }
        addFriendSlot={
          !isOwnProfile && profileUserId && user?.id ? (
            <ProfileHeaderAddFriend
              status={headerFriendStatus}
              loading={headerFriendLoading}
              onAddFriend={async () => {
                if (!profileUserId) return
                setHeaderFriendLoading(true)
                try {
                  await FriendsService.sendFriendRequest(profileUserId)
                  toast.success("Friend request sent")
                  setHeaderFriendStatus((s) => (s ? { ...s, requestStatus: "pending_sent" } : { isFriend: false, requestStatus: "pending_sent" }))
                } catch (e) {
                  toast.error((e as Error).message ?? "Failed to send request")
                } finally {
                  setHeaderFriendLoading(false)
                }
              }}
              onAcceptFriend={async () => {
                if (!profileUserId) return
                setHeaderFriendLoading(true)
                try {
                  await FriendsService.acceptFriendRequest(profileUserId)
                  toast.success("Friend request accepted")
                  setHeaderFriendStatus({ isFriend: true, requestStatus: null })
                } catch (e) {
                  toast.error((e as Error).message ?? "Failed to accept")
                } finally {
                  setHeaderFriendLoading(false)
                }
              }}
              onCancelRequest={async () => {
                if (!profileUserId) return
                setHeaderFriendLoading(true)
                try {
                  await FriendsService.cancelFriendRequest(profileUserId)
                  toast.success("Friend request cancelled")
                  setHeaderFriendStatus((s) => (s ? { ...s, requestStatus: null } : { isFriend: false, requestStatus: null }))
                } catch (e) {
                  toast.error((e as Error).message ?? "Failed to cancel")
                } finally {
                  setHeaderFriendLoading(false)
                }
              }}
              onUnfriend={async () => {
                if (!profileUserId) return
                setHeaderFriendLoading(true)
                try {
                  await FriendsService.removeFriend(profileUserId)
                  toast.success("Removed from friends")
                  setHeaderFriendStatus({ isFriend: false, requestStatus: null })
                } catch (e) {
                  toast.error((e as Error).message ?? "Failed to remove friend")
                } finally {
                  setHeaderFriendLoading(false)
                }
              }}
            />
          ) : undefined
        }
      />
      </div>

      {isPrivate ? (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
          <Lock className="size-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">Profile is private</p>
          <p className="text-xs text-muted-foreground mt-1">This user has set their profile to private</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-6 flex shrink-0 items-center gap-1 rounded-lg bg-secondary p-1">
            {tabsToShow.map((tab) => (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="size-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content flows with the shell <main> scroll — header + tabs + body scroll together */}
          <div className="mt-4 flex flex-col">
            {activeTab === "posts" && (
              <ProfilePosts
                userId={profileUserId ?? undefined}
                currentUserId={user?.id}
                profile={displayProfile}
                onPostDeleted={() => setPostCount((c) => Math.max(0, c - 1))}
                canCreatePost={isOwnProfile && !!user}
                onViewUserProfile={onViewUserProfile}
                onGoToSquad={onGoToSquad}
              />
            )}
            {activeTab === "squads" && (
              <ProfileSquads
                profileUserId={profileUserId ?? null}
                isOwnProfile={isOwnProfile}
                currentUserId={user?.id}
                onGoToSquad={(id) => onGoToSquad?.(id)}
                onNavigateToDiscoverSquads={onNavigateToDiscoverSquads}
              />
            )}
            {activeTab === "friends" && (
              <ProfileFriends
                viewingUserId={profileUserId ?? null}
                currentUserId={user?.id}
                onViewUserProfile={onViewUserProfile}
                onNavigateToExplore={onNavigateToExplore}
                onFriendsChanged={
                  profileUserId
                    ? () => FriendsService.getFriendCountForUser(profileUserId).then(setFriendCount)
                    : undefined
                }
              />
            )}
            {activeTab === "saved" && isOwnProfile && (
              <ProfileSaved userId={profileUserId ?? undefined} currentUserId={user?.id} profile={displayProfile} onViewUserProfile={onViewUserProfile} onGoToSquad={onGoToSquad} />
            )}
            {activeTab === "settings" && isOwnProfile && (
              <ProfileSettings
                onEditProfile={() => {
                  if (user) {
                    setEditing(true)
                    selectTab("posts")
                  }
                }}
                profile={displayProfile}
                onSaveSocial={handleSaveSocial}
                onSavePrivacy={handleSavePrivacy}
                onSaveAppearance={handleSaveAppearance}
                canEdit={!!user}
              />
            )}
          </div>
        </>
      )}
    </div>
    </>
  )
}
