"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useCallback, useLayoutEffect, useRef } from "react"
import { Info, XIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { squiggleEndpointsForHoverRects } from "@/components/ui/hover-card-with-squiggle"
import { SquiggleConnector } from "@/components/ui/squiggle-connector"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const innerCardClass =
  "rounded-2xl border border-neutral-200/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800 shadow-sm dark:border-neutral-300/25 dark:bg-card dark:text-foreground dark:shadow-md"

const contentAnimations =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]"

export const BLOCK_INFO = [
  "Your DM is deleted. You can't message each other.",
  "You're unfriended. Any pending friend request is cancelled.",
  "You won't see their profile or posts in feeds.",
  "Notifications between you (likes, mentions, etc.) are removed.",
  "They won't be notified.",
  "To unblock: Settings → Blocked users.",
] as const

export type BlockInfoAnchorRect = {
  left: number
  top: number
  width: number
  height: number
}

/** `messages`: card opens left of anchor (toward pane center); `default`: privacy-style right/start. */
export type BlockInfoPlacement = "default" | "messages"

const PLACEMENT: Record<
  BlockInfoPlacement,
  { side: "top" | "right" | "bottom" | "left"; align: "start" | "center" | "end"; sideOffset: number; alignOffset: number }
> = {
  default: { side: "right", align: "start", sideOffset: 80, alignOffset: -72 },
  messages: { side: "left", align: "center", sideOffset: 56, alignOffset: 0 },
}

export function BlockInfoDialog({
  open,
  onOpenChange,
  anchorRect,
  placement = "default",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Viewport-space anchor captured when opening (menu row, button, etc.). */
  anchorRect: BlockInfoAnchorRect | null
  placement?: BlockInfoPlacement
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentCardRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useLayoutEffect(() => {
    const el = triggerRef.current
    if (!el || !anchorRect) return
    el.style.left = `${anchorRect.left}px`
    el.style.top = `${anchorRect.top}px`
    el.style.width = `${Math.max(anchorRect.width, 1)}px`
    el.style.height = `${Math.max(anchorRect.height, 1)}px`
  }, [anchorRect, open])

  const getEndpoints = useCallback(() => {
    const trig = triggerRef.current
    const card = contentCardRef.current
    if (!trig || !card) return null
    const tr = trig.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    return squiggleEndpointsForHoverRects(tr, cr, 2, 4)
  }, [])

  const { side, align, sideOffset, alignOffset } = PLACEMENT[placement]

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
        <PopoverPrimitive.Anchor asChild>
          <div
            ref={triggerRef}
            aria-hidden
            className="pointer-events-none fixed z-[95]"
            style={
              anchorRect
                ? {
                    left: anchorRect.left,
                    top: anchorRect.top,
                    width: Math.max(anchorRect.width, 1),
                    height: Math.max(anchorRect.height, 1),
                  }
                : { left: 0, top: 0, width: 1, height: 1 }
            }
          />
        </PopoverPrimitive.Anchor>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "z-[150] border-0 bg-transparent p-0 shadow-none outline-hidden",
              contentAnimations
            )}
          >
            <div
              ref={contentCardRef}
              className={cn(innerCardClass, "relative max-w-md w-[min(22rem,calc(100vw-2rem))] pr-10")}
            >
              <PopoverPrimitive.Close
                type="button"
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100 hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </PopoverPrimitive.Close>
              <div className="flex items-center gap-2 pr-2">
                <Info className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">About blocking</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {BLOCK_INFO.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground/60">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      <SquiggleConnector
        open={open}
        getEndpoints={getEndpoints}
        pathProfile={isMobile ? "mobile" : "desktop"}
        scaleSquiggleByChordLength
      />
    </>
  )
}

/** Centered AlertDialog — same chrome as squad delete confirm (e.g. squads-page `DeleteSquadDialog`). */
export function BlockInfoAlertDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-transparent bg-muted text-foreground dark:bg-muted">
            <Info />
          </AlertDialogMedia>
          <AlertDialogTitle>About blocking</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground text-sm text-left">
              <ul className="mt-1 list-none space-y-2 pl-0">
                {BLOCK_INFO.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground/60">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction type="button" variant="default" size="sm" className="col-span-2 w-full sm:w-full">
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
