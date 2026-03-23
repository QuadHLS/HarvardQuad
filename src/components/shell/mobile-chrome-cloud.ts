import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const bleedTop = "-top-[0.75rem]"
const bleedBottom = "-bottom-[0.75rem]"

/** Blur mask: soft at outer edge, full by mid bar (percentages = same curve as sibling chrome). */
const blurMaskToBottom =
  "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)]"

const blurMaskToTop =
  "[-webkit-mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)] [mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.42)_26%,rgba(0,0,0,0.82)_44%,#000_58%)]"

export const mobileBottomNavCloudBackdropClass = cn(
  "pointer-events-none absolute inset-x-0 bottom-0 backdrop-blur-2xl backdrop-saturate-150",
  bleedTop,
  blurMaskToBottom
)

export const mobileHeaderCloudBackdropClass = cn(
  "pointer-events-none absolute inset-x-0 top-0 backdrop-blur-2xl backdrop-saturate-150 md:hidden",
  bleedBottom,
  blurMaskToTop
)

const tintStops = `transparent 0%,
    color-mix(in oklab, var(--background) 8%, transparent) 8%,
    color-mix(in oklab, var(--background) 22%, transparent) 18%,
    color-mix(in oklab, var(--background) 44%, transparent) 30%,
    color-mix(in oklab, var(--background) 68%, transparent) 44%,
    color-mix(in oklab, var(--background) 86%, transparent) 58%,
    var(--background) 74%,
    var(--background) 100%`

export const mobileBottomNavCloudTintStyle: CSSProperties = {
  background: `linear-gradient(to bottom, ${tintStops})`,
}

export const mobileHeaderCloudTintStyle: CSSProperties = {
  background: `linear-gradient(to top, ${tintStops})`,
}

export const mobileBottomNavCloudTintPositionClass = cn(
  "pointer-events-none absolute inset-x-0 bottom-0",
  bleedTop
)

export const mobileHeaderCloudTintPositionClass = cn(
  "pointer-events-none absolute inset-x-0 top-0 md:hidden",
  bleedBottom
)
