import * as React from 'react'

const MOBILE_BREAKPOINT = 550
const SIDEBAR_BREAKPOINT = 768 // matches Tailwind md

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
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
