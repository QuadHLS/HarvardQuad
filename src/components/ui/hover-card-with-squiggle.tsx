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

/**
 * Anchor outside the trigger toward the popover. Uses trigger↔card center so flipped / shifted
 * hover content (collision) still gets a sensible edge; horizontal cases keep a top corner bias.
 */
function triggerAnchorTowardCard(
  tr: DOMRectReadOnly,
  cr: DOMRectReadOnly,
  gap: number
): { x0: number; y0: number } {
  const tcx = tr.left + tr.width / 2
  const tcy = tr.top + tr.height / 2
  const ccx = cr.left + cr.width / 2
  const ccy = cr.top + cr.height / 2
  const dx = ccx - tcx
  const dy = ccy - tcy

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) return { x0: tr.right + gap, y0: tr.top - gap }
    return { x0: tr.left - gap, y0: tr.top - gap }
  }
  const skew = tr.width * 0.22
  if (dy >= 0) {
    if (dx > skew) return { x0: tr.right + gap, y0: tr.bottom + gap }
    if (dx < -skew) return { x0: tr.left - gap, y0: tr.bottom + gap }
    return { x0: tcx, y0: tr.bottom + gap }
  }
  if (dx > skew) return { x0: tr.right + gap, y0: tr.top - gap }
  if (dx < -skew) return { x0: tr.left - gap, y0: tr.top - gap }
  return { x0: tcx, y0: tr.top - gap }
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
    const gap = 10
    const { x0, y0 } = triggerAnchorTowardCard(tr, cr, gap)
    const edge = nearestPointOnRectBoundary(x0, y0, cr)
    const out = offsetOutsideRect(edge.x, edge.y, cr, 12)
    return { x0, y0, x1: out.x, y1: out.y }
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
  sideOffset = 48,
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
