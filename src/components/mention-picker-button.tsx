"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type MentionItem = { id: string; label: string }

export function MentionPickerButton({
  onSelect,
  triggerClassName,
  disabled,
}: {
  onSelect: (id: string, label: string) => void
  triggerClassName?: string
  disabled?: boolean
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<MentionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState(false)
  const fetchGen = useRef(0)

  const fetchItems = useCallback(async (q: string) => {
    const myGen = ++fetchGen.current
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc("list_profiles_for_mention", {
        query_param: q.trim() || null,
      })
      if (myGen !== fetchGen.current) return
      if (error) {
        setItems([])
        setListError(true)
        toast.error("Couldn't load people to mention.", { id: "mention-picker-rpc" })
        return
      }
      setListError(false)
      const list = (data || []).map((p: { id: string; public_name: string | null; full_name: string | null }) => ({
        id: p.id,
        label: p.public_name || p.full_name || "Unknown",
      }))
      setItems(list)
    } finally {
      if (myGen === fetchGen.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setListError(false)
      fetchItems("")
    } else {
      fetchGen.current += 1
      setListError(false)
    }
  }, [open, fetchItems])

  useEffect(() => {
    const t = setTimeout(() => fetchItems(query), 200)
    return () => clearTimeout(t)
  }, [query, fetchItems])

  const handleSelect = (item: MentionItem) => {
    onSelect(item.id, item.label)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Mention someone"
          disabled={disabled}
        >
          <span className="text-sm font-semibold">@</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-64 p-0 overflow-hidden border-border"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          autoFocus={!isMobile}
        />
        <div className="max-h-[200px] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {listError ? "Couldn't load people. Try again." : "No users found"}
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(item)
                }}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
