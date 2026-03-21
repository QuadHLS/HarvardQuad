import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { MessagingService } from "@/services/messagingService"

export function useUnreadMessagesCount(): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }
    try {
      const total = await MessagingService.getTotalUnreadCount()
      setCount(total)
    } catch {
      setCount(0)
    }
  }, [user?.id])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  useEffect(() => {
    if (!user) return
    const channel = MessagingService.subscribeToConversations(user.id, fetchCount)
    return () => MessagingService.unsubscribeFromConversations(channel)
  }, [user?.id, fetchCount])

  useEffect(() => {
    if (!user) return
    const msgChannel = MessagingService.subscribeToNewMessages(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchCount, 300)
    })
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      MessagingService.unsubscribeFromNewMessages(msgChannel)
    }
  }, [user?.id, fetchCount])

  useEffect(() => {
    const onFocus = () => fetchCount()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchCount])

  return count
}
