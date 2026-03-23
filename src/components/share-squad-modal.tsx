import { useState, useEffect, useCallback, useId } from "react"
import { Send, Loader2, X, Check, Calendar, Users as UsersIcon, MessageSquare } from "lucide-react"
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { MessagingService, type DmConversationRow, type SharedSquadData } from "@/services/messagingService"
import { toast } from "sonner"
import { cn, scrollFocusedFieldIntoView } from "@/lib/utils"
import { CATEGORY_LABELS } from "@/lib/squad-constants"

function initials(name: string | null): string {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return name.slice(0, 2).toUpperCase()
}

export function ShareSquadModal({
  open,
  onClose,
  squad,
}: {
  open: boolean
  onClose: () => void
  squad: { id: string; name: string; type: 'open' | 'restricted' | 'private'; member_count?: number; post_count?: number; category?: string; avatar_path?: string | null; created_at?: string | null } | null
}) {
  const convHeadingId = useId()
  const captionInputId = useId()
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
    if (!squad || selectedIds.size === 0) return
    setSending(true)
    try {
      const sharedData: SharedSquadData = {
        squad_id: squad.id,
        squad_name: squad.name,
        squad_type: squad.type,
        member_count: squad.member_count,
        post_count: squad.post_count,
        category: squad.category,
        avatar_path: squad.avatar_path ?? null,
        created_at: squad.created_at ?? null,
      }
      const captionText = caption.trim()
      const ids = Array.from(selectedIds)
      const sendToConversation = async (convId: string) => {
        await MessagingService.sendSharedSquadMessage(convId, sharedData)
        if (captionText) {
          await MessagingService.sendTextMessage(convId, captionText)
        }
      }
      const results = await Promise.allSettled(ids.map((id) => sendToConversation(id)))
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length
      if (succeeded > 0) {
        toast.success(succeeded === ids.length
          ? (succeeded === 1 ? "Squad shared" : `Squad shared to ${succeeded} conversations`)
          : `Squad shared to ${succeeded} of ${ids.length} conversations`)
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

  const squadPreview =
    squad && (
      <div className="shrink-0 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-foreground">{squad.name}</p>
        <div className="flex items-center gap-3 mt-1 flex-nowrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <UsersIcon className="size-3" /> {squad.member_count ?? 0} {(squad.member_count ?? 0) === 1 ? "member" : "members"}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <MessageSquare className="size-3" /> {squad.post_count ?? 0} {(squad.post_count ?? 0) === 1 ? "post" : "posts"}
          </span>
          {squad.category && (
            <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground shrink-0">
              {CATEGORY_LABELS[squad.category] || squad.category}
            </span>
          )}
        </div>
        {squad.created_at && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="size-3 shrink-0" />
            Created {new Date(squad.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    )

  const conversationHeading = (
    <p id={convHeadingId} className="text-sm font-medium text-foreground shrink-0">
      Choose conversation{selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
    </p>
  )

  const conversationListContent = (
    <div className="flex flex-col gap-1">
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
                  : "hover:bg-secondary/50 border border-transparent",
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
  )

  // Desktop: fixed-height Radix ScrollArea (OK here; avoid nesting inside another overflow-y on iOS).
  const conversationPickerDesktop = (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={convHeadingId}>
      {conversationHeading}
      <ScrollArea className="sheet-scroll-frame h-[200px]">
        <div className="p-2">{conversationListContent}</div>
      </ScrollArea>
    </div>
  )

  // Mobile: flex-1 conversation region + single native scroll (matches messages pickers).
  const conversationPickerMobile = (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden" role="group" aria-labelledby={convHeadingId}>
      {conversationHeading}
      <div
        className="sheet-scroll-frame flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-2 touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {conversationListContent}
      </div>
    </div>
  )

  const captionField = (
    <div>
      <label htmlFor={captionInputId} className="text-sm font-medium text-foreground mb-2 block">
        Add a message (optional)
      </label>
      <Input
        id={captionInputId}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onFocus={(e) => scrollFocusedFieldIntoView(e.currentTarget)}
        placeholder="Say something about this squad..."
        className="rounded-lg"
        maxLength={500}
      />
    </div>
  )

  const shareActionButton = (
    <Button onClick={handleShare} disabled={selectedIds.size === 0 || sending} className="w-full gap-2">
      {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      {selectedIds.size === 0 ? "Share" : selectedIds.size === 1 ? "Share" : `Share to ${selectedIds.size}`}
    </Button>
  )

  const content = (
    <div className="flex flex-col gap-4">
      {squadPreview}
      {conversationPickerDesktop}
      {captionField}
      {shareActionButton}
    </div>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Share squad"
        description="Send to one or more conversations"
        variant="form"
        maxHeightClassName="max-h-[80dvh]"
        scrollBody={false}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            {squadPreview}
            {conversationPickerMobile}
          </div>
          <div className="shrink-0 flex flex-col gap-3 border-t border-border/60 bg-background pt-3 mt-2">
            {captionField}
            {shareActionButton}
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }

  if (!open) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Share squad</h3>
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
