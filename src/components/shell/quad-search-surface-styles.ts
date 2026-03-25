/** Shared desktop Quad search pill — keep header trigger and palette input visually identical. */
export const quadSearchSurfaceClass =
  "relative w-full overflow-hidden rounded-full border border-primary/40 bg-background shadow-sm"

export const quadSearchIconClass =
  "pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"

export const quadSearchFieldClass =
  "h-10 min-w-0 flex-1 border-0 bg-transparent py-2 pl-11 text-left text-sm text-muted-foreground shadow-none outline-none placeholder:text-muted-foreground"

/**
 * Mobile TopBar search trigger only — frosted chip. GlobalSearch popup uses {@link quadSearchSurfaceClass}
 * so the sheet matches the desktop palette pill.
 */
export const quadSearchMobileChipClass =
  "h-9 w-full rounded-full border border-primary/25 bg-background/45 shadow-none backdrop-blur-md transition-colors dark:bg-background/35"

/**
 * Inner layout for the mobile chip — same for TopBar trigger button and GlobalSearch input
 * so the popup field matches the header pill.
 */
export const quadSearchMobileChipInnerClass =
  "py-2 px-10 text-center text-sm text-muted-foreground active:bg-background/55"

/** Mobile chip icon — same inset as TopBar search trigger. */
export const quadSearchMobileIconClass =
  "pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"

/** Horizontal padding for the row that contains the mobile chip (matches TopBar `pl-4 pr-2`). */
export const quadSearchMobileRowPaddingClass = "pl-4 pr-2"

/** Framer Motion — keep in sync with `GlobalSearch` desktop palette header (`layoutId`). */
export const quadSearchMorphTransition = {
  type: "spring" as const,
  bounce: 0.16,
  stiffness: 340,
  damping: 36,
}
