import type { CSSProperties } from "react"
import type { PageId } from "@/components/shell/app-shell"
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

/** Negative top: cloud bleed into scroll area; keep both layers in sync. */
const navCloudTop = "-top-[2rem]"

/** Blur mask scaled for ~2rem lift: longer soft top, full strength by mid–tab row. */
const cloudBlurMask =
  "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)]"

const cloudBackdrop = cn(
  "pointer-events-none absolute inset-x-0 bottom-0 backdrop-blur-2xl backdrop-saturate-150",
  navCloudTop,
  cloudBlurMask
)

const cloudTintStyle: CSSProperties = {
  background: `linear-gradient(to bottom,
    transparent 0%,
    color-mix(in oklab, var(--background) 8%, transparent) 8%,
    color-mix(in oklab, var(--background) 22%, transparent) 18%,
    color-mix(in oklab, var(--background) 44%, transparent) 30%,
    color-mix(in oklab, var(--background) 68%, transparent) 44%,
    color-mix(in oklab, var(--background) 86%, transparent) 58%,
    var(--background) 74%,
    var(--background) 100%)`,
}

export function MobileBottomNav({ activePage, onNavigate, messagesUnreadCount = 0 }: MobileBottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 overflow-visible"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="relative isolate">
        <div className={cloudBackdrop} aria-hidden />
        <div
          className={cn("pointer-events-none absolute inset-x-0 bottom-0", navCloudTop)}
          style={cloudTintStyle}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col">
          <div className="flex h-14 items-center justify-around">
            {navItems.map((item) => {
              const isActive = activePage === item.id
              const badgeCount = item.badgeKey === "messages" ? messagesUnreadCount : 0
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                >
                  <div className="relative">
                    <item.icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
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
          <div className="pb-safe" />
        </div>
      </div>
    </nav>
  )
}
