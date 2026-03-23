'use client'

import * as React from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useDrawerVisualViewportMaxHeight } from '@/hooks/use-drawer-visual-viewport-max-height'
import { cn } from '@/lib/utils'

const scrollBodyClass =
  'relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-background touch-pan-y'

export type MobileBottomDrawerVariant = 'default' | 'form' | 'inputStable'

type MobileBottomDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  descriptionClassName?: string
  titleClassName?: string
  children: React.ReactNode
  contentClassName?: string
  /**
   * Semantic only (a11y / copy); keyboard layout is identical for all variants.
   * Uses `noBodyStyles` (skip Vaul body lock) + `repositionInputs={false}` so Vaul does not run its
   * iOS `preventScrollMobileSafari` focus/scroll hacks. Those fight a `fixed` sheet and our visual-viewport
   * `bottom`/`maxHeight`, causing intermittent jumps (esp. keyboard prev/next refocus).
   */
  variant?: MobileBottomDrawerVariant
  scrollBody?: boolean
  bodyClassName?: string
  maxHeightClassName?: string
}

export function MobileBottomDrawer({
  open,
  onOpenChange,
  title,
  description,
  descriptionClassName,
  titleClassName,
  children,
  contentClassName,
  variant: _variant = 'default',
  scrollBody = true,
  bodyClassName,
  maxHeightClassName = 'max-h-[85dvh]',
}: MobileBottomDrawerProps) {
  // `variant` kept for call-site clarity; layout is unified (see JSDoc).
  void _variant
  const vv = useDrawerVisualViewportMaxHeight(open)
  const vvStyle: React.CSSProperties = {
    ...(vv.maxHeightPx != null ? { maxHeight: vv.maxHeightPx } : {}),
    ...(vv.bottomInsetPx != null ? { bottom: vv.bottomInsetPx } : {}),
  }
  const hasVvStyle = Object.keys(vvStyle).length > 0

  return (
    <Drawer
      noBodyStyles
      repositionInputs={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        data-quad-vv-managed=""
        className={cn(vv.maxHeightPx != null ? 'max-h-none' : maxHeightClassName, contentClassName)}
        style={hasVvStyle ? { ...vvStyle } : undefined}
      >
        <DrawerHeader className="bg-background">
          <DrawerTitle className={titleClassName}>{title}</DrawerTitle>
          {description != null && description !== '' ? (
            <DrawerDescription className={descriptionClassName}>{description}</DrawerDescription>
          ) : (
            <DrawerDescription className="sr-only">Bottom sheet</DrawerDescription>
          )}
        </DrawerHeader>
        {scrollBody ? (
          <div
            className={cn(scrollBodyClass, 'px-4 pb-6', bodyClassName)}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
