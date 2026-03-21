"use client"

import * as React from "react"

import type { Squad } from "@/services/squadsService"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

/** Matches `ComboboxChips` surface so Sort aligns with Category / Privacy. */
const discoverFilterControlClass =
  "min-h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30"

/** Sentinel: no category filter (show all). */
export const DISCOVER_ALL_CATEGORY = "__all_categories__"
/** Sentinel: no privacy filter (show all). */
export const DISCOVER_ALL_PRIVACY = "__all_privacy__"

export const DISCOVER_PRIVACY_OPTIONS = ["open", "restricted", "private"] as const

export const DISCOVER_SORT_OPTIONS = ["members", "posts", "name", "newest"] as const
export type DiscoverSortOption = (typeof DISCOVER_SORT_OPTIONS)[number]

/** Default discover sort: most members first (matches initial state on Squads / Explore). */
export const DISCOVER_DEFAULT_SORT: DiscoverSortOption = "members"

export function discoverPrivacyLabel(p: string): string {
  if (p === "open") return "Open"
  if (p === "restricted") return "Restricted"
  if (p === "private") return "Private"
  return p
}

export function discoverSortLabel(s: DiscoverSortOption): string {
  switch (s) {
    case "members":
      return "Most members"
    case "posts":
      return "Most posts"
    case "name":
      return "Name (A–Z)"
    case "newest":
      return "Newest"
    default:
      return s
  }
}

/** Category + privacy filters + sort for Discover lists. */
export function applyDiscoverSquadRefinements(
  squads: Squad[],
  categories: string[],
  privacy: string[],
  sort: DiscoverSortOption
): Squad[] {
  let out = squads

  const catFiltered =
    categories.length > 0 && !categories.includes(DISCOVER_ALL_CATEGORY)
  if (catFiltered) {
    out = out.filter((s) => categories.includes(s.category))
  }

  const privFiltered =
    privacy.length > 0 && !privacy.includes(DISCOVER_ALL_PRIVACY)
  if (privFiltered) {
    out = out.filter((s) => privacy.includes(s.type))
  }

  const arr = [...out]
  switch (sort) {
    case "members":
      arr.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
      break
    case "posts":
      arr.sort((a, b) => (b.post_count ?? 0) - (a.post_count ?? 0))
      break
    case "name":
      arr.sort((a, b) => a.name.localeCompare(b.name))
      break
    case "newest":
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      break
    default:
      break
  }
  return arr
}

/** True if `v` is a valid discover sort key. */
export function isDiscoverSortOption(v: string): v is DiscoverSortOption {
  return (DISCOVER_SORT_OPTIONS as readonly string[]).includes(v)
}

/** Search by squad name and description (same rules on Squads Discover + Explore Squads). */
export function matchesDiscoverSquadSearch(s: Squad, searchRaw: string): boolean {
  const term = searchRaw.trim().toLowerCase()
  return (
    !term ||
    s.name.toLowerCase().includes(term) ||
    (s.info ?? "").toLowerCase().includes(term)
  )
}

/** Apply discover search, then category / privacy / sort (single source of truth for both UIs). */
export function filterDiscoverSquadsList(
  squads: Squad[],
  searchRaw: string,
  categories: string[],
  privacy: string[],
  sort: DiscoverSortOption
): Squad[] {
  const searchFiltered = squads.filter((s) =>
    matchesDiscoverSquadSearch(s, searchRaw)
  )
  return applyDiscoverSquadRefinements(
    searchFiltered,
    categories,
    privacy,
    sort
  )
}

type AllOption = { value: string; label: string }

type DiscoverMultiComboboxProps = {
  label: React.ReactNode
  items: readonly string[]
  value: string[]
  onValueChange: (next: string[]) => void
  formatLabel: (item: string) => string
  placeholder: string
  allOption: AllOption
}

