import { useEffect } from "react"
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

export function useNotificationToasts(onNavigate: (page: PageId) => void, activePage: PageId) {
  const { user } = useAuth()

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
          if (activePage === "notifications") return

          const row = payload.new as Record<string, unknown>
          const type = (row?.type as NotificationType) ?? "like"
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
  }, [user?.id, onNavigate, activePage])
}
