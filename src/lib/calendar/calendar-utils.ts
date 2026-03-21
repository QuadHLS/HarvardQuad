import type { CalendarEvent } from "./types"

export const HOURS = Array.from({ length: 24 }, (_, i) => i)
export const HOUR_HEIGHT = 60
/** Must match time grid top inset in `calendar-page` (Tailwind `pt-3` at default theme = 12px). */
export const TIME_GRID_TOP_PADDING = 12

export function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** 5 weeks when possible (Google Calendar–style), 6 only when the month needs it. */
function getMonthWeekRowCount(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  gridStart.setHours(0, 0, 0, 0)
  const lastOfMonth = new Date(year, month + 1, 0)
  lastOfMonth.setHours(0, 0, 0, 0)
  const msPerDay = 86400000
  const spanDays = Math.floor((lastOfMonth.getTime() - gridStart.getTime()) / msPerDay) + 1
  const weeksNeeded = Math.ceil(spanDays / 7)
  return Math.min(6, Math.max(5, weeksNeeded))
}

export function getMonthDays(date: Date): Date[] {
  const rowCount = getMonthWeekRowCount(date)
  const totalCells = rowCount * 7
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  startDate.setHours(0, 0, 0, 0)
  const days: Date[] = []
  const current = new Date(startDate)
  for (let i = 0; i < totalCells; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/** Sidebar / mini picker: always 6 rows (42 days), same as Google Calendar. */
export function getMiniMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  startDate.setHours(0, 0, 0, 0)
  const days: Date[] = []
  const current = new Date(startDate)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function isSameMonth(date: Date, anchor: Date): boolean {
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth()
}

export function formatWeekTitle(anchor: Date): string {
  const weekStart = getWeekDays(anchor)[0]
  const weekEnd = getWeekDays(anchor)[6]
  if (
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear()
  ) {
    return weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }
  const short: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${weekStart.toLocaleDateString("en-US", short)} – ${weekEnd.toLocaleDateString("en-US", short)}, ${weekStart.getFullYear()}`
  }
  return `${weekStart.toLocaleDateString("en-US", { ...short, year: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { ...short, year: "numeric" })}`
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export function formatDateHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" })
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function getEventPosition(event: CalendarEvent): { top: number; height: number } {
  if (event.isAllDay) {
    return { top: 0, height: Math.max(HOUR_HEIGHT * 0.75, 36) }
  }
  const startHour = event.startTime.getHours()
  const startMinute = event.startTime.getMinutes()
  const endHour = event.endTime.getHours()
  const endMinute = event.endTime.getMinutes()
  const top = (startHour + startMinute / 60) * HOUR_HEIGHT
  const duration = endHour + endMinute / 60 - (startHour + startMinute / 60)
  const height = Math.max(duration * HOUR_HEIGHT, 24)
  return { top, height }
}

export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((event) => isSameDay(event.startTime, date))
}

export function getOverlappingEvents(
  events: CalendarEvent[]
): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>()
  const timed = events.filter((e) => !e.isAllDay)
  const sorted = [...timed].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const columns: CalendarEvent[][] = []
  for (const event of sorted) {
    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const columnEvents = columns[col]
      const lastEvent = columnEvents[columnEvents.length - 1]
      if (lastEvent.endTime <= event.startTime) {
        columnEvents.push(event)
        result.set(event.id, { column: col, totalColumns: columns.length })
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push([event])
      result.set(event.id, { column: columns.length - 1, totalColumns: columns.length })
    }
  }
  const totalColumns = columns.length
  for (const [id, value] of result) {
    result.set(id, { ...value, totalColumns })
  }
  return result
}

export function roundToNearest15(date: Date): Date {
  const ms = 1000 * 60 * 15
  return new Date(Math.round(date.getTime() / ms) * ms)
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function getTimeFromPosition(y: number, dayStart: Date): Date {
  const yClamped = Math.max(0, Math.min(y, 24 * HOUR_HEIGHT))
  const hoursFloat = yClamped / HOUR_HEIGHT
  const h = Math.min(23, Math.floor(hoursFloat))
  const minutes = Math.round((hoursFloat - h) * 60)
  const m = Math.min(59, Math.max(0, minutes))
  const date = new Date(dayStart)
  date.setHours(h, m, 0, 0)
  return roundToNearest15(date)
}