function normalizeMultiParentValue(
  next: string[],
  allValue: string,
  prevComboboxValue: string[]
): string[] {
  const n = next ?? []
  const hasAll = n.includes(allValue)
  const specifics = n.filter((v) => v !== allValue)

  if (n.length === 0) return []
  if (hasAll && specifics.length === 0) return []
  if (hasAll && specifics.length > 0) {
    const wasAllOnly =
      prevComboboxValue.length === 1 && prevComboboxValue[0] === allValue
    return wasAllOnly ? specifics : []
  }
  return n.filter((v) => v !== allValue)
}

/** Multi-select discover filter (shadcn / Base UI Combobox chips). */
export function DiscoverMultiCombobox({
  label,
  items,
  value,
  onValueChange,
  formatLabel,
  placeholder,
  allOption,
}: DiscoverMultiComboboxProps) {
  const anchor = useComboboxAnchor()
  const listItems = React.useMemo(() => [...items], [items])
  const comboItems = React.useMemo(
    () => [allOption.value, ...listItems],
    [allOption.value, listItems]
  )

  const comboboxValue = React.useMemo((): string[] => {
    if (value.length === 0 || value.includes(allOption.value)) {
      return [allOption.value]
    }
    return value.filter((v) => listItems.includes(v))
  }, [value, allOption.value, listItems])

  const labelFor = React.useCallback(
    (v: string) =>
      v === allOption.value ? allOption.label : formatLabel(v),
    [allOption, formatLabel]
  )

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <Combobox
        multiple
        autoHighlight
        items={comboItems}
        value={comboboxValue}
        itemToStringLabel={labelFor}
        onValueChange={(next) => {
          const n = next ?? []
          onValueChange(normalizeMultiParentValue(n, allOption.value, comboboxValue))
        }}
      >
        {/* Anchor on a full-width wrapper so --anchor-width stays column width after chips render. */}
        <div ref={anchor} className="w-full min-w-0">
          <ComboboxChips className="w-full">
            <ComboboxValue>
              {(values: string[]) => (
                <>
                  {values.map((v) => (
                    <ComboboxChip key={v}>{labelFor(v)}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder={placeholder} />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
        </div>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matches.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {labelFor(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

type DiscoverSingleComboboxProps = {
  label: React.ReactNode
  items: readonly DiscoverSortOption[]
  value: DiscoverSortOption
  onValueChange: (v: string) => void
  formatLabel: (item: DiscoverSortOption) => string
  fallbackValue: DiscoverSortOption
  placeholder: string
}

/** Single-select sort — same shell + anchor as multi filters (trigger, not InputGroup). */
export function DiscoverSingleCombobox({
  label,
  items,
  value,
  onValueChange,
  formatLabel,
  fallbackValue,
  placeholder,
}: DiscoverSingleComboboxProps) {
  const anchor = useComboboxAnchor()
  const listItems = React.useMemo(() => [...items], [items])
  const current = listItems.includes(value) ? value : fallbackValue

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <Combobox
        items={listItems}
        value={current}
        autoComplete="none"
        itemToStringLabel={(item) => formatLabel(item as DiscoverSortOption)}
        onValueChange={(next) => {
          if (next != null) onValueChange(next as string)
        }}
      >
        <div ref={anchor} className="w-full min-w-0">
          <ComboboxTrigger
            className={cn(
              discoverFilterControlClass,
              "flex items-center justify-between gap-2 font-normal",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "hover:bg-accent/30 data-popup-open:bg-accent/20"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              <ComboboxValue placeholder={placeholder}>
                {(v) =>
                  v != null
                    ? formatLabel(v as DiscoverSortOption)
                    : undefined
                }
              </ComboboxValue>
            </span>
          </ComboboxTrigger>
        </div>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matches.</ComboboxEmpty>
          <ComboboxList>
            {(item: DiscoverSortOption) => (
              <ComboboxItem key={item} value={item}>
                {formatLabel(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
