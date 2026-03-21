import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import {
  buildQuadlyConnectorPathWithMeta,
  type QuadlyConnectorPathOptions,
} from "@/lib/quadly-connector-path"
import { cn } from "@/lib/utils"

/** Local space: tip (0,0), base at x = -depth; must match line trim distance. */
const ARROW_DEPTH = 11
const ARROW_HALF_H = 5.5
const ARROW_CORNER_R = 1.15

type Pt = { x: number; y: number }

/** Circular fillet at `curr` between segments prev→curr and curr→next; CCW contour. */
function arcFillet(prev: Pt, curr: Pt, next: Pt, r: number): { p0: Pt; p1: Pt; arc: string } {
  const len1 = Math.hypot(curr.x - prev.x, curr.y - prev.y)
  const len2 = Math.hypot(next.x - curr.x, next.y - curr.y)
  if (len1 < 1e-6 || len2 < 1e-6) {
    return { p0: curr, p1: curr, arc: `L ${curr.x} ${curr.y}` }
  }
  const u1 = { x: (prev.x - curr.x) / len1, y: (prev.y - curr.y) / len1 }
  const u2 = { x: (next.x - curr.x) / len2, y: (next.y - curr.y) / len2 }
  const cos = u1.x * u2.x + u1.y * u2.y
  const angle = Math.acos(Math.max(-1, Math.min(1, cos)))
  const tanHalf = Math.tan(angle / 2)
  if (angle < 1e-4 || !Number.isFinite(tanHalf) || tanHalf < 1e-6) {
    return { p0: curr, p1: curr, arc: `L ${curr.x} ${curr.y}` }
  }
  let dist = r / tanHalf
  const maxD = Math.min(len1, len2) * 0.48
  dist = Math.min(dist, maxD)
  const p0 = { x: curr.x + u1.x * dist, y: curr.y + u1.y * dist }
  const p1 = { x: curr.x + u2.x * dist, y: curr.y + u2.y * dist }
  const cross = u1.x * u2.y - u1.y * u2.x
  const sweep = cross < 0 ? 1 : 0
  const arc = `A ${r} ${r} 0 0 ${sweep} ${p1.x} ${p1.y}`
  return { p0, p1, arc }
}

function roundedArrowheadPath(depth: number, halfH: number, r: number): string {
  const T: Pt = { x: 0, y: 0 }
  const BR: Pt = { x: -depth, y: halfH }
  const BL: Pt = { x: -depth, y: -halfH }
  const ft = arcFillet(BL, T, BR, r)
  const fbr = arcFillet(T, BR, BL, r)
  const fbl = arcFillet(BR, BL, T, r)
  return [
    `M ${ft.p1.x} ${ft.p1.y}`,
    `L ${fbr.p0.x} ${fbr.p0.y}`,
    fbr.arc,
    `L ${fbl.p0.x} ${fbl.p0.y}`,
    fbl.arc,
    `L ${ft.p0.x} ${ft.p0.y}`,
    ft.arc,
    "Z",
  ].join(" ")
}

const ROUNDED_ARROWHEAD_D = roundedArrowheadPath(ARROW_DEPTH, ARROW_HALF_H, ARROW_CORNER_R)

export type SquiggleConnectorEndpoints = {
  x0: number
  y0: number
  x1: number
  y1: number
}

type SquiggleConnectorProps = {
  /** When false, unmounts overlay and clears path. */
  open: boolean
  /** Screen-space endpoints; return null to hide/clear. Called every animation frame while open. */
  getEndpoints: () => SquiggleConnectorEndpoints | null
  /** Phase offset for `buildQuadlyConnectorPathWithMeta`. */
  phase?: number
  /** Salts the path hash with desktop vs mobile so layouts get distinct squiggles at the same seed. */
  pathProfile?: QuadlyConnectorPathOptions["profile"]
  /** Controlled shape seed. If omitted, a new random seed is chosen each time `open` goes false → true. */
  pathSeed?: number
  /** Skip drawing below this chord length (px). */
  minLength?: number
  /** Short chords get calmer squiggles; omit for full Quadly strength at any length. */
  scaleSquiggleByChordLength?: boolean
  /** Filled triangular arrowhead at the end, along the curve toward the card. */
  endChevron?: boolean
  className?: string
}

