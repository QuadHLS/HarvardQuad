/**
 * Squiggle connector: `buildQuadlyConnectorPath` (SVG `d`) + optional layout helpers
 * `nearestRectEdgeMidpoint`, `nearestPointOnRectBoundary`, `offsetOutsideRect`. Pair with `SquiggleConnector` UI.
 */
import { curveCatmullRom, line } from "d3-shape"

type Pt = { x: number; y: number }

/** Light Laplacian smooth on interior vertices (endpoints fixed). */
function relaxPolyline(pts: Pt[], passes: number): Pt[] {
  if (pts.length < 3 || passes <= 0) return pts
  let cur = pts.map((p) => ({ ...p }))
  for (let pass = 0; pass < passes; pass++) {
    const next = cur.map((q) => ({ ...q }))
    for (let i = 1; i < cur.length - 1; i++) {
      next[i] = {
        x: 0.2 * cur[i - 1].x + 0.6 * cur[i].x + 0.2 * cur[i + 1].x,
        y: 0.2 * cur[i - 1].y + 0.6 * cur[i].y + 0.2 * cur[i + 1].y,
      }
    }
    cur = next
  }
  return cur
}

const quadlyLine = line<Pt>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5))

export type QuadlyConnectorProfile = "desktop" | "mobile"

export type QuadlyConnectorPathOptions = {
  /** Salts `seed` so desktop/mobile produce different curves for the same number. */
  profile?: QuadlyConnectorProfile
  /** If finite, hashes into wiggle/curl params (stable per frame for a fixed seed). */
  seed?: number
  /**
   * When true, wiggle density and amplitude scale down for short chords (e.g. info hovers).
   * Omit/false keeps the full Quadly curve regardless of length.
   */
  scaleSquiggleByChordLength?: boolean
}

function fract(n: number): number {
  return n - Math.floor(n)
}

function seededUnit(seed: number, i: number): number {
  return fract(Math.sin(seed * 12.9898 + i * 78.233 + i * i * 0.001) * 43758.5453)
}

export type QuadlyConnectorPathResult = {
  d: string
  /** Unit tangent at the end of the stroke, pointing toward `(x1,y1)` / the card. */
  endTx: number
  endTy: number
}

/**
 * One continuous curve along the chord: gentle wiggle + a Gaussian “curl” (not a circular arc).
 * Tangents at t=0 and t=1 follow the path naturally — no forced flat / 360° coaster track.
 * Finite `seed` varies knot position, frequencies, and amplitudes (new seed → new shape).
 * Use `scaleSquiggleByChordLength` for short connectors; Quadly leaves it off for full strength.
 */
export function buildQuadlyConnectorPathWithMeta(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  phase = 0,
  opts?: QuadlyConnectorPathOptions
): QuadlyConnectorPathResult {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.max(Math.hypot(dx, dy), 8)
  const nx = -dy / len
  const ny = dx / len
  const chordTx = dx / len
  const chordTy = dy / len

  let mu = 0.42
  let sig = 0.108
  let ampWScale = 1
  let ampCScale = 1
  let w1 = 1.65
  let w2 = 3.05
  let curlK = 2.35
  let taperPow = 0.42
  let phaseW = phase
  let phaseC = phase * 0.35
  let curlSign = 1

  const s = opts?.seed
  if (s != null && Number.isFinite(s)) {
    // Salt so desktop vs mobile differ even with the same numeric seed (separate popover instances).
    const profileSalt =
      opts?.profile === "mobile" ? 19.413 : opts?.profile === "desktop" ? 7.927 : 0
    const sh = s + profileSalt
    mu = 0.34 + seededUnit(sh, 0) * 0.22
    sig = 0.072 + seededUnit(sh, 1) * 0.055
    ampWScale = 0.82 + seededUnit(sh, 2) * 0.45
    ampCScale = 0.78 + seededUnit(sh, 3) * 0.52
    w1 = 1.25 + seededUnit(sh, 4) * 1.35
    w2 = 2.4 + seededUnit(sh, 5) * 1.85
    curlK = 1.65 + seededUnit(sh, 6) * 1.55
    taperPow = 0.32 + seededUnit(sh, 7) * 0.28
    const phaseBase = seededUnit(sh, 8) * Math.PI * 2
    phaseW = phase + phaseBase
    phaseC = phase * 0.35 + phaseBase * 0.6
    curlSign = seededUnit(sh, 10) > 0.5 ? 1 : -1
  }

  let ampLenScale = 1
  if (opts?.scaleSquiggleByChordLength) {
    // Calmer than Quadly; subtle wiggle on typical info-hover chord lengths.
    const L_REF = 235
    const lenNorm = Math.min(1, len / L_REF)
    const waveScale = Math.max(0.18, lenNorm * 0.92)
    w1 *= waveScale
    w2 *= waveScale
    curlK *= 0.66 + 0.2 * lenNorm
    ampLenScale = Math.max(0.16, lenNorm ** 1.02)
  }

  const ampW = Math.min(9, Math.max(2.5, len * 0.048)) * ampWScale * ampLenScale
  const ampC = Math.min(22, Math.max(9, len * 0.102)) * ampCScale * ampLenScale

  const n = 78
  const pts: Pt[] = []

  for (let i = 0; i <= n; i++) {
    const t = i / n
    const bx = x0 + dx * t
    const by = y0 + dy * t

    // Wiggle: fades at endpoints so we still hit (x0,y0) and (x1,y1); not a “flat” constraint on the curl.
    const wiggleTaper = Math.sin(t * Math.PI) ** taperPow
    const wiggle =
      Math.sin(t * Math.PI * w1 + phaseW) * 0.62 + Math.sin(t * Math.PI * w2 + phaseW * 0.85) * 0.38

    // Curl: smooth bell × sine → C∞, ~one visible knot, not a closed circle
    const z = (t - mu) / sig
    const bell = Math.exp(-0.5 * z * z)
    const curl = curlSign * bell * Math.sin(z * curlK + phaseC)

    const off = wiggleTaper * ampW * wiggle + ampC * curl
    pts.push({ x: bx + nx * off, y: by + ny * off })
  }

  const relaxed = relaxPolyline(pts, 1)
  const d = quadlyLine(relaxed)
  if (d && d.startsWith("M")) {
    const last = relaxed[relaxed.length - 1]!
    const prev = relaxed[relaxed.length - 2]!
    let endTx = last.x - prev.x
    let endTy = last.y - prev.y
    const tl = Math.hypot(endTx, endTy)
    if (tl < 1e-6) {
      endTx = chordTx
      endTy = chordTy
    } else {
      endTx /= tl
      endTy /= tl
    }
    return { d, endTx, endTy }
  }
  return { d: `M${x0},${y0}L${x1},${y1}`, endTx: chordTx, endTy: chordTy }
}

