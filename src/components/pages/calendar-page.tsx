import {
  Fragment,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Link2,
  Settings,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { cn, pageMainTitleClass } from "@/lib/utils"
import { useIsMobile, useShowSidebar } from "@/hooks/use-mobile"
import type { CalendarEvent, PostedEvent, EventType } from "@/lib/calendar/types"
import {
  useCalendarStore,
  CalendarStoreProvider,
} from "@/lib/calendar/calendar-store"
import {
  getWeekDays,
  getMonthDays,
  getMiniMonthDays,
  formatWeekday,
  formatMonthShort,
  formatMonthYear,
  formatTime,
  formatHour,
  formatWeekTitle,
  isToday,
  isSameDay,
  isSameMonth,
  getEventsForDay,
  getOverlappingEvents,
  getTimeFromPosition,
  getEventPosition,
  HOURS,
  HOUR_HEIGHT,
  TIME_GRID_TOP_PADDING,
} from "@/lib/calendar/calendar-utils"
import { mockSquads } from "@/lib/calendar/mock-data"
import {
  CalendarSidebar,
  DEFAULT_CALENDAR_LAYERS,
  filterEventsByCalendarLayers,
  type CalendarLayerId,
} from "@/components/calendar/calendar-sidebar"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

/** Mobile bottom nav is h-14 (3.5rem) + safe area; FAB sits just above it. */
const MOBILE_CALENDAR_FAB_BOTTOM_CLASS =
  "bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)]"
const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "class", label: "Class" },
  { value: "deadline", label: "Deadline" },
  { value: "study", label: "Study" },
  { value: "squad", label: "Squad" },
]
const TYPE_COLORS: Record<string, string> = {
  class: "bg-chart-3",
  deadline: "bg-destructive",
  event: "bg-primary",
  study: "bg-chart-2",
  squad: "bg-chart-4",
}
const TYPE_COLORS_BLOCK: Record<string, { bg: string; border: string; text: string }> = {
  class: { bg: "bg-chart-3/15", border: "border-l-chart-3", text: "text-foreground" },
  deadline: { bg: "bg-destructive/15", border: "border-l-destructive", text: "text-foreground" },
  event: { bg: "bg-primary/15", border: "border-l-primary", text: "text-foreground" },
  study: { bg: "bg-chart-2/15", border: "border-l-chart-2", text: "text-foreground" },
  squad: { bg: "bg-chart-4/15", border: "border-l-chart-4", text: "text-foreground" },
}
const TYPE_LABELS: Record<string, string> = {
  class: "Class",
  deadline: "Deadline",
  event: "Event",
  study: "Study",
  squad: "Squad",
}
const TYPE_COLORS_DETAIL: Record<string, string> = {
  class: "bg-chart-3/15 text-chart-3",
  deadline: "bg-destructive/15 text-destructive",
  event: "bg-primary/15 text-primary",
  study: "bg-chart-2/15 text-chart-2",
  squad: "bg-chart-4/15 text-chart-4",
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
function formatTimeInput(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

function CurrentTimeIndicator() {
  const now = new Date()
  const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${top}px` }}>
      <div className="flex items-center pl-0.5">
        <div className="size-2 shrink-0 rounded-full bg-primary" />
        <div className="flex-1 h-px bg-primary" />
      </div>
    </div>
  )
}

function EventBlock({
  event,
  column,
  totalColumns,
  onDragEnd,
  onResizeEnd,
  onClick,
}: {
  event: CalendarEvent
  column: number
  totalColumns: number
  onDragEnd: (e: CalendarEvent, s: Date, e2: Date) => void
  onResizeEnd: (e: CalendarEvent, e2: Date) => void
  onClick: () => void
}) {
  const blockRef = useRef<HTMLDivElement>(null)
  const resizeBlockTopRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [tempPosition, setTempPosition] = useState<{ top: number; height: number } | null>(null)
  const { top, height } = tempPosition || getEventPosition(event)
  const colors = TYPE_COLORS_BLOCK[event.type] || TYPE_COLORS_BLOCK.event
  const columnWidth = 100 / totalColumns
  const left = column * columnWidth
  const width = columnWidth - 1

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      if (isResizing || event.isAllDay) return
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      const grid = blockRef.current?.closest("[data-time-grid]") as HTMLElement | null
      if (!grid) return
      const gRect = grid.getBoundingClientRect()
      const yScroll = clientY - gRect.top + grid.scrollTop
      const yDay = Math.max(0, yScroll - TIME_GRID_TOP_PADDING)
      const blockTop = getEventPosition(event).top
      setDragOffset({ x: 0, y: yDay - blockTop })
      setIsDragging(true)
    },
    [event, isResizing]
  )
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (event.isAllDay) return
      resizeBlockTopRef.current =
        tempPosition !== null ? tempPosition.top : getEventPosition(event).top
      setIsResizing(true)
    },
    [event, tempPosition]
  )

  useEffect(() => {
    if (!isDragging && !isResizing) return
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const grid = blockRef.current?.closest("[data-time-grid]") as HTMLElement | null
      if (!grid) return
      const rect = grid.getBoundingClientRect()
      const scrollTop = grid.scrollTop
      const yDay = Math.max(0, clientY - rect.top + scrollTop - TIME_GRID_TOP_PADDING)
      if (isDragging) {
        const newTop = Math.max(0, yDay - dragOffset.y)
        const snappedTop = Math.round(newTop / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4)
        setTempPosition((p) => ({ top: snappedTop, height: p?.height ?? height }))
      } else if (isResizing) {
        const newHeight = Math.max(HOUR_HEIGHT / 4, yDay - resizeBlockTopRef.current)
        const snappedHeight = Math.round(newHeight / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4)
        setTempPosition((p) => ({ top: p?.top ?? top, height: snappedHeight }))
      }
    }
    const handleEnd = () => {
      if (tempPosition && blockRef.current) {
        const container = blockRef.current.closest("[data-time-grid]")
        if (container) {
          const dayStart = new Date(event.startTime)
          dayStart.setHours(0, 0, 0, 0)
          if (isDragging) {
            const frac = tempPosition.top / HOUR_HEIGHT
            const nh = Math.min(23, Math.max(0, Math.floor(frac)))
            const nm = Math.min(59, Math.max(0, Math.round((frac - nh) * 60)))
            const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60)
            const newStart = new Date(dayStart)
            newStart.setHours(nh, nm, 0, 0)
            const newEnd = new Date(newStart.getTime() + duration * 60 * 60 * 1000)
            onDragEnd(event, newStart, newEnd)
          } else if (isResizing) {
            const endFrac = (tempPosition.top + tempPosition.height) / HOUR_HEIGHT
            const eh = Math.min(23, Math.max(0, Math.floor(endFrac)))
            const em = Math.min(59, Math.max(0, Math.round((endFrac - eh) * 60)))
            const newEnd = new Date(dayStart)
            newEnd.setHours(eh, em, 0, 0)
            if (newEnd <= event.startTime) {
              newEnd.setTime(event.startTime.getTime() + 15 * 60 * 1000)
            }
            onResizeEnd(event, newEnd)
          }
        }
      }
      setIsDragging(false)
      setIsResizing(false)
      setTempPosition(null)
    }
    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleEnd)
    document.addEventListener("touchmove", handleMove, { passive: false })
    document.addEventListener("touchend", handleEnd)
    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleEnd)
      document.removeEventListener("touchmove", handleMove)
      document.removeEventListener("touchend", handleEnd)
    }
  }, [isDragging, isResizing, dragOffset, event, height, onDragEnd, onResizeEnd, tempPosition, top])

  return (
    <div
      ref={blockRef}
      className={cn(
        "absolute z-[1] rounded-md border-l-2 px-2 py-1 overflow-hidden cursor-pointer transition-shadow",
        colors.bg,
        colors.border,
        (isDragging || isResizing) && "shadow-lg ring-2 ring-foreground/20 z-50"
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${left}%`,
        width: `${width}%`,
        cursor: event.isAllDay ? "pointer" : undefined,
      }}
      onClick={(e) => {
        if (!isDragging && !isResizing) {
          e.stopPropagation()
          onClick()
        }
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div className="flex flex-col h-full min-h-0">
        <p className={cn("text-xs font-medium truncate", colors.text)}>{event.title}</p>
        {height >= 40 && !event.isAllDay && (
          <p className="text-xs text-muted-foreground truncate">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </p>
        )}
        {height >= 40 && event.isAllDay && (
          <p className="text-xs text-muted-foreground truncate">All day</p>
        )}
        {height >= 56 && event.location && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{event.location}</p>
        )}
      </div>
      {!event.isAllDay && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-foreground/10 transition-colors"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        />
      )}
    </div>
  )
}

