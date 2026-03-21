import type { PageId } from "@/components/shell/app-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  Users,
  MessageCircle,
  Calendar,
  Compass,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems: { id: PageId; label: string; icon: React.ElementType; badgeKey?: "messages" | "notifications" }[] = [
  { id: "feed", label: "Home", icon: Home },
  { id: "squads", label: "Squads", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle, badgeKey: "messages" },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
]

interface DesktopSidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  onGoToMyProfile?: () => void
  profile?: { full_name: string | null; public_name: string | null; avatar_url: string | null } | null
  messagesUnreadCount?: number
  notificationsUnreadCount?: number
}

export function DesktopSidebar({ activePage, onNavigate, onGoToMyProfile, profile, messagesUnreadCount = 0, notificationsUnreadCount = 0 }: DesktopSidebarProps) {
  return (
    <aside className="hidden md:flex h-full min-h-0 w-[250px] shrink-0 flex-col bg-background">
      {/* Navigation */}
      <nav className="flex-1 pl-3 pr-6 pt-4 pb-2">
        <ul className="flex flex-col gap-1" role="list" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:bg-sidebar-accent/70"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="size-5" />
                  <span>{item.label}</span>
                  {item.badgeKey === "messages" && messagesUnreadCount > 0 && (
                    <span className="ml-auto flex size-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground leading-none">
                      {messagesUnreadCount > 99 ? "99+" : messagesUnreadCount}
                    </span>
                  )}
                  {item.badgeKey === "notifications" && notificationsUnreadCount > 0 && (
                    <span className="ml-auto flex size-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground leading-none">
                      {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section - full name, public name; click navigates to own profile */}
      <div className="p-3">
        <button
          onClick={() => (onGoToMyProfile ? onGoToMyProfile() : onNavigate("profile"))}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            activePage === "profile"
              ? "bg-sidebar-accent"
              : "hover:bg-sidebar-accent/50"
          )}
        >
          <Avatar className="size-8 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {(profile?.public_name?.trim() || profile?.full_name?.trim() || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-sidebar-foreground">{profile?.full_name || "You"}</span>
            <span className="text-xs text-muted-foreground">{profile?.public_name ? `@${profile.public_name.replace(/^@/, "")}` : "—"}</span>
          </div>
        </button>
      </div>
    </aside>
  )
}
