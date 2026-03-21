import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { NotificationsService } from "@/services/notificationsService"
import { supabase } from "@/lib/supabase"

/** When true, refetches count (e.g. when user navigates to notifications page). */
export function useUnreadNotificationsCount(refreshTrigger?: boolean): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }
    try {
      const total = await NotificationsService.getUnreadCount(user.id)
      setCount(total)
    } catch {
      setCount(0)
    }
  }, [user?.id])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  useEffect(() => {
    if (refreshTrigger) fetchCount()
  }, [refreshTrigger, fetchCount])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        fetchCount
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchCount])

  useEffect(() => {
    const onFocus = () => fetchCount()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchCount])

  return count
}
