import type { PageId } from "@/components/shell/app-shell"
import {
  mobileBottomNavCloudBackdropClass,
  mobileBottomNavCloudBackdropMaskStyle,
  mobileBottomNavCloudTintPositionClass,
  mobileBottomNavCloudTintStyle,
} from "@/components/shell/mobile-chrome-cloud"
import { Home, Users, MessageCircle, Compass, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems: { id: PageId; label: string; icon: React.ElementType; badgeKey?: "messages" }[] = [
  { id: "feed", label: "Home", icon: Home },
  { id: "squads", label: "Squads", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle, badgeKey: "messages" },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "calendar", label: "Calendar", icon: Calendar },
]

interface MobileBottomNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  messagesUnreadCount?: number
}

export function MobileBottomNav({ activePage, onNavigate, messagesUnreadCount = 0 }: MobileBottomNavProps) {
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.id === activePage)
  )
  const tabSlotPercent = 100 / navItems.length
  /** Centered on the active tab column (half of width in rem). */
  const indicatorHalfRem = 0.6875 // w-[1.375rem] / 2

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 overflow-visible"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="relative isolate pb-safe">
        <div
          className={mobileBottomNavCloudBackdropClass}
          style={mobileBottomNavCloudBackdropMaskStyle}
          aria-hidden
        />
        <div
          className={mobileBottomNavCloudTintPositionClass}
          style={mobileBottomNavCloudTintStyle}
          aria-hidden
        />
        <div className="relative z-10 flex h-14 items-center justify-around">
          <div
            className="pointer-events-none absolute top-0 z-20 h-[3px] w-[1.375rem] rounded-full bg-foreground transition-[left] duration-300 ease-out motion-reduce:transition-none"
            style={{
              left: `calc(${(activeIndex + 0.5) * tabSlotPercent}% - ${indicatorHalfRem}rem)`,
            }}
            aria-hidden
          />
          {navItems.map((item) => {
            const isActive = activePage === item.id
            const badgeCount = item.badgeKey === "messages" ? messagesUnreadCount : 0
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground active:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <div className="relative">
                  <item.icon className="size-5" strokeWidth={2} />
                  {badgeCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex size-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground leading-none">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate max-w-full">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
