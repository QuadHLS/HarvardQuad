import { useVirtualizer } from "@tanstack/react-virtual"
import type { RefObject, ReactNode } from "react"
import type { FeedPostWithAuthor } from "@/services/feedService"
import { cn } from "@/lib/utils"

/**
 * Desktop: virtualize post rows inside `scrollParentRef` (element with constrained height + `overflow-y-auto`).
 * Mobile: `main` often scrolls instead — use `virtualize={false}` and a normal list.
 */
export function FeedVirtualizedPostBlock({
  posts,
  virtualize,
  scrollParentRef,
  loadMoreRef,
  loadingMore,
  renderPost,
  stackClassName = "flex flex-col gap-3",
  virtualRowSpacingClassName = "pb-3",
}: {
  posts: FeedPostWithAuthor[]
  virtualize: boolean
  scrollParentRef: RefObject<HTMLDivElement>
  loadMoreRef: RefObject<HTMLDivElement>
  loadingMore: boolean
  renderPost: (post: FeedPostWithAuthor) => ReactNode
  /** Non-virtual list wrapper; virtual rows use `virtualRowSpacingClassName` for equivalent spacing */
  stackClassName?: string
  virtualRowSpacingClassName?: string
}) {
  const rowVirtualizer = useVirtualizer({
    count: virtualize && posts.length > 0 ? posts.length : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 320,
    overscan: 5,
    getItemKey: (index) => posts[index]?.id ?? index,
  })

  const loadMoreSpinner = loadingMore ? (
    <div className="flex justify-center py-4">
      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  ) : null

  if (!virtualize) {
    return (
      <>
        <div className={stackClassName}>
          {posts.map((post) => (
            <div key={post.id}>{renderPost(post)}</div>
          ))}
        </div>
        <div ref={loadMoreRef} className="min-h-4" />
        {loadMoreSpinner}
      </>
    )
  }

  return (
    <>
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const post = posts[virtualRow.index]!
          return (
            <div
              key={post.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={cn("absolute left-0 top-0 w-full box-border", virtualRowSpacingClassName)}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderPost(post)}
            </div>
          )
        })}
      </div>
      <div ref={loadMoreRef} className="min-h-4" />
      {loadMoreSpinner}
    </>
  )
}
