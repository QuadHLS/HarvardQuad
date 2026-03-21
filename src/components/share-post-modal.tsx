import { useState, useEffect, useCallback } from "react"
import { Send, Loader2, X, Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { MessagingService, type DmConversationRow, type SharedPostData } from "@/services/messagingService"
import { FeedService, type FeedPostWithAuthor } from "@/services/feedService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function initials(name: string | null): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export function buildSharedPostData(post: FeedPostWithAuthor): SharedPostData {
  return {
    post_id: post.id,
    post_title: post.title,
    author_name: FeedService.postAuthorName(post),
    author_avatar_url: post.author?.avatar_url ?? null,
    source_type: post.source_type,
    source_id: post.source_id ?? null,
    squad_name: post.source_type === "squad" ? (post.source_name ?? null) : null,
    image_path: post.image_path ?? null,
  }
}

export function SharePostModal({
  open,
  onClose,
  post,
  onShareSuccess,
}: {
  open: boolean
  onClose: () => void
  post: FeedPostWithAuthor | null
  /** Called after successful share with (postId, countAdded). Use to update share_count optimistically. */
  onShareSuccess?: (postId: string, countAdded: number) => void
}) {
  const isMobile = useIsMobile()
  const [conversations, setConversations] = useState<DmConversationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [caption, setCaption] = useState("")
  const [sending, setSending] = useState(false)

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const list = await MessagingService.getAllConversations()
      setConversations(list)
    } catch {
      setConversations([])
      toast.error("Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadConversations()
      setSelectedIds(new Set())
      setCaption("")
    }
  }, [open, loadConversations])

  const handleShare = async () => {
    if (!post || selectedIds.size === 0) return
    setSending(true)
    try {
      const sharedData = buildSharedPostData(post)
      const captionText = caption.trim()
      const ids = Array.from(selectedIds)
      const sendToConversation = async (convId: string) => {
        await MessagingService.sendSharedPostMessage(convId, sharedData)
        if (captionText) {
          await MessagingService.sendTextMessage(convId, captionText)
        }
      }
      const results = await Promise.allSettled(ids.map((id) => sendToConversation(id)))
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length
      if (succeeded > 0) {
        onShareSuccess?.(post.id, succeeded)
        toast.success(succeeded === ids.length
          ? (succeeded === 1 ? "Post shared" : `Post shared to ${succeeded} conversations`)
          : `Post shared to ${succeeded} of ${ids.length} conversations`)
        onClose()
      }
      if (failed > 0) {
        toast.error(failed === ids.length ? "Failed to share" : `${failed} conversation(s) failed`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to share")
    } finally {
      setSending(false)
    }
  }

  const content = (
    <div className="flex flex-col gap-4">
      {post && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground line-clamp-2">{post.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {FeedService.postAuthorName(post)}
            {post.source_type === "squad" && post.source_name && ` · #${post.source_name}`}
          </p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Choose conversation{selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
        </label>
        <ScrollArea className="h-[200px] rounded-lg border border-border">
          <div className="flex flex-col p-2 gap-1">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No conversations yet</p>
            )}
            {!loading &&
              conversations.map((conv) => {
                const isSelected = selectedIds.has(conv.id)
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => toggleSelected(conv.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all",
                      isSelected
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <Avatar className="size-11 shrink-0">
                      {conv.other_avatar_url ? (
                        <img src={conv.other_avatar_url} alt="" className="size-11 rounded-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                          {initials(conv.other_display_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{conv.other_display_name || "Unknown"}</span>
                        {conv.squad_id && (
                          <span className="shrink-0 inline-flex items-center justify-center text-xs font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                            Squad
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message_content || "No messages yet"}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </div>
                    )}
                  </button>
                )
              })}
          </div>
        </ScrollArea>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Add a message (optional)</label>
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this post..."
          className="rounded-lg"
          maxLength={500}
        />
      </div>
      <Button
        onClick={handleShare}
        disabled={selectedIds.size === 0 || sending}
        className="w-full gap-2"
      >
        {sending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {selectedIds.size === 0
          ? "Share"
          : selectedIds.size === 1
            ? "Share"
            : `Share to ${selectedIds.size}`}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
          <SheetHeader>
            <SheetTitle>Share post</SheetTitle>
            <SheetDescription>Send to one or more conversations</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Share post</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">{content}</div>
    </div>
  )
}