export function buildQuadlyConnectorPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  phase = 0,
  opts?: QuadlyConnectorPathOptions
): string {
  return buildQuadlyConnectorPathWithMeta(x0, y0, x1, y1, phase, opts).d
}

/** Closest edge midpoint on `rect` to `(fromX, fromY)` (popover / card attach). */
export function nearestRectEdgeMidpoint(
  fromX: number,
  fromY: number,
  rect: DOMRectReadOnly | DOMRect
): { x: number; y: number } {
  const candidates = [
    { x: rect.left + rect.width / 2, y: rect.top },
    { x: rect.left + rect.width / 2, y: rect.bottom },
    { x: rect.left, y: rect.top + rect.height / 2 },
    { x: rect.right, y: rect.top + rect.height / 2 },
  ]
  let best = candidates[0]!
  let bestD = Infinity
  for (const p of candidates) {
    const d = Math.hypot(p.x - fromX, p.y - fromY)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return { x: best.x, y: best.y }
}

/**
 * Closest point on the axis-aligned rectangle boundary to `(px, py)`.
 * Better than edge midpoints alone for tall/wide cards and diagonal approach angles.
 */
export function nearestPointOnRectBoundary(
  px: number,
  py: number,
  rect: DOMRectReadOnly | DOMRect
): { x: number; y: number } {
  const { left, right, top, bottom } = rect
  if (px < left || px > right || py < top || py > bottom) {
    return {
      x: Math.max(left, Math.min(right, px)),
      y: Math.max(top, Math.min(bottom, py)),
    }
  }
  const dLeft = px - left
  const dRight = right - px
  const dTop = py - top
  const dBottom = bottom - py
  let best = dLeft
  let side: "l" | "r" | "t" | "b" = "l"
  if (dRight < best) {
    best = dRight
    side = "r"
  }
  if (dTop < best) {
    best = dTop
    side = "t"
  }
  if (dBottom < best) {
    side = "b"
  }
  switch (side) {
    case "l":
      return { x: left, y: py }
    case "r":
      return { x: right, y: py }
    case "t":
      return { x: px, y: top }
    default:
      return { x: px, y: bottom }
  }
}

/** Push a point on the rect boundary outward along center→point (gap before stroke meets box). */
export function offsetOutsideRect(
  ax: number,
  ay: number,
  rect: DOMRectReadOnly | DOMRect,
  margin: number
): { x: number; y: number } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let vx = ax - cx
  let vy = ay - cy
  const len = Math.hypot(vx, vy)
  if (len < 1e-6) {
    vx = 0
    vy = -1
  } else {
    vx /= len
    vy /= len
  }
  return { x: ax + vx * margin, y: ay + vy * margin }
}
