import { useEffect } from "react"

/** Keeps `<meta name="theme-color">` in sync with `html` background (after `var(--background)` resolves). */
export function ThemeColorSync() {
  useEffect(() => {
    const apply = () => {
      const bg = getComputedStyle(document.documentElement).backgroundColor
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return
      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement("meta")
        meta.setAttribute("name", "theme-color")
        document.head.appendChild(meta)
      }
      meta.setAttribute("content", bg)
    }
    apply()
    const mo = new MutationObserver(apply)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const mm = window.matchMedia("(prefers-color-scheme: dark)")
    const onScheme = () => apply()
    mm.addEventListener("change", onScheme)
    return () => {
      mo.disconnect()
      mm.removeEventListener("change", onScheme)
    }
  }, [])
  return null
}
