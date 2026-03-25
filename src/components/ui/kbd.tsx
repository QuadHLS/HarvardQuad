"use client"

import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** Single key cap. Pair with `KbdGroup` for chords (⌘ K), or put inside `Button` for actions like “Accept” + key. */
function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

/** Wrap one or more `Kbd` chords (e.g. `<Kbd>Ctrl + B</Kbd>` + `<Kbd>Ctrl + K</Kbd>` per shadcn docs). */
function KbdGroup({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

function appleLikePlatform(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
}

/**
 * Platform-aware palette shortcut as **one** key cap (shadcn pattern: chord text inside a single `Kbd`).
 * Apple: `⌘ K` · Windows/Linux: `Ctrl + K`
 */
function KbdModifierK({ className }: { className?: string }) {
  return (
    <KbdGroup className={className}>
      <Kbd>{appleLikePlatform() ? "⌘ K" : "Ctrl + K"}</Kbd>
    </KbdGroup>
  )
}

export { Kbd, KbdGroup, KbdModifierK }
