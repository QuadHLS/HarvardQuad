import * as React from "react"

/** Aligns with `@theme --breakpoint-md` (34.375rem): shell chrome + max-md utilities. */
export const MOBILE_LAYOUT_BREAKPOINT_PX = 550

const SIDEBAR_BREAKPOINT = 768 // desktop sidebar rail (not Tailwind md in this app)

/** `true` below {@link MOBILE_LAYOUT_BREAKPOINT_PX} — used for shell layout and policies like skipping `autoFocus` in sheets. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_LAYOUT_BREAKPOINT_PX : false
  )

  React.useEffect(() => {
    const query = `(max-width: ${MOBILE_LAYOUT_BREAKPOINT_PX - 1}px)`
    const mql = window.matchMedia(query)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

export function useShowSidebar() {
  const [show, setShow] = React.useState(typeof window !== 'undefined' ? window.innerWidth >= SIDEBAR_BREAKPOINT : true)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`)
    const onChange = () => setShow(window.innerWidth >= SIDEBAR_BREAKPOINT)
    mql.addEventListener('change', onChange)
    setShow(window.innerWidth >= SIDEBAR_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return show
}
