"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { useIsMobile } from "@/hooks/use-mobile"
import { nearestPointOnRectBoundary, offsetOutsideRect } from "@/lib/quadly-connector-path"
import { cn } from "@/lib/utils"
import { SquiggleConnector } from "@/components/ui/squiggle-connector"

const contentAnimations =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-hover-card-content-transform-origin]"

const innerCardClass =
  "rounded-2xl border border-neutral-200/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800 shadow-sm dark:border-neutral-300/25 dark:bg-card dark:text-foreground dark:shadow-md"

type SquiggleHoverCtxValue = {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentCardRef: React.RefObject<HTMLDivElement | null>
}

const SquiggleHoverCtx = React.createContext<SquiggleHoverCtxValue | null>(null)

/** Squiggle endpoints: on the trigger edge facing the card → on the card edge facing the trigger. */
export function squiggleEndpointsForHoverRects(
  tr: DOMRectReadOnly,
  cr: DOMRectReadOnly,
  startPadPx: number,
  endPadPx: number
): { x0: number; y0: number; x1: number; y1: number } {
  const ccx = cr.left + cr.width / 2
  const ccy = cr.top + cr.height / 2

  // Closest point on trigger boundary toward the card, then on card toward that point; re-snap
  // trigger once so both ends sit on the true shortest bridge between the two rects.
  let startOnTr = nearestPointOnRectBoundary(ccx, ccy, tr)
  let endOnCard = nearestPointOnRectBoundary(startOnTr.x, startOnTr.y, cr)
  startOnTr = nearestPointOnRectBoundary(endOnCard.x, endOnCard.y, tr)

  const start = offsetOutsideRect(startOnTr.x, startOnTr.y, tr, startPadPx)
  const end = offsetOutsideRect(endOnCard.x, endOnCard.y, cr, endPadPx)
  return { x0: start.x, y0: start.y, x1: end.x, y1: end.y }
}

function mergeRefs<T>(...refs: (React.Ref<T> | null | undefined)[]) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") ref(value)
      else (ref as React.MutableRefObject<T | null>).current = value
    }
  }
}

/** Hover card with Quadly-style random squiggle from trigger to the white content card. */
export function SquiggleHoverCard({
  children,
  openDelay = 150,
  closeDelay = 200,
}: {
  children: React.ReactNode
  openDelay?: number
  closeDelay?: number
}) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentCardRef = React.useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobile()

  const ctx = React.useMemo<SquiggleHoverCtxValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentCardRef,
    }),
    [open]
  )

  const getEndpoints = React.useCallback(() => {
    const trig = triggerRef.current
    const card = contentCardRef.current
    if (!trig || !card) return null
    const tr = trig.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    return squiggleEndpointsForHoverRects(tr, cr, 2, 4)
  }, [])

  return (
    <SquiggleHoverCtx.Provider value={ctx}>
      <HoverCardPrimitive.Root
        data-slot="hover-card-squiggle"
        open={open}
        onOpenChange={setOpen}
        openDelay={openDelay}
        closeDelay={closeDelay}
      >
        {children}
      </HoverCardPrimitive.Root>
      <SquiggleConnector
        open={open}
        getEndpoints={getEndpoints}
        pathProfile={isMobile ? "mobile" : "desktop"}
        scaleSquiggleByChordLength
      />
    </SquiggleHoverCtx.Provider>
  )
}

export function SquiggleHoverCardTrigger({
  asChild = true,
  children,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  const ctx = React.useContext(SquiggleHoverCtx)
  if (!ctx) {
    throw new Error("SquiggleHoverCardTrigger must be used inside SquiggleHoverCard")
  }

  if (!asChild || !React.isValidElement(children)) {
    return (
      <HoverCardPrimitive.Trigger data-slot="hover-card-squiggle-trigger" asChild={asChild} {...props}>
        {children}
      </HoverCardPrimitive.Trigger>
    )
  }

  const child = children as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-squiggle-trigger" asChild {...props}>
      {React.cloneElement(child, {
        ref: mergeRefs(child.ref, ctx.triggerRef) as React.Ref<unknown>,
      })}
    </HoverCardPrimitive.Trigger>
  )
}

export function SquiggleHoverCardContent({
  className,
  children,
  /** To the right of the trigger; start + negative alignOffset lifts the card for a true top-right read. */
  side = "right",
  align = "start",
  /** Larger offset = longer squiggle chord (trigger ↔ card). */
  sideOffset = 80,
  alignOffset = -72,
  collisionPadding = 16,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const ctx = React.useContext(SquiggleHoverCtx)
  if (!ctx) {
    throw new Error("SquiggleHoverCardContent must be used inside SquiggleHoverCard")
  }

  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-squiggle-content"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-[100] border-0 bg-transparent p-0 shadow-none outline-hidden",
          contentAnimations
        )}
        {...props}
      >
        <div ref={ctx.contentCardRef} className={cn(innerCardClass, className)}>
          {children}
        </div>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  )
}
