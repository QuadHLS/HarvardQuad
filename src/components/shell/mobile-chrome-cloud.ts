import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const bleedTop = "-top-[0.375rem]"
const bleedBottom = "-bottom-[0.375rem]"

/**
 * Shared feather curve: many small steps so blur + tint ramp together without visible bands.
 * Stops are identical for mask alpha and tint color-mix % so the two layers don’t drift.
 */
const cloudFeatherStops: { pct: number; strength: number }[] = [
  { pct: 0, strength: 0 },
  { pct: 3, strength: 0.03 },
  { pct: 6, strength: 0.08 },
  { pct: 9, strength: 0.14 },
  { pct: 12, strength: 0.22 },
  { pct: 15, strength: 0.32 },
  { pct: 18, strength: 0.42 },
  { pct: 21, strength: 0.52 },
  { pct: 24, strength: 0.62 },
  { pct: 27, strength: 0.7 },
  { pct: 30, strength: 0.78 },
  { pct: 33, strength: 0.84 },
  { pct: 36, strength: 0.88 },
  { pct: 39, strength: 0.91 },
  { pct: 42, strength: 0.94 },
  { pct: 45, strength: 0.96 },
  { pct: 48, strength: 0.98 },
  { pct: 52, strength: 1 },
  { pct: 100, strength: 1 },
]

function blurMaskGradient(direction: "to bottom" | "to top"): string {
  const parts = cloudFeatherStops.map(({ pct, strength }) => {
    if (strength <= 0) return `transparent ${pct}%`
    if (strength >= 1) return `#000 ${pct}%`
    return `rgba(0,0,0,${strength}) ${pct}%`
  })
  return `linear-gradient(${direction}, ${parts.join(",")})`
}

function tintGradientStops(): string {
  return cloudFeatherStops
    .map(({ pct, strength }) => {
      if (strength <= 0) return `transparent ${pct}%`
      if (strength >= 1) return `var(--background) ${pct}%`
      const mix = Math.min(100, Math.round(strength * 100))
      return `color-mix(in oklab, var(--background) ${mix}%, transparent) ${pct}%`
    })
    .join(", ")
}

const blurMaskGradientBottom = blurMaskGradient("to bottom")
const blurMaskGradientTop = blurMaskGradient("to top")

const cloudMaskBottom: Pick<CSSProperties, "WebkitMaskImage" | "maskImage"> = {
  WebkitMaskImage: blurMaskGradientBottom,
  maskImage: blurMaskGradientBottom,
}

const cloudMaskTop: Pick<CSSProperties, "WebkitMaskImage" | "maskImage"> = {
  WebkitMaskImage: blurMaskGradientTop,
  maskImage: blurMaskGradientTop,
}

/** Desaturate backdrop before blur so only luminance smudges — no chroma from content behind the bar. */
const backdropNoColorSpread =
  "[backdrop-filter:saturate(0)_blur(26px)] [-webkit-backdrop-filter:saturate(0)_blur(26px)]"

export const mobileBottomNavCloudBackdropClass = cn(
  "pointer-events-none absolute inset-x-0 bottom-0",
  backdropNoColorSpread,
  bleedTop
)

export const mobileHeaderCloudBackdropClass = cn(
  "pointer-events-none absolute inset-x-0 top-0 md:hidden",
  backdropNoColorSpread,
  bleedBottom
)

export const mobileBottomNavCloudBackdropMaskStyle: CSSProperties = cloudMaskBottom

export const mobileHeaderCloudBackdropMaskStyle: CSSProperties = cloudMaskTop

const tintStops = tintGradientStops()

export const mobileBottomNavCloudTintStyle: CSSProperties = {
  background: `linear-gradient(to bottom, ${tintStops})`,
  ...cloudMaskBottom,
}

export const mobileHeaderCloudTintStyle: CSSProperties = {
  background: `linear-gradient(to top, ${tintStops})`,
  ...cloudMaskTop,
}

export const mobileBottomNavCloudTintPositionClass = cn(
  "pointer-events-none absolute inset-x-0 bottom-0",
  bleedTop
)

export const mobileHeaderCloudTintPositionClass = cn(
  "pointer-events-none absolute inset-x-0 top-0 md:hidden",
  bleedBottom
)
