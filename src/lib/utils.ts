import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Primary heading for main app shell pages (Explore, Squads, Messages, etc.). */
export const pageMainTitleClass =
  'text-2xl font-semibold text-foreground tracking-tight md:text-3xl'

const QUAD_HOVER_COLORS = ['quad-green', 'quad-blue', 'quad-red', 'quad-yellow'] as const
export type QuadHoverColor = (typeof QUAD_HOVER_COLORS)[number]

/** Hex colors for quad palette (matches --quad-* in index.css). */
const QUAD_AVATAR_COLORS = ['#00962c', '#0078c5', '#f71417', '#ffb100'] as const

export function quadHoverColor(id: string): QuadHoverColor {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return QUAD_HOVER_COLORS[Math.abs(i) % QUAD_HOVER_COLORS.length]
}

/** Deterministic avatar background color from id (squad, etc.). Uses 4 quad colors. */
export function quadAvatarColor(id: string): string {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return QUAD_AVATAR_COLORS[Math.abs(i) % QUAD_AVATAR_COLORS.length]
}

/**
 * iOS Safari: fields in scrollable panels (e.g. floating share card) can sit under the
 * keyboard until layout changes. Pinned footers in `MobileBottomDrawer` avoid most cases;
 * this still helps desktop overflow regions and late viewport settles.
 */
export function scrollFocusedFieldIntoView(el: HTMLElement) {
  const scroll = () => {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(scroll)
  })
  if (typeof window === 'undefined') return
  const vv = window.visualViewport
  if (!vv) return
  const onVv = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(scroll)
    })
  }
  vv.addEventListener('resize', onVv, { once: true })
}
