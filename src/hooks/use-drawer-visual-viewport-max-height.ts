'use client'

import { useLayoutEffect, useState } from 'react'

export type DrawerVisualViewportMetrics = {
  maxHeightPx?: number
  /** Only set when > 0 so inline `bottom` is omitted after keyboard dismiss (avoids stale lift + gap). */
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
 *
 * When the keyboard is not meaningfully open (`innerHeight - vv.height` small), we derive max height
 * from `innerHeight` instead of `vv.height`. iOS often leaves `vv.height` slightly short after dismiss,
 * which made the sheet sit a bit lower / shorter than the pre-focus “full” sheet. Focusout + delayed
 * re-measures catch late viewport settles without fighting every scroll tick.
 *
 * Tradeoffs (intentional):
 * - **Cap**: While open, effective max height is `min(innerH - topMargin, innerH * 0.88)` — not the
 *   call-site `max-h-[80dvh]` / `85dvh` token (those only apply before the first VV read). Align caps
 *   here if product wants stricter sheets.
 * - **Keyboard detection**: Uses obscured height vs `max(56px, 7% innerH)`. Very small floating /
 *   undocked keyboards might report little height change; the sheet could theoretically overlap them.
 * - **focusout**: Only form-like fields trigger delayed settle, so random focus moves don’t spam reads.
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
      const vvH = Math.max(vv.height, 1)
      const obscuredByKeyboard = innerH - vvH
      /** Below this, treat as resting UI — avoids flaky post-keyboard vv.height shrinking max height. */
      const keyboardClosed = obscuredByKeyboard < Math.max(56, Math.round(innerH * 0.07))

      let maxHeightPx: number | undefined
      let bottomInsetPx: number | undefined

      if (keyboardClosed) {
        const visibleLayout = Math.max(0, innerH - TOP_MARGIN)
        const nextMax = Math.min(visibleLayout, dvhCap)
        maxHeightPx = nextMax > 0 ? Math.round(nextMax) : undefined
        bottomInsetPx = undefined
      } else {
        const visible = Math.max(0, vvH - TOP_MARGIN)
        const nextMax = Math.min(visible, dvhCap)
        maxHeightPx = nextMax > 0 ? Math.round(nextMax) : undefined

        const rawObscured = innerH - vv.offsetTop - vvH
        const obscuredBottom = Math.max(0, Math.min(rawObscured, obscuredByKeyboard))
        const b = Math.round(obscuredBottom)
        bottomInsetPx = b > 0 ? b : undefined
      }

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

    /** iOS often updates visual viewport after `resize` / field blur; staggered reads reduce twitch. */
    let settleT1 = 0
    let settleT2 = 0
    const scheduleSettle = () => {
      scheduleUpdate()
      window.clearTimeout(settleT1)
      window.clearTimeout(settleT2)
      settleT1 = window.setTimeout(scheduleUpdate, 120)
      settleT2 = window.setTimeout(scheduleUpdate, 340)
    }

    const onDocumentFocusOut = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      if (!t.matches('input, textarea, select, [contenteditable="true"]')) return
      scheduleSettle()
    }

    update()
    vv.addEventListener('resize', scheduleUpdate, { passive: true })
    vv.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('focusout', onDocumentFocusOut, true)

    return () => {
      cancelAnimationFrame(rafOuter)
      cancelAnimationFrame(rafInner)
      window.clearTimeout(settleT1)
      window.clearTimeout(settleT2)
      vv.removeEventListener('resize', scheduleUpdate)
      vv.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('focusout', onDocumentFocusOut, true)
      setMetrics({})
    }
  }, [active])

  return metrics
}
