import React from "react"
import { ArrowLeft } from "lucide-react"
import { navigateWithoutReload } from "@/lib/navigation"

export function UserGuidePage() {
  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex-shrink-0 border-b border-border bg-background px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back to previous page"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back()
              } else {
                navigateWithoutReload("/")
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors appearance-none bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold">User Guide</h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-3xl mx-auto text-muted-foreground text-sm text-center py-16">
          Coming soon.
        </div>
      </main>
    </div>
  )
}