function MonthCalendarGrid({
  days,
  monthAnchor,
  visibleEvents,
  selectedDate,
  isMobile,
  onDayPick,
  compact = false,
  roundedClassName = "rounded-xl",
  hideWeekdayRow = false,
  compactFixedLayout = false,
  fillContainer = false,
  mobileFlatMonth = false,
}: {
  days: Date[]
  monthAnchor: Date
  visibleEvents: CalendarEvent[]
  selectedDate: Date
  isMobile: boolean
  /** Omit in year view: days are display-only; navigate via month tile / other views. */
  onDayPick?: (d: Date) => void
  compact?: boolean
  roundedClassName?: string
  /** Compact year tiles on narrow layout: no S M T … row */
  hideWeekdayRow?: boolean
  /** Desktop year view: fixed cell size so tiles don't stretch with viewport */
  compactFixedLayout?: boolean
  /** Desktop month: stretch grid to fill parent width/height */
  fillContainer?: boolean
  /** Mobile continuous month list: no column gutters, shorter rows */
  mobileFlatMonth?: boolean
}) {
  const rows = days.length / 7
  if (compact) {
    return (
      <div
        className={cn(compactFixedLayout && "w-max max-w-full")}
      >
        {!hideWeekdayRow && (
          <div
            className={cn(
              "grid grid-cols-7 text-center",
              compactFixedLayout && "w-max"
            )}
          >
            {WEEKDAYS_SHORT.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "font-medium uppercase text-muted-foreground",
                  compactFixedLayout
                    ? cn(
                        "flex h-6 w-7 shrink-0 items-center justify-center py-0 leading-none",
                        isMobile ? "text-[10px]" : "text-[11px] sm:text-xs"
                      )
                    : isMobile
                      ? "py-px text-[8px]"
                      : "py-px text-[9px] sm:text-[10px]"
                )}
              >
                {d}
              </div>
            ))}
          </div>
        )}
        <div
          className={cn(
            "grid grid-cols-7 gap-y-px text-center",
            rows === 5 ? "grid-rows-5" : "grid-rows-6",
            compactFixedLayout && "w-max"
          )}
        >
          {days.map((day, idx) => {
            const inMonth = isSameMonth(day, monthAnchor)
            /** Mobile: no sidebar mini-month; don't show stale selected-day ring (today still highlighted). */
            const selected =
              !isMobile &&
              isSameDay(day, selectedDate) &&
              isSameMonth(day, monthAnchor)
            const today = isToday(day)
            if (isMobile && !inMonth) {
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-center",
                    compactFixedLayout
                      ? "h-7 w-7 max-h-7 shrink-0"
                      : "h-5 max-h-5"
                  )}
                  aria-hidden
                />
              )
            }
            const dayNumClass = cn(
              "flex items-center justify-center rounded-full font-medium tabular-nums transition-colors",
              isMobile ? "size-4 text-[9px]" : "size-5 text-[10px]",
              !inMonth && "text-muted-foreground/45",
              inMonth && !selected && !today && "text-foreground",
              onDayPick && inMonth && !selected && !today && "hover:bg-muted",
              today && "bg-primary text-primary-foreground",
              onDayPick && today && "hover:bg-primary/90",
              selected && !today && "bg-primary/20 text-primary"
            )
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-center",
                  compactFixedLayout
                    ? "h-7 w-7 max-h-7 shrink-0"
                    : isMobile
                      ? "h-5 max-h-5"
                      : "h-6 max-h-6 sm:h-7 sm:max-h-7"
                )}
              >
                {onDayPick ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayPick(new Date(day))
                    }}
                    className={dayNumClass}
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <span className={cn(dayNumClass, "cursor-default select-none")}>
                    {day.getDate()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDayCell = (idx: number) => {
    const day = days[idx]
    const evs = getEventsForDay(visibleEvents, day)
    const isSelected =
      !isMobile && isSameDay(day, selectedDate)
    const inCurrentMonth = isSameMonth(day, monthAnchor)
    if (isMobile && !inCurrentMonth) {
      return (
        <div
          className={cn(
            "min-h-0 min-w-0",
            mobileFlatMonth && "aspect-square w-full bg-background",
            !mobileFlatMonth &&
              "text-left flex flex-col justify-center bg-white dark:bg-card p-1",
            fillContainer ? "h-full min-h-0" : !mobileFlatMonth && "min-h-12"
          )}
          aria-hidden
        />
      )
    }
    const flatInteractive = mobileFlatMonth && onDayPick
    const outerClass = cn(
      "min-h-0 min-w-0 text-left transition-colors",
      mobileFlatMonth &&
        cn(
          "aspect-square w-full bg-background p-0 flex flex-col items-center justify-center overflow-hidden",
          flatInteractive && "hover:bg-muted/40"
        ),
      !mobileFlatMonth &&
        cn(
          "flex flex-col justify-center items-center bg-white dark:bg-card",
          onDayPick && "hover:bg-muted/50",
          "p-1 sm:p-2",
          fillContainer
            ? "h-full min-h-0"
            : isMobile
              ? "min-h-12"
              : "min-h-[4.5rem] sm:min-h-24"
        ),
      !inCurrentMonth && "opacity-60",
      !onDayPick && "cursor-default"
    )
    const inner = (
      <>
        {idx < 7 && !mobileFlatMonth && (
          <span className="self-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isMobile ? WEEKDAYS_SHORT[idx] : WEEKDAYS[idx]}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            mobileFlatMonth ? "text-[13px] leading-none" : "text-xs self-center",
            !inCurrentMonth && "text-muted-foreground",
            !mobileFlatMonth && "self-center",
            isToday(day) &&
              cn(
                "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
                mobileFlatMonth ? "size-7 text-xs" : "size-5 sm:size-6"
              ),
            isSelected &&
              !isToday(day) &&
              cn(
                "flex items-center justify-center rounded-full bg-primary/20 text-primary",
                mobileFlatMonth ? "size-7" : "size-5 sm:size-6"
              )
          )}
        >
          {!isMobile && day.getDate() === 1
            ? `${day.toLocaleDateString("en-US", { month: "short" })} ${day.getDate()}`
            : day.getDate()}
        </span>
        {evs.length > 0 && (
          <div
            className={cn(
              "flex shrink-0 flex-wrap justify-center",
              mobileFlatMonth
                ? "mt-0.5 max-w-[95%] gap-0.5 leading-none"
                : "gap-0.5 mt-0.5 sm:mt-1"
            )}
          >
            {evs.slice(0, isMobile ? 2 : 3).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "rounded-full",
                  mobileFlatMonth ? "size-[3px]" : "size-1 sm:size-1.5",
                  TYPE_COLORS[event.type] || TYPE_COLORS.event
                )}
              />
            ))}
            {evs.length > (isMobile ? 2 : 3) && (
              <span
                className={cn(
                  "text-muted-foreground",
                  mobileFlatMonth ? "text-[8px] leading-none" : "text-xs"
                )}
              >
                +{evs.length - (isMobile ? 2 : 3)}
              </span>
            )}
          </div>
        )}
        <div className="hidden md:block mt-1 space-y-0.5 flex-1 overflow-hidden">
          {evs.slice(0, 2).map((event) => (
            <div
              key={event.id}
              className={cn(
                "text-xs truncate px-1 py-0.5 rounded",
                event.type === "class" && "bg-chart-3/15 text-chart-3",
                event.type === "deadline" && "bg-destructive/15 text-destructive",
                event.type === "event" && "bg-primary/15 text-primary",
                event.type === "study" && "bg-chart-2/15 text-chart-2",
                event.type === "squad" && "bg-chart-4/15 text-chart-4"
              )}
            >
              {event.title}
            </div>
          ))}
          {evs.length > 2 && (
            <p className="text-xs text-muted-foreground px-1">+{evs.length - 2} more</p>
          )}
        </div>
      </>
    )
    return onDayPick ? (
      <button type="button" className={outerClass} onClick={() => onDayPick(day)}>
        {inner}
      </button>
    ) : (
      <div className={outerClass}>{inner}</div>
    )
  }

  const idxFirstOfMonth = mobileFlatMonth
    ? days.findIndex((d) => isSameMonth(d, monthAnchor) && d.getDate() === 1)
    : -1
  const weekOfFirst =
    mobileFlatMonth && idxFirstOfMonth >= 0 ? Math.floor(idxFirstOfMonth / 7) : -1
  const colOfFirst =
    mobileFlatMonth && idxFirstOfMonth >= 0 ? idxFirstOfMonth % 7 : 0

  if (mobileFlatMonth) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col gap-0 overflow-hidden bg-transparent",
          roundedClassName
        )}
      >
        {Array.from({ length: rows }, (_, weekRow) => {
          const weekOffset = weekRow * 7
          let firstInMonth = -1
          let lastInMonth = -1
          for (let col = 0; col < 7; col++) {
            if (isSameMonth(days[weekOffset + col], monthAnchor)) {
              if (firstInMonth < 0) firstInMonth = col
              lastInMonth = col
            }
          }
          const showTitle = weekRow === weekOfFirst && idxFirstOfMonth >= 0
          const dividerRow = showTitle ? 2 : 1
          const cellsRow = showTitle ? 3 : 2

          return (
            <div
              key={`week-${weekRow}`}
              className="grid min-w-0 grid-cols-7 gap-x-1"
            >
              {showTitle && (
                <h3
                  className="pb-1 text-center text-base font-semibold leading-none text-foreground"
                  style={{ gridColumn: colOfFirst + 1, gridRow: 1 }}
                >
                  {formatMonthShort(monthAnchor)}
                </h3>
              )}
              {firstInMonth >= 0 && (
                <div
                  className="h-px min-h-px self-center bg-border/60 dark:bg-border/80"
                  style={{
                    gridColumn: `${firstInMonth + 1} / ${lastInMonth + 2}`,
                    gridRow: dividerRow,
                  }}
                  aria-hidden
                />
              )}
              {Array.from({ length: 7 }, (_, col) => (
                <div
                  key={weekOffset + col}
                  className="min-h-0 min-w-0"
                  style={{ gridColumn: col + 1, gridRow: cellsRow }}
                >
                  {renderDayCell(weekOffset + col)}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-7 overflow-hidden gap-px bg-border shadow-sm",
        fillContainer && "min-h-0 w-full flex-1",
        roundedClassName
      )}
      style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    >
      {days.map((_, idx) => (
        <Fragment key={idx}>{renderDayCell(idx)}</Fragment>
      ))}
    </div>
  )
}

/** Desktop: bottom-right floating panel (matches squads / feed / messages). */
function CalendarDesktopFloatingPanel({
  open,
  onClose,
  title,
  subtitle,
  srDescription,
  wide,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  srDescription?: string
  wide?: boolean
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        wide ? "w-[min(440px,calc(100vw-3rem))]" : "w-[400px]"
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 pr-2">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
          {srDescription ? <p className="sr-only">{srDescription}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  )
}

function CalendarPageContent() {
  const {
    calendarView,
    setCalendarView,
    selectedDate,
    setSelectedDate,
    events,
    updateEvent,
    addEvent,
    deleteEvent,
    addPostedEvent,
  } = useCalendarStore()
  const isMobile = useIsMobile()
  /** < md: no step arrows; month/year are long vertical lists (often multi-year). */
  const narrowCalendar = !useShowSidebar()

  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newEventStart, setNewEventStart] = useState<Date | undefined>()
  const [newEventEnd, setNewEventEnd] = useState<Date | undefined>()
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [calendarLayers, setCalendarLayers] = useState(DEFAULT_CALENDAR_LAYERS)
  /** Mobile month list: year shown on back control follows scroll position. */
  const [monthScrollBackYear, setMonthScrollBackYear] = useState(() =>
    selectedDate.getFullYear()
  )

  const visibleEvents = useMemo(
    () => filterEventsByCalendarLayers(events, calendarLayers),
    [events, calendarLayers]
  )

  const handleCalendarLayerChange = useCallback(
    (id: CalendarLayerId, visible: boolean) => {
      setCalendarLayers((p) => ({ ...p, [id]: visible }))
    },
    []
  )

  useEffect(() => {
    if (isMobile && calendarView === "week") setCalendarView("day")
  }, [isMobile, calendarView, setCalendarView])

  /** Mobile calendar: land on year; drill year → month → day (no view switcher). */
  const mobileCalDrillInitialized = useRef(false)
  useEffect(() => {
    if (!isMobile || mobileCalDrillInitialized.current) return
    mobileCalDrillInitialized.current = true
    setCalendarView("year")
  }, [isMobile, setCalendarView])

  const handleMobileCalendarBack = useCallback(() => {
    if (calendarView === "day") setCalendarView("month")
    else if (calendarView === "month") {
      setSelectedDate(new Date(monthScrollBackYear, 0, 1))
      setCalendarView("year")
    }
  }, [calendarView, setCalendarView, setSelectedDate, monthScrollBackYear])

  /** Month: scrolled year. Day: month only (no year); phone has no mini calendar for context. */
  const mobileCalendarBackLabel =
    calendarView === "day"
      ? selectedDate.toLocaleDateString("en-US", { month: "short" })
      : calendarView === "month"
        ? String(monthScrollBackYear)
        : ""

  const mobileCalendarBackAriaLabel =
    calendarView === "month"
      ? `Open year ${monthScrollBackYear}`
      : calendarView === "day"
        ? `Back to ${formatMonthYear(selectedDate)}`
        : ""

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null)
    setNewEventStart(undefined)
    setNewEventEnd(undefined)
    setEventDialogOpen(true)
  }, [])

  const handlePostEvent = useCallback(() => setPostDialogOpen(true), [])

  const handleCreateEvent = useCallback((start: Date, end: Date) => {
    setEditingEvent(null)
    setNewEventStart(start)
    setNewEventEnd(end)
    setEventDialogOpen(true)
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setDetailEvent(event)
    setDetailOpen(true)
  }, [])

  const handleEditFromDetail = useCallback(() => {
    setDetailOpen(false)
    setEditingEvent(detailEvent)
    setEventDialogOpen(true)
  }, [detailEvent])

  const handleDeleteFromDetail = useCallback(() => {
    if (detailEvent) {
      deleteEvent(detailEvent.id)
      setDetailOpen(false)
      setDetailEvent(null)
    }
  }, [detailEvent, deleteEvent])

  const handleSubmitEvent = useCallback(
    (data: Omit<CalendarEvent, "id">) => {
      if (editingEvent) {
        updateEvent(editingEvent.id, data)
      } else {
        addEvent({ ...data, id: `event-${Date.now()}` })
      }
    },
    [editingEvent, addEvent, updateEvent]
  )

  const handleSubmitPostEvent = useCallback(
    (
      data: Omit<
        PostedEvent,
        "id" | "signedUpCount" | "signedUpUsers" | "authorId" | "authorName" | "createdAt"
      >
    ) => {
      addPostedEvent({
        ...data,
        id: `post-${Date.now()}`,
        signedUpCount: 0,
        signedUpUsers: [],
        authorId: "current-user",
        authorName: "You",
        createdAt: new Date(),
      })
      addEvent({
        id: `event-from-post-${Date.now()}`,
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        type: "event",
        location: data.location,
        notes: data.message,
      })
    },
    [addPostedEvent, addEvent]
  )

  const handleDeleteEvent = useCallback(() => {
    if (editingEvent) deleteEvent(editingEvent.id)
  }, [editingEvent, deleteEvent])

  const effectiveView = isMobile && calendarView === "week" ? "day" : calendarView

  const updateMonthScrollBackYear = useCallback(() => {
    const root = monthListScrollRef.current
    if (!root) return
    const sections = root.querySelectorAll<HTMLElement>("[data-calendar-month-section]")
    if (sections.length === 0) return
    const rootRect = root.getBoundingClientRect()
    let bestYear: number | null = null
    let maxOverlap = 0
    sections.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const overlap = Math.max(
        0,
        Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top)
      )
      const y = Number(el.dataset.year)
      if (Number.isFinite(y) && overlap > maxOverlap) {
        maxOverlap = overlap
        bestYear = y
      }
    })
    if (bestYear !== null && maxOverlap > 0) {
      setMonthScrollBackYear(bestYear)
    }
  }, [])

  const prevCalendarViewRef = useRef(calendarView)
  useEffect(() => {
    if (!isMobile) return
    if (calendarView === "month" && prevCalendarViewRef.current !== "month") {
      setMonthScrollBackYear(selectedDate.getFullYear())
    }
    prevCalendarViewRef.current = calendarView
  }, [isMobile, calendarView, selectedDate])
  const availableViews = (["week", "day", "month", "year"] as const)
  const navPrevLabel =
    effectiveView === "year"
      ? "Previous year"
      : effectiveView === "month"
        ? "Previous month"
        : effectiveView === "week"
          ? "Previous week"
          : "Previous day"
  const navNextLabel =
    effectiveView === "year"
      ? "Next year"
      : effectiveView === "month"
        ? "Next month"
        : effectiveView === "week"
          ? "Next week"
          : "Next day"

  const goToToday = useCallback(() => {
    const now = new Date()
    setSelectedDate(now)
    if (!narrowCalendar) return
    const sy = now.getFullYear()
    const sm = now.getMonth()
    // Effects only scroll when focus *keys* change; user may have scrolled the list with the same
    // selected year/month still in state — always scroll explicitly for month & year lists.
    const runScroll = () => {
      if (effectiveView === "month") {
        const root = monthListScrollRef.current
        const el = root?.querySelector<HTMLElement>(
          `[data-calendar-month-section][data-year="${sy}"][data-month="${sm}"]`
        )
        el?.scrollIntoView({ block: "start", behavior: "smooth" })
        if (isMobile) window.setTimeout(() => updateMonthScrollBackYear(), 400)
      } else if (effectiveView === "year") {
        const root = yearListScrollRef.current
        const el = root?.querySelector<HTMLElement>(
          `[data-calendar-year-section][data-year="${sy}"]`
        )
        el?.scrollIntoView({ block: "start", behavior: "smooth" })
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(runScroll))
  }, [setSelectedDate, effectiveView, narrowCalendar, updateMonthScrollBackYear, isMobile])

  /** FAB mounts to body so clicks work (not blocked by main scroll/stacking). */
  const [todayFabPortalReady, setTodayFabPortalReady] = useState(false)
  useEffect(() => setTodayFabPortalReady(true), [])
  const goToPrevious = () => {
    const d = new Date(selectedDate)
    if (effectiveView === "year") d.setFullYear(d.getFullYear() - 1)
    else if (effectiveView === "month") d.setMonth(d.getMonth() - 1)
    else if (effectiveView === "week") d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goToNext = () => {
    const d = new Date(selectedDate)
    if (effectiveView === "year") d.setFullYear(d.getFullYear() + 1)
    else if (effectiveView === "month") d.setMonth(d.getMonth() + 1)
    else if (effectiveView === "week") d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }

  const handleDragEnd = useCallback(
    (event: CalendarEvent, newStart: Date, newEnd: Date) => {
      updateEvent(event.id, { startTime: newStart, endTime: newEnd })
    },
    [updateEvent]
  )
  const handleResizeEnd = useCallback(
    (event: CalendarEvent, newEnd: Date) => {
      updateEvent(event.id, { endTime: newEnd })
    },
    [updateEvent]
  )

  const handleGridClickWeek = useCallback(
    (e: React.MouseEvent, day: Date) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const container = e.currentTarget.closest("[data-time-grid]") as HTMLElement | null
      const scrollTop = container?.scrollTop ?? 0
      const y = e.clientY - rect.top + scrollTop
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const clickTime = getTimeFromPosition(y, dayStart)
      handleCreateEvent(clickTime, new Date(clickTime.getTime() + 60 * 60 * 1000))
    },
    [handleCreateEvent]
  )

  const handleGridClickDay = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const container = e.currentTarget.closest("[data-time-grid]") as HTMLElement | null
      const scrollTop = container?.scrollTop ?? 0
      const y = e.clientY - rect.top + scrollTop
      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const clickTime = getTimeFromPosition(y, dayStart)
      handleCreateEvent(clickTime, new Date(clickTime.getTime() + 60 * 60 * 1000))
    },
    [selectedDate, handleCreateEvent]
  )

  const weekDays = getWeekDays(selectedDate)
  const dayEvents = getEventsForDay(visibleEvents, selectedDate)
  const dayOverlaps = getOverlappingEvents(dayEvents)

  const touchStartRef = useRef<number | null>(null)
  const touchEndRef = useRef<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const weekGridRef = useRef<HTMLDivElement>(null)
  const monthScrollTargetRef = useRef<HTMLElement | null>(null)
  const monthListScrollRef = useRef<HTMLDivElement>(null)
  const yearScrollTargetRef = useRef<HTMLElement | null>(null)
  const yearListScrollRef = useRef<HTMLDivElement>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null
    touchStartRef.current = e.targetTouches[0].clientX
  }
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }
  const onTouchEnd = () => {
    const touchStart = touchStartRef.current
    const touchEnd = touchEndRef.current
    if (touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    if (distance > 50) {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + 1)
      setSelectedDate(d)
    } else if (distance < -50) {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() - 1)
      setSelectedDate(d)
    }
    touchStartRef.current = null
    touchEndRef.current = null
  }

  useEffect(() => {
    const now = new Date()
    const targetScroll = Math.max(
      0,
      TIME_GRID_TOP_PADDING + Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT)
    )
    if (effectiveView === "day" && gridRef.current && isToday(selectedDate)) {
      gridRef.current.scrollTop = targetScroll
    }
    if (effectiveView === "week" && weekGridRef.current) {
      const days = getWeekDays(selectedDate)
      if (days.some((d) => isToday(d))) {
        weekGridRef.current.scrollTop = targetScroll
      }
    }
  }, [effectiveView, selectedDate])

  const monthScrollFocusKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`
  useEffect(() => {
    if (effectiveView !== "month" || !narrowCalendar) return
    const id = requestAnimationFrame(() => {
      monthScrollTargetRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    })
    const t = window.setTimeout(() => updateMonthScrollBackYear(), 400)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
    }
  }, [effectiveView, monthScrollFocusKey, narrowCalendar, updateMonthScrollBackYear])

  useEffect(() => {
    if (!isMobile || effectiveView !== "month") return
    const root = monthListScrollRef.current
    if (!root) return
    updateMonthScrollBackYear()
    const onScroll = () => updateMonthScrollBackYear()
    root.addEventListener("scroll", onScroll, { passive: true })
    const ro = new ResizeObserver(() => updateMonthScrollBackYear())
    ro.observe(root)
    return () => {
      root.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [isMobile, effectiveView, updateMonthScrollBackYear, monthScrollFocusKey])

  const yearScrollFocusKey = String(selectedDate.getFullYear())
  useEffect(() => {
    if (effectiveView !== "year" || !narrowCalendar) return
    const id = requestAnimationFrame(() => {
      yearScrollTargetRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    })
    return () => cancelAnimationFrame(id)
  }, [effectiveView, yearScrollFocusKey, narrowCalendar])

  /** Shared by mobile Create + portaled Today FAB (native <button> for Radix trigger ref + FAB clicks). */
  const mobileCalendarPillButtonClass =
    "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground shadow-none backdrop-blur-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-card touch-manipulation"

  /** Mobile day + year: white rounded sheet on white root; pills should match. */
  const mobileWhiteCalendarChrome = isMobile && (effectiveView === "day" || effectiveView === "year")

  const mobileCreateDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            mobileCalendarPillButtonClass,
            mobileWhiteCalendarChrome && "bg-white dark:bg-card"
          )}
          aria-label="Create"
        >
          <Plus className="size-4 shrink-0" />
          Create
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border">
        <DropdownMenuItem onSelect={handleAddEvent}>Event</DropdownMenuItem>
        <DropdownMenuItem onSelect={handlePostEvent}>Post Event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        mobileWhiteCalendarChrome ? "bg-white dark:bg-card" : "bg-background",
        "h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)]",
        isMobile && "min-h-0 flex-1"
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 min-w-0 flex-col px-0 md:px-4 lg:px-6">
        {isMobile ? (
          calendarView === "year" ? null : (
            <div
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 px-3",
                effectiveView === "day" ? "bg-white dark:bg-card" : "bg-background",
                effectiveView === "month" || effectiveView === "day" ? "py-2" : "py-1.5",
                effectiveView !== "month" &&
                  effectiveView !== "day" &&
                  "border-b border-border/60"
              )}
            >
              <div className="flex min-w-0 flex-1 items-center">
                <button
                  type="button"
                  onClick={handleMobileCalendarBack}
                  className={cn(
                    "flex max-w-full min-w-0 items-center text-left font-medium text-foreground transition-colors touch-manipulation",
                    effectiveView === "month" || effectiveView === "day"
                      ? cn(
                          "h-10 shrink-0 gap-1.5 rounded-full border border-border px-4 text-sm shadow-none backdrop-blur-sm outline-none hover:bg-accent hover:text-accent-foreground active:bg-accent/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 touch-manipulation",
                          effectiveView === "day"
                            ? "bg-white dark:bg-card"
                            : "bg-background dark:bg-card"
                        )
                      : "gap-0.5 rounded-lg py-1.5 pl-0 pr-2 text-sm hover:bg-muted/60 active:bg-muted/80"
                  )}
                  aria-label={mobileCalendarBackAriaLabel}
                >
                  <ChevronLeft
                    className={cn(
                      "shrink-0 opacity-80",
                      effectiveView === "month" || effectiveView === "day" ? "size-4" : "size-5"
                    )}
                  />
                  <span className="min-w-0 truncate tabular-nums">{mobileCalendarBackLabel}</span>
                </button>
              </div>
              {mobileCreateDropdown}
            </div>
          )
        ) : (
          <header className="shrink-0 bg-background my-2">
            <div className="flex items-center gap-2 py-2 sm:gap-4 sm:py-2.5 px-3 md:px-0">
              <div className="hidden w-[min(100%,13.25rem)] max-w-[13.25rem] shrink-0 items-center justify-start pr-2 md:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border-0 bg-white h-11 px-4 py-2 text-sm font-medium shadow-sm outline-none transition-[box-shadow,background-color] hover:bg-muted/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-card dark:shadow-black/10 sm:h-12 sm:px-5"
                      aria-label="Create"
                    >
                      <Plus className="size-4 shrink-0" />
                      Create
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-border">
                    <DropdownMenuItem onSelect={handleAddEvent}>Event</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handlePostEvent}>Post Event</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={goToToday}
                    className="hidden sm:flex items-center justify-center gap-1.5 rounded-full border border-border bg-background h-9 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50 sm:h-10 sm:px-4 sm:py-2.5 sm:text-sm"
                    aria-label="Go to today"
                  >
                    Today
                  </button>
                  <div className={cn("items-center", narrowCalendar ? "hidden" : "flex")}>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={goToPrevious}
                      className="rounded-full"
                      aria-label={navPrevLabel}
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={goToNext}
                      className="rounded-full"
                      aria-label={navNextLabel}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </div>
                  <h1 className={cn(pageMainTitleClass, "truncate")}>
                    {effectiveView === "day"
                      ? selectedDate.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : effectiveView === "week"
                        ? formatWeekTitle(selectedDate)
                        : effectiveView === "year"
                          ? narrowCalendar
                            ? "Calendar"
                            : String(selectedDate.getFullYear())
                          : narrowCalendar && effectiveView === "month"
                            ? "Calendar"
                            : formatMonthYear(selectedDate)}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-background h-9 px-3 py-2 text-xs font-medium capitalize transition-colors hover:bg-muted/50 sm:h-10 sm:px-4 sm:py-2.5 sm:text-sm"
                        aria-label="Calendar view"
                      >
                        {effectiveView === "week"
                          ? "Week"
                          : effectiveView === "day"
                            ? "Day"
                            : effectiveView === "year"
                              ? "Year"
                              : "Month"}
                        <ChevronDown className="size-4 shrink-0 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-border">
                      {availableViews.map((view) => (
                        <DropdownMenuItem
                          key={view}
                          onSelect={() => setCalendarView(view)}
                          className="capitalize"
                        >
                          {view}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden sm:inline-flex">
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background h-9 px-3 py-2 text-xs font-medium opacity-60 cursor-not-allowed sm:h-10 sm:px-4 sm:py-2.5 sm:text-sm"
                          aria-label="Connect calendar (coming soon)"
                        >
                          <Link2 className="size-4 shrink-0" />
                          Connect
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden sm:inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled
                          className="rounded-full opacity-60 cursor-not-allowed"
                          aria-label="Calendar settings (coming soon)"
                        >
                          <Settings className="size-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <CalendarSidebar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            layers={calendarLayers}
            onLayerChange={handleCalendarLayerChange}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:pl-3">
      {effectiveView === "week" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background md:pb-4">
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card">
          <div className="relative z-20 flex shrink-0 items-stretch border-b border-border bg-white dark:bg-card">
            <div className="w-16 shrink-0 bg-white dark:bg-card" />
            <div className="grid min-w-0 flex-1 grid-cols-7 bg-white dark:bg-card">
              {weekDays.map((day, idx) => {
                const sel = isSameDay(day, selectedDate)
                const tod = isToday(day)
                return (
                  <div
                    key={idx}
                    className="flex h-full min-h-[4.5rem] flex-col items-center justify-center gap-1.5 bg-white px-0.5 py-3 dark:bg-card sm:min-h-[5rem] sm:gap-2 sm:py-4"
                  >
                    <p
                      className={cn(
                        "text-xs uppercase tracking-wide",
                        tod ? "text-primary" : sel ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {formatWeekday(day)}
                    </p>
                    <p
                      className={cn(
                        "text-xl font-normal sm:text-2xl",
                        tod &&
                          "mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-11",
                        !tod &&
                          sel &&
                          "mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary sm:size-11",
                        !tod && !sel && "text-foreground"
                      )}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          <div
            ref={weekGridRef}
            className="relative z-0 min-h-0 flex-1 overflow-auto bg-white dark:bg-card"
            data-time-grid
          >
            <div
              className="flex min-h-full"
              style={{ paddingTop: TIME_GRID_TOP_PADDING }}
            >
              <div className="w-16 shrink-0 bg-white dark:bg-card sticky left-0 z-[5]">
                {HOURS.map((hour) => (
                  <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                    <span className="absolute top-0 -translate-y-1/2 right-2 text-xs text-muted-foreground tabular-nums leading-none">
                      {formatHour(hour)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-7 border-l border-border bg-white dark:bg-card">
                {weekDays.map((day, dayIdx) => {
                  const evs = getEventsForDay(visibleEvents, day)
                  const overlaps = getOverlappingEvents(evs)
                  return (
                    <div
                      key={dayIdx}
                      className="relative border-r border-border last:border-r-0 bg-white dark:bg-card"
                      onClick={(e) => handleGridClickWeek(e, day)}
                    >
                      {HOURS.map((hour) => (
                        <div key={hour} className="border-b border-border/50" style={{ height: `${HOUR_HEIGHT}px` }} />
                      ))}
                      <div className="absolute inset-0">
                        {evs.length === 0 && (
                          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none px-0.5">
                            <p className="text-center text-[10px] text-muted-foreground sm:text-xs">
                              No events
                            </p>
                          </div>
                        )}
                        {evs.map((event) => {
                          const o = overlaps.get(event.id) || { column: 0, totalColumns: 1 }
                          return (
                            <EventBlock
                              key={event.id}
                              event={event}
                              column={o.column}
                              totalColumns={o.totalColumns}
                              onDragEnd={handleDragEnd}
                              onResizeEnd={handleResizeEnd}
                              onClick={() => handleEventClick(event)}
                            />
                          )
                        })}
                      </div>
                      {isToday(day) && <CurrentTimeIndicator />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {effectiveView === "day" && (
        <div
          className={cn(
            "flex flex-1 min-h-0 flex-col overflow-hidden md:pb-4",
            isMobile ? "bg-white dark:bg-card" : "bg-background"
          )}
          onTouchStart={isMobile ? onTouchStart : undefined}
          onTouchMove={isMobile ? onTouchMove : undefined}
          onTouchEnd={isMobile ? onTouchEnd : undefined}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card">
          <div className="sticky top-0 z-20 flex shrink-0 items-stretch border-b border-border bg-white dark:bg-card">
            {!isMobile && <div className="w-16 shrink-0 bg-white dark:bg-card" aria-hidden />}
            <div
              className={cn(
                "grid min-w-0 grid-cols-7 bg-white dark:bg-card",
                isMobile ? "w-full px-0.5 py-2" : "min-h-0 flex-1"
              )}
            >
              {getWeekDays(selectedDate).map((day) => {
                const sel = isSameDay(day, selectedDate)
                const tod = isToday(day)
                return (
                  <button
                    key={day.toDateString()}
                    type="button"
                    onClick={() => setSelectedDate(new Date(day))}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center rounded-lg transition-colors touch-manipulation",
                      isMobile
                        ? "gap-1 py-1 active:bg-muted/50"
                        : "h-full min-h-[4.5rem] gap-1.5 bg-white px-0.5 py-3 dark:bg-card sm:min-h-[5rem] sm:gap-2 sm:py-4 hover:bg-muted/40 active:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        isMobile
                          ? "text-[10px] font-medium uppercase leading-none tabular-nums"
                          : "text-xs font-normal uppercase tracking-wide",
                        tod ? "text-primary" : sel ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {isMobile ? WEEKDAYS_SHORT[day.getDay()] : formatWeekday(day)}
                    </span>
                    <span
                      className={cn(
                        isMobile
                          ? cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-normal tabular-nums",
                              tod && "bg-primary text-primary-foreground",
                              sel && !tod && "bg-primary/20 text-primary",
                              !sel && !tod && "text-foreground"
                            )
                          : cn(
                              "text-xl font-normal sm:text-2xl",
                              tod &&
                                "mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-11",
                              !tod &&
                                sel &&
                                "mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary sm:size-11",
                              !tod && !sel && "text-foreground"
                            )
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div ref={gridRef} className="relative z-0 flex-1 overflow-auto bg-white dark:bg-card" data-time-grid>
            <div
              className="flex min-h-full"
              style={{ paddingTop: TIME_GRID_TOP_PADDING }}
            >
              <div className="w-16 shrink-0 bg-white dark:bg-card sticky left-0 z-[5]">
                {HOURS.map((hour) => (
                  <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                    <span className="absolute top-0 -translate-y-1/2 right-2 text-xs text-muted-foreground tabular-nums leading-none">
                      {formatHour(hour)}
                    </span>
                  </div>
                ))}
              </div>
            <div
              className="relative min-w-0 flex-1 border-l border-border bg-white dark:bg-card"
                onClick={handleGridClickDay}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="border-b border-border/50" style={{ height: `${HOUR_HEIGHT}px` }} />
                ))}
                <div className="absolute inset-0">
                  {dayEvents.map((event) => {
                    const o = dayOverlaps.get(event.id) || { column: 0, totalColumns: 1 }
                    return (
                      <EventBlock
                        key={event.id}
                        event={event}
                        column={o.column}
                        totalColumns={o.totalColumns}
                        onDragEnd={handleDragEnd}
                        onResizeEnd={handleResizeEnd}
                        onClick={() => handleEventClick(event)}
                      />
                    )
                  })}
                </div>
                {isToday(selectedDate) && <CurrentTimeIndicator />}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-muted-foreground text-sm px-4 text-center">
                      No events scheduled.{!isMobile && " Click to create one."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          {isMobile && (
            <div className="shrink-0 border-t border-border bg-muted/50 py-2 text-center text-xs text-muted-foreground">
              Swipe left or right to change days
            </div>
          )}
        </div>
      )}

      {effectiveView === "month" && (
        isMobile ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <div
              ref={monthListScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-0"
            >
              <div className="sticky top-0 z-10 mb-2 border-b border-border/50 bg-background py-2">
                <div className="grid grid-cols-7 gap-0 text-center text-[10px] font-medium uppercase leading-none text-muted-foreground">
                  {WEEKDAYS_SHORT.map((d, i) => (
                    <div key={i} className="tabular-nums">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              {Array.from({ length: 7 }, (_, yi) => {
                const y = selectedDate.getFullYear() - 3 + yi
                return (
                  <Fragment key={y}>
                    {Array.from({ length: 12 }, (_, m) => {
                      const monthAnchor = new Date(y, m, 1)
                      const days = getMonthDays(monthAnchor)
                      return (
                        <section
                          key={`${y}-${m}`}
                          data-calendar-month-section
                          data-year={y}
                          data-month={m}
                          ref={(el) => {
                            if (
                              y === selectedDate.getFullYear() &&
                              m === selectedDate.getMonth()
                            ) {
                              monthScrollTargetRef.current = el
                            }
                          }}
                          className="mb-7 scroll-mt-2 last:mb-4"
                        >
                          <MonthCalendarGrid
                            mobileFlatMonth
                            roundedClassName="rounded-none"
                            days={days}
                            monthAnchor={monthAnchor}
                            visibleEvents={visibleEvents}
                            selectedDate={selectedDate}
                            isMobile={isMobile}
                            onDayPick={(d) => {
                              setSelectedDate(d)
                              setCalendarView("day")
                            }}
                          />
                        </section>
                      )
                    })}
                  </Fragment>
                )
              })}
            </div>
          </div>
        ) : narrowCalendar ? (
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-background">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card">
              <div
                ref={monthListScrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5"
              >
                {Array.from({ length: 7 }, (_, yi) => {
                  const y = selectedDate.getFullYear() - 3 + yi
                  return (
                    <Fragment key={y}>
                      <h2 className="sticky top-0 z-10 mb-3 border-b border-border/60 bg-white py-2 text-sm font-semibold text-muted-foreground dark:bg-card">
                        {y}
                      </h2>
                      {Array.from({ length: 12 }, (_, m) => {
                        const monthAnchor = new Date(y, m, 1)
                        const days = getMonthDays(monthAnchor)
                        return (
                          <section
                            key={`${y}-${m}`}
                            data-calendar-month-section
                            data-year={y}
                            data-month={m}
                            ref={(el) => {
                              if (
                                y === selectedDate.getFullYear() &&
                                m === selectedDate.getMonth()
                              ) {
                                monthScrollTargetRef.current = el
                              }
                            }}
                            className="mb-8 scroll-mt-4 last:mb-4"
                          >
                            <h3 className="mb-2 px-0.5 text-base font-semibold text-foreground">
                              {formatMonthShort(monthAnchor)}
                            </h3>
                            <MonthCalendarGrid
                              days={days}
                              monthAnchor={monthAnchor}
                              visibleEvents={visibleEvents}
                              selectedDate={selectedDate}
                              isMobile={isMobile}
                              onDayPick={(d) => {
                                setSelectedDate(d)
                                setCalendarView("day")
                              }}
                            />
                          </section>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4 md:px-5 md:pb-5">
              <MonthCalendarGrid
                fillContainer
                days={getMonthDays(
                  new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                )}
                monthAnchor={
                  new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                }
                visibleEvents={visibleEvents}
                selectedDate={selectedDate}
                isMobile={isMobile}
                onDayPick={(d) => {
                  setSelectedDate(d)
                  setCalendarView("day")
                }}
              />
            </div>
          </div>
        )
      )}

      {effectiveView === "year" && (
        <div
          className={cn(
            "flex flex-1 min-h-0 flex-col overflow-hidden md:pb-4",
            isMobile ? "bg-white dark:bg-card" : "bg-background"
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card",
              isMobile && "relative"
            )}
          >
            <div
              ref={yearListScrollRef}
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 md:p-4",
                isMobile && "pt-12"
              )}
            >
              {narrowCalendar ? (
                <>
                  {Array.from({ length: 7 }, (_, yi) => {
                      const y = selectedDate.getFullYear() - 3 + yi
                      return (
                        <section
                          key={y}
                          data-calendar-year-section
                          data-year={y}
                          ref={(el) => {
                            if (y === selectedDate.getFullYear()) {
                              yearScrollTargetRef.current = el
                            }
                          }}
                          className="mb-10 scroll-mt-4 last:mb-6"
                        >
                          <h2 className="mb-4 border-b border-border/60 py-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {y}
                          </h2>
                          <div className="grid w-full grid-cols-3 grid-rows-4 gap-x-2 gap-y-3 sm:gap-x-2 sm:gap-y-4">
                            {Array.from({ length: 12 }, (_, m) => {
                              const monthStart = new Date(y, m, 1)
                              const tileDays = getMiniMonthDays(monthStart)
                              return (
                                <div
                                  key={m}
                                  className={cn(
                                    "flex min-w-0 flex-col gap-1",
                                    isMobile &&
                                      "cursor-pointer rounded-lg p-1 -m-1 transition-colors active:bg-muted/40"
                                  )}
                                  onClick={
                                    isMobile
                                      ? () => {
                                          setSelectedDate(monthStart)
                                          setCalendarView("month")
                                        }
                                      : undefined
                                  }
                                >
                                  <span className="text-left text-sm font-semibold leading-tight text-foreground sm:text-base">
                                    {monthStart.toLocaleDateString("en-US", {
                                      month: "short",
                                    })}
                                  </span>
                                  <div className="min-w-0 w-full">
                                    <MonthCalendarGrid
                                      days={tileDays}
                                      monthAnchor={monthStart}
                                      visibleEvents={visibleEvents}
                                      selectedDate={selectedDate}
                                      isMobile={isMobile}
                                      compact
                                      hideWeekdayRow
                                      onDayPick={
                                        isMobile
                                          ? undefined
                                          : (d) => {
                                              setSelectedDate(d)
                                              setCalendarView("day")
                                            }
                                      }
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </section>
                      )
                    }
                  )}
                </>
              ) : (
                <div className="grid w-full grid-cols-3 grid-rows-4 justify-items-start gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5 md:gap-x-4 md:gap-y-7 xl:grid-cols-4 xl:grid-rows-3">
                  {Array.from({ length: 12 }, (_, m) => {
                    const monthStart = new Date(selectedDate.getFullYear(), m, 1)
                    const tileDays = getMiniMonthDays(monthStart)
                    return (
                      <div
                        key={m}
                        className="flex w-max max-w-full min-w-0 flex-col items-start"
                      >
                        <p
                          className={cn(
                            "mb-1 text-left font-semibold text-foreground",
                            isMobile ? "text-[11px]" : "text-xs sm:text-sm"
                          )}
                        >
                          {monthStart.toLocaleDateString("en-US", { month: "long" })}
                        </p>
                        <MonthCalendarGrid
                          days={tileDays}
                          monthAnchor={monthStart}
                          visibleEvents={visibleEvents}
                          selectedDate={selectedDate}
                          isMobile={isMobile}
                          compact
                          compactFixedLayout
                          onDayPick={
                            isMobile
                              ? undefined
                              : (d) => {
                                  setSelectedDate(d)
                                  setCalendarView("day")
                                }
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {isMobile && (
              <div className="pointer-events-none absolute right-3 top-2 z-50">
                <div className="pointer-events-auto">{mobileCreateDropdown}</div>
              </div>
            )}
          </div>
        </div>
      )}

          </div>
        </div>
      </div>

      {/* Event Dialog */}
      {(() => {
        const EventFormInner = ({
          event,
          defaultStart,
          defaultEnd,
          onSubmit,
          onDelete,
          onCancel,
        }: {
          event: CalendarEvent | null
          defaultStart?: Date
          defaultEnd?: Date
          onSubmit: (d: Omit<CalendarEvent, "id">) => void
          onDelete?: () => void
          onCancel: () => void
        }) => {
          const [isLoading, setIsLoading] = useState(false)
          const [formData, setFormData] = useState({
            title: event?.title || "",
            type: (event?.type || "event") as EventType,
            date: event?.startTime ? formatDateInput(event.startTime) : defaultStart ? formatDateInput(defaultStart) : formatDateInput(new Date()),
            startTime: event?.startTime ? formatTimeInput(event.startTime) : defaultStart ? formatTimeInput(defaultStart) : "09:00",
            endTime: event?.endTime ? formatTimeInput(event.endTime) : defaultEnd ? formatTimeInput(defaultEnd) : "10:00",
            location: event?.location || "",
            notes: event?.notes || "",
            isAllDay: event?.isAllDay || false,
          })
          const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault()
            if (!formData.title.trim()) return
            setIsLoading(true)
            await new Promise((r) => setTimeout(r, 300))
            if (formData.isAllDay) {
              const start = new Date(`${formData.date}T00:00:00`)
              const end = new Date(`${formData.date}T23:59:59`)
              onSubmit({
                title: formData.title,
                type: formData.type,
                startTime: start,
                endTime: end,
                location: formData.location || undefined,
                notes: formData.notes || undefined,
                isAllDay: true,
              })
            } else {
              onSubmit({
                title: formData.title,
                type: formData.type,
                startTime: new Date(`${formData.date}T${formData.startTime}`),
                endTime: new Date(`${formData.date}T${formData.endTime}`),
                location: formData.location || undefined,
                notes: formData.notes || undefined,
                isAllDay: false,
              })
            }
            setIsLoading(false)
          }
          return (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Title</label>
                <Input id="title" placeholder="Event title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} autoFocus />
              </div>
              <div className="space-y-2">
                <label htmlFor="event-type-trigger" className="text-sm font-medium">
                  Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      id="event-type-trigger"
                      className={cn(
                        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
                        "outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                    >
                      {EVENT_TYPES.find((t) => t.value === formData.type)?.label ?? "Event"}
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="border-border min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    {EVENT_TYPES.map((t) => (
                      <DropdownMenuItem
                        key={t.value}
                        onSelect={() => setFormData((p) => ({ ...p, type: t.value }))}
                      >
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium">Date</label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="all-day" className="text-sm font-medium">All day</label>
                <Switch id="all-day" checked={formData.isAllDay} onCheckedChange={(c) => setFormData((p) => ({ ...p, isAllDay: !!c }))} />
              </div>
              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="start-time" className="text-sm font-medium">Start</label>
                    <Input id="start-time" type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="end-time" className="text-sm font-medium">End</label>
                    <Input id="end-time" type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">Location</label>
                <Input id="location" placeholder="Add location" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                <textarea
                  id="notes"
                  placeholder="Add notes..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className={cn("w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                />
              </div>
              <div className="flex gap-2 pt-2">
                {event && onDelete && (
                  <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">Delete</Button>
                )}
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !formData.title.trim()}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : event ? "Save" : "Add"}
                </Button>
              </div>
            </form>
          )
        }

        const formContent = (
          <EventFormInner
            event={editingEvent}
            defaultStart={newEventStart}
            defaultEnd={newEventEnd}
            onSubmit={(data) => {
              handleSubmitEvent(data)
              setEventDialogOpen(false)
            }}
            onDelete={editingEvent ? () => { handleDeleteEvent(); setEventDialogOpen(false) } : undefined}
            onCancel={() => setEventDialogOpen(false)}
          />
        )

        if (isMobile) {
          return (
            <Sheet open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
                <SheetHeader>
                  <SheetTitle>{editingEvent ? "Edit Event" : "New Event"}</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6 overflow-y-auto">{formContent}</div>
              </SheetContent>
            </Sheet>
          )
        }
        return (
          <CalendarDesktopFloatingPanel
            open={eventDialogOpen}
            onClose={() => setEventDialogOpen(false)}
            title={editingEvent ? "Edit Event" : "New Event"}
            srDescription={
              editingEvent ? "Edit the details of your event" : "Create a new event on your calendar"
            }
          >
            {formContent}
          </CalendarDesktopFloatingPanel>
        )
      })()}

      {/* Post Event Dialog */}
      {(() => {
        const PostEventFormInner = ({ onSubmit, onCancel }: { onSubmit: (d: Omit<PostedEvent, "id" | "signedUpCount" | "signedUpUsers" | "authorId" | "authorName" | "createdAt">) => void; onCancel: () => void }) => {
          const [isLoading, setIsLoading] = useState(false)
          const [formData, setFormData] = useState({
            title: "",
            message: "",
            date: formatDateInput(new Date()),
            startTime: "12:00",
            endTime: "13:00",
            location: "",
            hasSignUp: false,
            maxSignUps: "",
            postToCampus: true,
            postToSquads: [] as string[],
          })
          const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault()
            if (!formData.title.trim() || !formData.message.trim()) return
            if (!formData.postToCampus && formData.postToSquads.length === 0) return
            setIsLoading(true)
            await new Promise((r) => setTimeout(r, 300))
            const postedTo: ("campus" | "squad")[] = []
            if (formData.postToCampus) postedTo.push("campus")
            if (formData.postToSquads.length > 0) postedTo.push("squad")
            onSubmit({
              title: formData.title,
              message: formData.message,
              startTime: new Date(`${formData.date}T${formData.startTime}`),
              endTime: new Date(`${formData.date}T${formData.endTime}`),
              location: formData.location || undefined,
              hasSignUp: formData.hasSignUp,
              maxSignUps: formData.hasSignUp && formData.maxSignUps ? parseInt(formData.maxSignUps) : undefined,
              postedTo,
              squadIds: formData.postToSquads.length > 0 ? formData.postToSquads : undefined,
            })
            setIsLoading(false)
          }
          const hasValidTarget = formData.postToCampus || formData.postToSquads.length > 0
          const toggleSquad = (id: string) =>
            setFormData((p) => ({
              ...p,
              postToSquads: p.postToSquads.includes(id) ? p.postToSquads.filter((x) => x !== id) : [...p.postToSquads, id],
            }))
          return (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="post-title" className="text-sm font-medium">Event Title</label>
                <Input id="post-title" placeholder="What's happening?" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} autoFocus className="text-base" />
              </div>
              <div className="space-y-2">
                <label htmlFor="post-message" className="text-sm font-medium">Message</label>
                <textarea
                  id="post-message"
                  placeholder="Tell people about your event..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  className={cn("w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                />
              </div>
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>When</span>
                </div>
                <Input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="post-start" className="text-xs text-muted-foreground">Start</label>
                    <Input id="post-start" type="time" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="post-end" className="text-xs text-muted-foreground">End</label>
                    <Input id="post-end" type="time" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <label htmlFor="post-location" className="text-sm font-medium">Location</label>
                </div>
                <Input id="post-location" placeholder="Where is this happening?" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <label htmlFor="enable-signup" className="text-sm font-medium">Enable sign-ups</label>
                  </div>
                  <Switch id="enable-signup" checked={formData.hasSignUp} onCheckedChange={(c) => setFormData((p) => ({ ...p, hasSignUp: !!c }))} />
                </div>
                {formData.hasSignUp && (
                  <div className="space-y-2 pt-2">
                    <label htmlFor="max-signups" className="text-xs text-muted-foreground">Max sign-ups (optional)</label>
                    <Input id="max-signups" type="number" placeholder="Unlimited" min={1} value={formData.maxSignUps} onChange={(e) => setFormData((p) => ({ ...p, maxSignUps: e.target.value }))} />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Post to</label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="checkbox" checked={formData.postToCampus} onChange={(e) => setFormData((p) => ({ ...p, postToCampus: e.target.checked }))} className="size-4 rounded border-input" />
                  <div className="flex-1">
                    <p className="font-medium">Campus</p>
                    <p className="text-xs text-muted-foreground">Visible to everyone on campus</p>
                  </div>
                </label>
                {mockSquads.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your squads</p>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {mockSquads.map((squad) => (
                        <label key={squad.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                          <input type="checkbox" checked={formData.postToSquads.includes(squad.id)} onChange={() => toggleSquad(squad.id)} className="size-4 rounded border-input" />
                          <div className="flex-1">
                            <p className="font-medium">{squad.name}</p>
                            <p className="text-xs text-muted-foreground">{squad.memberCount} members</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {!hasValidTarget && <p className="text-xs text-destructive">Select at least one place to post</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={isLoading || !formData.title.trim() || !formData.message.trim() || !hasValidTarget} className="flex-1">
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Post Event"}
                </Button>
              </div>
            </form>
          )
        }

        const handleSubmit = (data: Omit<PostedEvent, "id" | "signedUpCount" | "signedUpUsers" | "authorId" | "authorName" | "createdAt">) => {
          handleSubmitPostEvent(data)
          setPostDialogOpen(false)
        }
        const handleCancel = () => setPostDialogOpen(false)

        if (isMobile) {
          return (
            <Sheet open={postDialogOpen} onOpenChange={setPostDialogOpen}>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
                <SheetHeader>
                  <SheetTitle>Post an Event</SheetTitle>
                  <SheetDescription className="sr-only">Create an event to share with your campus or squads</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  <PostEventFormInner onSubmit={handleSubmit} onCancel={handleCancel} />
                </div>
              </SheetContent>
            </Sheet>
          )
        }
        return (
          <CalendarDesktopFloatingPanel
            open={postDialogOpen}
            onClose={() => setPostDialogOpen(false)}
            title="Post an Event"
            srDescription="Create an event to share with your campus or squads"
            wide
          >
            <PostEventFormInner onSubmit={handleSubmit} onCancel={handleCancel} />
          </CalendarDesktopFloatingPanel>
        )
      })()}

      {/* Event Detail */}
      {detailEvent && (() => {
        const squadNames = detailEvent.squadIds?.map((id) => mockSquads.find((s) => s.id === id)?.name).filter(Boolean)
        const content = (
          <div className="space-y-4">
            <span className={cn("inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium", TYPE_COLORS_DETAIL[detailEvent.type])}>
              {TYPE_LABELS[detailEvent.type]}
            </span>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground mt-0.5" />
                <p className="text-sm font-medium">
                  {detailEvent.startTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              {!detailEvent.isAllDay && (
                <div className="flex items-start gap-3">
                  <Clock className="size-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{formatTime(detailEvent.startTime)} - {formatTime(detailEvent.endTime)}</p>
                </div>
              )}
              {detailEvent.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{detailEvent.location}</p>
                </div>
              )}
              {detailEvent.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="size-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{detailEvent.notes}</p>
                </div>
              )}
              {(detailEvent.postedTo?.length || squadNames?.length) && (
                <div className="flex items-start gap-3">
                  <Users className="size-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Posted to:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detailEvent.postedTo?.includes("campus") && <span className="px-2 py-0.5 bg-muted rounded text-xs">Campus</span>}
                      {squadNames?.map((name) => <span key={name} className="px-2 py-0.5 bg-muted rounded text-xs">{name}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="secondary" className="flex-1" onClick={handleEditFromDetail}>
                <Pencil className="size-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDeleteFromDetail}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )
        if (isMobile) {
          return (
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] pb-safe border-t border-border/60">
                <SheetHeader>
                  <SheetTitle className="text-left">{detailEvent.title}</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6 overflow-y-auto">{content}</div>
              </SheetContent>
            </Sheet>
          )
        }
        return (
          <CalendarDesktopFloatingPanel
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            title={detailEvent.title}
            srDescription="View event details and manage this event"
          >
            {content}
          </CalendarDesktopFloatingPanel>
        )
      })()}

      {todayFabPortalReady &&
        createPortal(
          <button
            type="button"
            onClick={goToToday}
            className={cn(
              mobileCalendarPillButtonClass,
              "fixed left-3 z-[200] md:hidden",
              MOBILE_CALENDAR_FAB_BOTTOM_CLASS
            )}
            aria-label="Go to today"
          >
            Today
          </button>,
          document.body
        )}

    </div>
  )
}

export function CalendarPage() {
  return (
    <CalendarStoreProvider>
      <CalendarPageContent />
    </CalendarStoreProvider>
  )
}
