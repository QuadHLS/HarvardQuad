import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { CalendarEvent } from "@/lib/calendar/types"
import {
  getMiniMonthDays,
  isSameDay,
  isSameMonth,
  isToday,
} from "@/lib/calendar/calendar-utils"

export function filterEventsByCalendarLayers(
  events: CalendarEvent[],
  layers: Record<CalendarLayerId, boolean>
): CalendarEvent[] {
  return events.filter((e) => {
    switch (e.type) {
      case "class":
        return layers.classes
      case "squad":
        return layers.squads
      case "deadline":
        return layers.deadlines
      case "event":
      case "study":
        return layers.personal
    }
  })
}

const WEEKDAYS_MINI = ["S", "M", "T", "W", "T", "F", "S"]

export type CalendarLayerId = "personal" | "classes" | "squads" | "deadlines"

export const DEFAULT_CALENDAR_LAYERS: Record<CalendarLayerId, boolean> = {
  personal: true,
  classes: true,
  squads: true,
  deadlines: true,
}

const LAYER_META: {
  id: CalendarLayerId
  label: string
  checkboxClass: string
}[] = [
  {
    id: "personal",
    label: "Your calendar",
    checkboxClass: "border-primary bg-primary text-primary-foreground",
  },
  {
    id: "classes",
    label: "Classes",
    checkboxClass: "border-chart-3 bg-chart-3 text-white",
  },
  {
    id: "squads",
    label: "Squads",
    checkboxClass: "border-chart-4 bg-chart-4 text-white",
  },
  {
    id: "deadlines",
    label: "Deadlines",
    checkboxClass: "border-destructive bg-destructive text-white",
  },
]

function LayerCheckbox({
  checked,
  onChange,
  className,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  className: string
  id: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-opacity",
        className,
        !checked && "border-muted-foreground/40 bg-transparent opacity-60"
      )}
    >
      {checked && (
        <svg className="size-3" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

export function CalendarSidebar({
  selectedDate,
  onSelectDate,
  layers,
  onLayerChange,
}: {
  selectedDate: Date
  onSelectDate: (d: Date) => void
  layers: Record<CalendarLayerId, boolean>
  onLayerChange: (id: CalendarLayerId, visible: boolean) => void
}) {
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  const [myCalendarsOpen, setMyCalendarsOpen] = useState(true)

  // Follow the focused day whenever its calendar date changes (year/month/day), so year view
  // or main grid picks still pull the mini month to the right page after browsing with chevrons.
  const sy = selectedDate.getFullYear()
  const sm = selectedDate.getMonth()
  const sd = selectedDate.getDate()
  useEffect(() => {
    setDisplayMonth(new Date(sy, sm, 1))
  }, [sy, sm, sd])

  const miniDays = getMiniMonthDays(displayMonth)

  const goMiniPrev = useCallback(() => {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])
  const goMiniNext = useCallback(() => {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])

  return (
    <aside
      className={cn(
        "hidden max-h-full w-[min(100%,13.25rem)] shrink-0 flex-col gap-4 overflow-y-auto bg-background py-3 pl-0 pr-2 md:flex"
      )}
    >
      {/* Mini month */}
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-center justify-between gap-0.5">
          <p className="text-xs font-semibold text-foreground tabular-nums leading-tight">
            {displayMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center -mr-1">
            <button
              type="button"
              onClick={goMiniPrev}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={goMiniNext}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS_MINI.map((d, i) => (
              <div
                key={i}
                className="py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6 gap-y-0.5 text-center text-[11px] leading-none">
            {miniDays.map((day, idx) => {
              const inMonth = isSameMonth(day, displayMonth)
              const selected = isSameDay(day, selectedDate)
              const today = isToday(day)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectDate(new Date(day))}
                  className={cn(
                    "mx-auto flex size-6 items-center justify-center rounded-full text-[10px] font-medium tabular-nums transition-colors",
                    !inMonth && "text-muted-foreground/70",
                    inMonth && !selected && !today && "text-foreground hover:bg-muted",
                    today && "bg-primary text-primary-foreground hover:bg-primary/90",
                    selected &&
                      !today &&
                      "bg-primary/20 text-primary"
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Collapsible
        open={myCalendarsOpen}
        onOpenChange={setMyCalendarsOpen}
        className="space-y-1 px-0.5"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md py-0.5 text-left text-xs font-semibold text-foreground outline-none ring-offset-background hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
          My calendars
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              myCalendarsOpen && "-rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-1 data-[state=closed]:animate-none">
          {LAYER_META.map(({ id, label, checkboxClass }) => (
            <label
              key={id}
              htmlFor={`layer-${id}`}
              className="flex cursor-pointer items-center gap-2 rounded-md py-1 pl-0.5 pr-0.5 text-xs text-foreground hover:bg-muted/50"
            >
              <LayerCheckbox
                id={`layer-${id}`}
                checked={layers[id]}
                onChange={(v) => onLayerChange(id, v)}
                className={checkboxClass}
              />
              <span className="truncate">{label}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </aside>
  )
}
