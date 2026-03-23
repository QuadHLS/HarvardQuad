'use client'

import { useLayoutEffect, useState } from 'react'

export type DrawerVisualViewportMetrics = {
  maxHeightPx?: number
  bottomInsetPx?: number
}

/**
 * Single layout source for `MobileBottomDrawer`: max-height + bottom from Visual Viewport.
 * Vaul keyboard handling is off for these sheets (`repositionInputs={false}` + `data-quad-vv-managed`
 * patch) so inline `height`/`bottom` from Vaul does not fight this hook.
 *
 * `visualViewport` `resize` plus `scroll` (coalesced): Safari can pan the visual viewport (offsetTop)
 * without a height change; ignoring `scroll` left stale `bottom` and looked like random jumps on refocus.
 *
 * Event-driven reads use double `requestAnimationFrame` so we measure after Safari settles; otherwise
 * one frame often reports full viewport height then keyboard inset — brief bottom=0 flash on refocus.
 */
export function useDrawerVisualViewportMaxHeight(active: boolean): DrawerVisualViewportMetrics {
  const [metrics, setMetrics] = useState<DrawerVisualViewportMetrics>({})

  useLayoutEffect(() => {
    if (!active || typeof window === 'undefined') {
      setMetrics({})
      return
    }

    const vv = window.visualViewport
    if (!vv) {
      setMetrics({})
      return
    }

    const TOP_MARGIN = 12

    const update = () => {
      const innerH = window.innerHeight
      const dvhCap = innerH * 0.88
      // Ignore pathological one-frame vv.height reads during focus churn.
      const vvH = Math.max(vv.height, 1)
      const visible = Math.max(0, vvH - TOP_MARGIN)
      const nextMax = Math.min(visible, dvhCap)
      const maxHeightPx = nextMax > 0 ? Math.round(nextMax) : undefined

      const rawObscured = innerH - vv.offsetTop - vvH
      const diffObscured = innerH - vvH
      const obscuredBottom = Math.max(0, Math.min(rawObscured, diffObscured))
      const bottomInsetPx = Math.round(obscuredBottom)

      setMetrics((prev) => {
        if (prev.maxHeightPx === maxHeightPx && prev.bottomInsetPx === bottomInsetPx) {
          return prev
        }
        return { maxHeightPx, bottomInsetPx }
      })
    }

    let rafOuter = 0
    let rafInner = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafOuter)
      cancelAnimationFrame(rafInner)
      rafOuter = requestAnimationFrame(() => {
        rafOuter = 0
        rafInner = requestAnimationFrame(() => {
          rafInner = 0
          update()
        })
      })
    }

    update()
    vv.addEventListener('resize', scheduleUpdate)
    vv.addEventListener('scroll', scheduleUpdate)
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      cancelAnimationFrame(rafOuter)
      cancelAnimationFrame(rafInner)
      vv.removeEventListener('resize', scheduleUpdate)
      vv.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      setMetrics({})
    }
  }, [active])

  return metrics
}
