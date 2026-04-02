import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { NotificationType } from "@/services/notificationsService"

type PageId = "feed" | "squads" | "messages" | "calendar" | "profile" | "notifications" | "explore"

const TOAST_MESSAGES: Record<NotificationType, string> = {
  like: "Someone liked your post",
  reply: "New reply to your post",
  mention: "Someone mentioned you",
  dm: "New message",
  group_message: "New group message",
  follow: "New follower",
  friend_request: "Friend request",
  friend_accepted: "Friend request accepted",
  squad_invite: "Squad invite",
  invite_accepted: "Invite accepted",
  invite_declined: "Invite declined",
  event: "Event RSVP",
  join_request: "Join request",
  join_request_approved: "Request approved",
  join_request_denied: "Request denied",
  squad_join: "Someone joined your squad",
}

const MESSAGE_TOAST_DEBOUNCE_MS = 4000

/**
 * @param onOpenMessagesWithConversation — Opens Messages and selects this conversation (bell / non-message toasts still use notifications page).
 */
export function useNotificationToasts(
  onNavigate: (page: PageId) => void,
  activePage: PageId,
  onOpenMessagesWithConversation?: (conversationId: string) => void
) {
  const { user } = useAuth()
  const lastMessageToastRef = useRef<{ conversationId: string; at: number } | null>(null)
  const activePageRef = useRef(activePage)
  activePageRef.current = activePage

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("notifications-toast")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (activePageRef.current === "notifications") return

          const row = payload.new as Record<string, unknown>
          const type = (row?.type as NotificationType) ?? "like"
          if (type === "dm" || type === "group_message") return

          const message = TOAST_MESSAGES[type] ?? "New notification"

          toast(message, {
            className: "border-primary/50 bg-primary/10",
            action: {
              label: "View",
              onClick: () => onNavigate("notifications"),
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, onNavigate])

  useEffect(() => {
    if (!user || !onOpenMessagesWithConversation) return

    const channel = supabase
      .channel("message-incoming-toast")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          if (activePageRef.current === "notifications") return

          const row = payload.new as {
            conversation_id?: string
            sender_id?: string
          }
          const conversationId = row.conversation_id
          const senderId = row.sender_id
          if (!conversationId || !senderId || senderId === user.id) return

          const now = Date.now()
          const last = lastMessageToastRef.current
          if (last?.conversationId === conversationId && now - last.at < MESSAGE_TOAST_DEBOUNCE_MS) return

          // Claim debounce slot before await so concurrent handlers for the same conv bail out.
          lastMessageToastRef.current = { conversationId, at: now }

          const [partRes, convRes] = await Promise.all([
            supabase
              .from("conversation_participants")
              .select("muted_at")
              .eq("conversation_id", conversationId)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase.from("conversations").select("type").eq("id", conversationId).maybeSingle(),
          ])

          if (!partRes.data || partRes.data.muted_at) {
            lastMessageToastRef.current = null
            return
          }

          const text =
            convRes.data?.type === "dm" ? TOAST_MESSAGES.dm : TOAST_MESSAGES.group_message

          toast(text, {
            className: "border-primary/50 bg-primary/10",
            action: {
              label: "Open",
              onClick: () => onOpenMessagesWithConversation(conversationId),
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, onOpenMessagesWithConversation])
}
