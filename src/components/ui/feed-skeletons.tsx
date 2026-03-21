import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Skeleton matching PostCard layout (avatar, title, content, actions). */
export function PostCardSkeleton({ className }: { className?: string }) {
  return (
    <article className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </article>
  )
}

/** Skeleton for feed with multiple post cards. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton matching SquadCard / ProfileSquads card layout (compact). */
export function SquadCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-card p-3.5", className)}>
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
    </div>
  )
}

/** Skeleton for squad list grid (larger card matching SquadCard). */
export function SquadListCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex flex-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Skeleton for squad grid (uses larger SquadListCardSkeleton). */
export function SquadGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SquadListCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for profile squads tab (compact cards). */
export function ProfileSquadsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2, 3].map((i) => (
        <SquadCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for profile header (avatar, name, stats). */
export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-end">
        <Skeleton className="size-24 rounded-full shrink-0" />
        <div className="flex-1 w-full space-y-2 text-center md:text-left">
          <Skeleton className="h-6 w-40 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
          <Skeleton className="h-3 w-48 mx-auto md:mx-0" />
        </div>
      </div>
      <div className="flex justify-center md:justify-start gap-6">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
}

/** Skeleton for conversation list item. */
export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

/** Skeleton for conversation list. */
export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-0.5 px-2 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for notification list. */
export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg p-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
