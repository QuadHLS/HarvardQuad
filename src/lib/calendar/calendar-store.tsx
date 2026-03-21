import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { CalendarEvent, PostedEvent } from "./types"
import { mockEvents, mockPostedEvents } from "./mock-data"

export type CalendarView = "week" | "day" | "month" | "year"

interface CalendarStoreContextValue {
  events: CalendarEvent[]
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  postedEvents: PostedEvent[]
  addPostedEvent: (event: PostedEvent) => void
  signUpForEvent: (eventId: string, userId: string) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  calendarView: CalendarView
  setCalendarView: (view: CalendarView) => void
}

const CalendarStoreContext = createContext<CalendarStoreContextValue | null>(null)

export function CalendarStoreProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents)
  const [postedEvents, setPostedEvents] = useState<PostedEvent[]>(mockPostedEvents)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>("month")

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => [...prev, event])
  }, [])

  const updateEvent = useCallback((id: string, eventUpdate: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...eventUpdate } : e))
    )
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const addPostedEvent = useCallback((event: PostedEvent) => {
    setPostedEvents((prev) => [event, ...prev])
  }, [])

  const signUpForEvent = useCallback((eventId: string, userId: string) => {
    setPostedEvents((prev) =>
      prev.map((e) =>
        e.id === eventId && !e.signedUpUsers.includes(userId)
          ? {
              ...e,
              signedUpCount: e.signedUpCount + 1,
              signedUpUsers: [...e.signedUpUsers, userId],
            }
          : e
      )
    )
  }, [])

  const value: CalendarStoreContextValue = {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    postedEvents,
    addPostedEvent,
    signUpForEvent,
    selectedDate,
    setSelectedDate,
    calendarView,
    setCalendarView,
  }

  return (
    <CalendarStoreContext.Provider value={value}>
      {children}
    </CalendarStoreContext.Provider>
  )
}

export function useCalendarStore() {
  const ctx = useContext(CalendarStoreContext)
  if (!ctx) throw new Error("useCalendarStore must be used within CalendarStoreProvider")
  return ctx
}