/**
 * Full-viewport SVG overlay + rAF loop: draws the smooth squiggle between two screen points.
 * Reuse anywhere you can supply `getEndpoints()` from refs / `getBoundingClientRect()`.
 */
export function SquiggleConnector({
  open,
  getEndpoints,
  phase = 0,
  pathProfile,
  pathSeed,
  minLength = 6,
  scaleSquiggleByChordLength,
  endChevron = true,
  className,
}: SquiggleConnectorProps) {
  const pathRef = useRef<SVGPathElement | null>(null)
  const arrowRef = useRef<SVGGElement | null>(null)
  const getEndpointsRef = useRef(getEndpoints)
  getEndpointsRef.current = getEndpoints

  const [autoSeed, setAutoSeed] = useState(() => Math.random())
  const prevOpenRef = useRef(open)

  useLayoutEffect(() => {
    if (open && !prevOpenRef.current && pathSeed === undefined) {
      setAutoSeed(Math.random())
    }
    prevOpenRef.current = open
  }, [open, pathSeed])

  const shapeSeed = pathSeed ?? autoSeed

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") return

    let rafId = 0
    const paint = () => {
      const pathEl = pathRef.current
      const arrowG = arrowRef.current
      if (!pathEl) return
      const ep = getEndpointsRef.current()
      if (!ep || Math.hypot(ep.x1 - ep.x0, ep.y1 - ep.y0) < minLength) {
        pathEl.setAttribute("d", "")
        if (arrowG) arrowG.setAttribute("visibility", "hidden")
        return
      }
      const pathOpts = {
        profile: pathProfile,
        seed: shapeSeed,
        scaleSquiggleByChordLength,
      }
      if (endChevron) {
        const first = buildQuadlyConnectorPathWithMeta(ep.x0, ep.y0, ep.x1, ep.y1, phase, pathOpts)
        const x1t = ep.x1 - first.endTx * ARROW_DEPTH
        const y1t = ep.y1 - first.endTy * ARROW_DEPTH
        const second = buildQuadlyConnectorPathWithMeta(ep.x0, ep.y0, x1t, y1t, phase, pathOpts)
        pathEl.setAttribute("d", second.d)
        if (arrowG) {
          const ax = ep.x1 - x1t
          const ay = ep.y1 - y1t
          const deg = (Math.atan2(ay, ax) * 180) / Math.PI
          arrowG.setAttribute("visibility", "visible")
          arrowG.setAttribute("transform", `translate(${ep.x1},${ep.y1}) rotate(${deg})`)
        }
      } else {
        pathEl.setAttribute(
          "d",
          buildQuadlyConnectorPathWithMeta(ep.x0, ep.y0, ep.x1, ep.y1, phase, pathOpts).d
        )
        if (arrowG) arrowG.setAttribute("visibility", "hidden")
      }
    }

    const loop = () => {
      paint()
      rafId = requestAnimationFrame(loop)
    }
    paint()
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      pathRef.current?.setAttribute("d", "")
      arrowRef.current?.setAttribute("visibility", "hidden")
    }
  }, [open, phase, pathProfile, shapeSeed, minLength, scaleSquiggleByChordLength, endChevron])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-[200] h-[100dvh] w-full overflow-visible",
        className
      )}
      style={{ width: "100vw", height: "100dvh" }}
    >
      <path
        ref={pathRef}
        d=""
        fill="none"
        stroke="rgb(82 82 91)"
        className="dark:stroke-[rgb(212 212 216)]"
        strokeOpacity={0.92}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        shapeRendering="geometricPrecision"
      />
      <g ref={arrowRef} visibility="hidden">
        <path
          d={ROUNDED_ARROWHEAD_D}
          fill="rgb(82 82 91)"
          className="dark:fill-[rgb(212_212_216)]"
          fillOpacity={0.92}
          stroke="none"
          shapeRendering="geometricPrecision"
        />
      </g>
    </svg>,
    document.body
  )
}
