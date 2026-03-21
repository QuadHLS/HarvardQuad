"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import BulletList, { inputRegex as bulletInputRegex } from "@tiptap/extension-bullet-list"
import OrderedList, { inputRegex as orderedInputRegex } from "@tiptap/extension-ordered-list"
import { Extension, wrappingInputRule, findParentNode } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { PluginKey, TextSelection } from "@tiptap/pm/state"
import Mention from "@tiptap/extension-mention"
import UnderlineExtension from "@tiptap/extension-underline"
import LinkExtension from "@tiptap/extension-link"
import type { SuggestionKeyDownProps } from "@tiptap/suggestion"
import { Bold, Italic, Check, List, ListOrdered, Strikethrough, Underline, Link, Highlighter, RemoveFormatting } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { supabase } from "@/lib/supabase"

/* Google Docs/Sheets/Slides standard theme palette (reverse-engineered, no official API) */
const GOOGLE_DOCS_PALETTE = [
  /* Row 0: Grayscale */
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  /* Row 1: Primary */
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  /* Row 2: Light 3 */
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  /* Row 3: Light 2 */
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  /* Row 4: Light 1 */
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
  /* Row 5: Dark 1 */
  "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
  /* Row 6: Dark 2 */
  "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
  /* Row 7: Dark 3 */
  "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130",
]

function isEmptyHtml(html: string): boolean {
  if (!html || !html.trim()) return true
  const stripped = html.replace(/<[^>]*>/g, "").trim()
  return !stripped
}

const mentionPluginKey = new PluginKey("mention")

/** Google Docs list behavior: Enter on empty list item exits the list. Priority 1000 so we run before ListItem's Enter. */
const GoogleDocsListExit = Extension.create({
  name: "googleDocsListExit",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive("listItem")) return false
        const { $from } = editor.state.selection
        const listItem = $from.node(-1)
        const parentEmpty = $from.parent.content.size === 0
        if (listItem?.type?.name === "listItem" && (parentEmpty || !listItem.textContent.trim())) {
          return editor.commands.liftListItem("listItem")
        }
        return false
      },
    }
  },
})

/** BulletList: no input-rule merge, no toolbar merge. Overrides toggleBulletList to bypass toggleList join logic. */
const BulletListNoMerge = BulletList.extend({
  addCommands() {
    return {
      toggleBulletList: () => ({ editor, state, chain, commands, can }: any) => {
        if (editor.isActive("bulletList")) return commands.liftListItem("listItem")
        if (editor.isActive("orderedList")) {
          const parentList = findParentNode((node: any) => node.type.name === "orderedList")(state.selection)
          if (parentList) {
            return chain().command(({ tr }: any) => { tr.setNodeMarkup(parentList.pos, state.schema.nodes.bulletList); return true }).run()
          }
        }
        return chain()
          .command(() => { if (can().wrapInList("bulletList")) return true; return commands.clearNodes() })
          .wrapInList("bulletList")
          .run()
      },
    }
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: bulletInputRegex,
        type: this.type,
        joinPredicate: () => false,
      }),
    ]
  },
})

/** OrderedList: no input-rule merge, no toolbar merge. Overrides toggleOrderedList to bypass toggleList join logic. */
const OrderedListNoMerge = OrderedList.extend({
  addCommands() {
    return {
      toggleOrderedList: () => ({ editor, state, chain, commands, can }: any) => {
        if (editor.isActive("orderedList")) return commands.liftListItem("listItem")
        if (editor.isActive("bulletList")) {
          const parentList = findParentNode((node: any) => node.type.name === "bulletList")(state.selection)
          if (parentList) {
            return chain().command(({ tr }: any) => { tr.setNodeMarkup(parentList.pos, state.schema.nodes.orderedList); return true }).run()
          }
        }
        return chain()
          .command(() => { if (can().wrapInList("orderedList")) return true; return commands.clearNodes() })
          .wrapInList("orderedList")
          .run()
      },
    }
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: orderedInputRegex,
        type: this.type,
        getAttributes: (match: RegExpMatchArray) => ({ start: +match[1] }),
        joinPredicate: () => false,
      }),
    ]
  },
})

/** BackgroundColor extension (not in @tiptap/extension-color; add to textStyle) */
const BackgroundColor = Extension.create({
  name: "backgroundColor",
  addOptions() {
    return { types: ["textStyle"] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style?.backgroundColor?.replace(/['"]+/g, "") ?? null,
            renderHTML: (attrs: { backgroundColor?: string | null }) =>
              attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setBackgroundColor:
        (color: string) =>
        ({ chain }: { chain: () => unknown }) =>
          (chain() as { setMark: (a: string, b: object) => { run: () => boolean } }).setMark("textStyle", { backgroundColor: color }).run(),
      unsetBackgroundColor:
        () =>
        ({ chain }: { chain: () => unknown }) =>
          (chain() as { setMark: (a: string, b: object) => { removeEmptyTextStyle: () => { run: () => boolean } } }).setMark("textStyle", { backgroundColor: null }).removeEmptyTextStyle().run(),
    } as any
  },
})

/** Close suggestion by moving selection outside trigger range (exitSuggestion not exported in @tiptap/suggestion) */
function exitSuggestion(view: import("@tiptap/pm/view").EditorView, pluginKey: PluginKey) {
  const state = pluginKey.getState(view.state) as { active?: boolean; range?: { from: number; to: number } } | undefined
  if (state?.active && state?.range) {
    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, state.range.to))
    view.dispatch(tr)
  }
}

function createMentionSuggestion() {
  let listEl: HTMLDivElement | null = null
  let selectedIndex = 0
  let currentItems: { id: string; label: string }[] = []
  let currentCommand: (item: { id: string; label: string }) => void = () => {}
  let getClientRect: (() => DOMRect | null) | null = null
  let clickOutsideCleanup: (() => void) | null = null

  const MENTION_LIST_MAX_HEIGHT = 200
  const positionList = (rect: DOMRect) => {
    if (!listEl) return
    const spaceBelow = window.innerHeight - rect.bottom - 4
    const showAbove = spaceBelow < MENTION_LIST_MAX_HEIGHT
    listEl.style.left = `${rect.left}px`
    if (showAbove) {
      listEl.style.top = "auto"
      listEl.style.bottom = `${window.innerHeight - rect.top + 4}px`
    } else {
      listEl.style.bottom = "auto"
      listEl.style.top = `${rect.bottom + 4}px`
    }
  }

  const updateList = (loading = false) => {
    if (!listEl) return
    listEl.innerHTML = ""
    if (loading) {
      listEl.classList.add("empty")
      const loadingEl = document.createElement("div")
      loadingEl.className = "mention-item empty"
      loadingEl.textContent = "Loading…"
      listEl.appendChild(loadingEl)
      const rect = getClientRect?.()
      if (rect) positionList(rect)
      return
    }
    if (currentItems.length === 0) {
      listEl.classList.add("empty")
      const empty = document.createElement("div")
      empty.className = "mention-item empty"
      empty.textContent = "No users found"
      listEl.appendChild(empty)
      return
    }
    listEl.classList.remove("empty")
    currentItems.forEach((item, i) => {
      const div = document.createElement("div")
      div.className = cn("mention-item", i === selectedIndex && "selected")
      div.textContent = item.label
      const select = () => {
        currentCommand(item)
      }
      div.onmousedown = (e) => {
        e.preventDefault()
        select()
      }
      div.ontouchstart = (e) => {
        e.preventDefault()
        select()
      }
      listEl!.appendChild(div)
    })
    const selected = listEl.querySelector(".mention-item.selected")
    selected?.scrollIntoView({ block: "nearest" })
    const rect = getClientRect?.()
    if (rect) positionList(rect)
  }

  const setupClickOutside = (editor: { view: import("@tiptap/pm/view").EditorView }) => {
    clickOutsideCleanup?.()
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target ?? (e as TouchEvent).target
      if (!listEl || !target) return
      if (listEl.contains(target as Node) || editor.view.dom.contains(target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      clickOutsideCleanup?.()
      listEl.remove()
      listEl = null
      exitSuggestion(editor.view, mentionPluginKey)
    }
    document.addEventListener("mousedown", handler, true)
    document.addEventListener("touchstart", handler, { capture: true, passive: false })
    clickOutsideCleanup = () => {
      document.removeEventListener("mousedown", handler, true)
      document.removeEventListener("touchstart", handler, { capture: true } as EventListenerOptions)
      clickOutsideCleanup = null
    }
  }

  return {
    pluginKey: mentionPluginKey,
    items: async ({ query }: { query: string }) => {
      const q = (query || "").trim()
      const { data } = await supabase.rpc("list_profiles_for_mention", { query_param: q || null })
      return (data || []).map((p: { id: string; public_name: string | null; full_name: string | null }) => ({
        id: p.id,
        label: p.public_name || p.full_name || "Unknown",
      }))
    },
    command: ({ editor, range, props }: { editor: any; range: { from: number; to: number }; props: { id?: string | null; label?: string | null } }) => {
      const id = props.id ?? props.label ?? ""
      const label = props.label ?? props.id ?? ""
      editor.chain().focus().insertContentAt(range, [{ type: "mention", attrs: { id, label } }]).run()
    },
    render: () => ({
      onBeforeStart: (props: any) => {
        listEl = document.createElement("div")
        listEl.className = "mention-list"
        const container =
          props.editor?.view?.dom?.closest?.("[data-slot='sheet-content']") ??
          props.editor?.view?.dom?.parentElement ??
          document.body
        container.appendChild(listEl)
        selectedIndex = 0
        currentCommand = props.command
        getClientRect = props.clientRect ?? null
        setupClickOutside(props.editor)
        updateList(true)
      },
      onStart: (props: any) => {
        if (!listEl) {
          listEl = document.createElement("div")
          listEl.className = "mention-list"
          const container =
            props.editor?.view?.dom?.closest?.("[data-slot='sheet-content']") ??
            props.editor?.view?.dom?.parentElement ??
            document.body
          container.appendChild(listEl)
          getClientRect = props.clientRect ?? null
        }
        selectedIndex = 0
        currentItems = props.items
        currentCommand = props.command
        updateList(false)
      },
      onUpdate: (props: any) => {
        selectedIndex = 0
        currentItems = props.items
        currentCommand = props.command
        getClientRect = props.clientRect ?? null
        updateList()
      },
      onExit: () => {
        clickOutsideCleanup?.()
        listEl?.remove()
        listEl = null
      },
      onKeyDown: (_props: SuggestionKeyDownProps) => {
        if (_props.event.key === "ArrowDown") {
          selectedIndex = Math.min(selectedIndex + 1, currentItems.length - 1)
          updateList()
          return true
        }
        if (_props.event.key === "ArrowUp") {
          selectedIndex = Math.max(selectedIndex - 1, 0)
          updateList()
          return true
        }
        if (_props.event.key === "Enter" && currentItems[selectedIndex]) {
          currentCommand(currentItems[selectedIndex])
          return true
        }
        return false
      },
    }),
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "What's happening on campus? Type @ to mention someone",
  disabled = false,
  minHeight = "100px",
  editorRef,
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
  editorRef?: React.MutableRefObject<{ insertContent: (content: string) => void; insertMention: (id: string, label: string) => void } | null>
  className?: string
}) {
  const initialContent = value || ""
  const mentionSuggestion = useRef(createMentionSuggestion()).current

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, bulletList: false, orderedList: false }),
      BulletListNoMerge,
      OrderedListNoMerge,
      GoogleDocsListExit,
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      BackgroundColor,
      UnderlineExtension,
      LinkExtension.configure({ openOnClick: false }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        renderText: ({ node }: { node: { attrs: { label?: string; id?: string } } }) => `@${node.attrs.label ?? node.attrs.id ?? ""}`,
        suggestion: mentionSuggestion,
      }),
    ],
    content: initialContent,
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[80px] prose prose-sm max-w-none px-0",
      },
    },
    onUpdate: ({ editor }: { editor: import("@tiptap/core").Editor }) => {
      const html = editor.getHTML()
      onChange(isEmptyHtml(html) ? "" : html)
    },
  })

  const prevValueRef = useRef(value)
  useEffect(() => {
    if (value === "" && prevValueRef.current !== "" && editor) {
      editor.commands.setContent("", false)
    }
    prevValueRef.current = value
  }, [value, editor])

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
        ? {
            insertContent: (content: string) => {
              editor.chain().focus().insertContent(content).run()
            },
            insertMention: (id: string, label: string) => {
              editor.chain().focus().insertContent({ type: "mention", attrs: { id, label } }).run()
            },
          }
        : null
    }
    return () => {
      if (editorRef) editorRef.current = null
    }
  }, [editor, editorRef])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  const clickSelectionRef = useRef<{ from: number; to: number } | null>(null)
  const [colorMenu, setColorMenu] = useState<"text" | "bg" | null>(null)
  const isMobile = useIsMobile()
  const colorTextAnchorRef = useRef<HTMLDivElement>(null)
  const colorBgAnchorRef = useRef<HTMLDivElement>(null)
  const [linkMenu, setLinkMenu] = useState(false)
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    if (!editor) return
    const onTransaction = ({ transaction }: { transaction: { docChanged?: boolean } }) => {
      if (transaction.docChanged) {
        const { from, to } = editor.state.selection
        if (from === to) clickSelectionRef.current = null
      }
      queueMicrotask(() => forceUpdate((n) => n + 1))
    }
    editor.on("transaction", onTransaction)
    return () => { editor.off("transaction", onTransaction) }
  }, [editor])

  if (!editor) return null
  const ed = editor

  const isMarkActive = (mark: string) => {
    if (ed.isActive(mark)) return true
    const { from, to } = ed.state.selection
    if (from !== to) return false
    const stored = ed.state.storedMarks
    return stored?.some((m: { type: { name: string } }) => m.type.name === mark) ?? false
  }
  const isNodeActive = (node: string) => ed.isActive(node)

  const getClampedSelection = () => {
    const sel = clickSelectionRef.current ?? ed.state.selection
    const doc = ed.state.doc
    const from = Math.min(Math.max(0, sel.from), doc.content.size)
    const to = Math.min(Math.max(from, sel.to), doc.content.size)
    return { from, to }
  }
  const applyToSelection = (fn: (chain: ReturnType<typeof ed.chain>) => ReturnType<ReturnType<typeof ed.chain>["run"]>) => {
    const { from, to } = getClampedSelection()
    const chain = ed.chain().focus()
    fn(from !== to ? chain.setTextSelection({ from, to }) : chain)
  }

  const onToolbarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const { from, to } = ed.state.selection
    clickSelectionRef.current = { from, to }
  }

  const textColor = ed.getAttributes("textStyle").color || ""
  const bgColor = (ed.getAttributes("textStyle") as { backgroundColor?: string }).backgroundColor || ""

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="inline-flex flex-wrap items-center gap-px rounded-sm border border-input bg-transparent px-1 py-0.5 w-fit"
        onMouseDownCapture={onToolbarMouseDown}
      >
        <ToolbarButton onMouseDown={() => applyToSelection((c) => c.toggleBold().run())} active={isMarkActive("bold")} aria-label="Bold">
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton onMouseDown={() => applyToSelection((c) => c.toggleItalic().run())} active={isMarkActive("italic")} aria-label="Italic">
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton onMouseDown={() => applyToSelection((c) => c.toggleUnderline().run())} active={isMarkActive("underline")} aria-label="Underline">
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton onMouseDown={() => applyToSelection((c) => c.toggleStrike().run())} active={isMarkActive("strike")} aria-label="Strikethrough">
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <ToolbarButton
          onMouseDown={() => applyToSelection((c) => c.toggleBulletList().run())}
          active={isNodeActive("bulletList")}
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onMouseDown={() => applyToSelection((c) => c.toggleOrderedList().run())}
          active={isNodeActive("orderedList")}
          aria-label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <div className="relative" ref={colorTextAnchorRef}>
          <ToolbarButton
            onMouseDown={() => setColorMenu((m) => (m === "text" ? null : "text"))}
            active={!!textColor}
            activeColor={textColor || undefined}
            aria-label="Text color"
          >
            <span className="text-sm font-semibold leading-none" style={{ color: textColor || "currentColor" }}>A</span>
          </ToolbarButton>
          {colorMenu === "text" && (
            <ColorDropdown
              isMobile={isMobile}
              anchorRef={colorTextAnchorRef}
              colors={GOOGLE_DOCS_PALETTE.map((v) => ({ name: v, value: v }))}
              selectedColor={textColor || undefined}
              onSelect={(v) => {
                applyToSelection((c) => (v ? c.setColor(v).run() : c.unsetColor().run()))
                setColorMenu(null)
              }}
              onClose={() => setColorMenu(null)}
              usePortal={!isMobile}
            />
          )}
        </div>
        <div className="relative" ref={colorBgAnchorRef}>
          <ToolbarButton
            onMouseDown={() => setColorMenu((m) => (m === "bg" ? null : "bg"))}
            active={!!bgColor}
            activeColor={bgColor || undefined}
            aria-label="Highlight"
          >
            <Highlighter className="size-4" />
          </ToolbarButton>
          {colorMenu === "bg" && (
            <ColorDropdown
              isMobile={isMobile}
              anchorRef={colorBgAnchorRef}
              colors={GOOGLE_DOCS_PALETTE.map((v) => ({ name: v, value: v }))}
              selectedColor={bgColor || undefined}
              showNoneOption
              onSelect={(v) => {
                applyToSelection((c) => (v ? (c as any).setBackgroundColor(v).run() : (c as any).unsetBackgroundColor().run()))
                setColorMenu(null)
              }}
              onClose={() => setColorMenu(null)}
              usePortal={!isMobile}
            />
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            onMouseDown={() => setLinkMenu((m) => !m)}
            active={isMarkActive("link")}
            aria-label="Link"
          >
            <Link className="size-4" />
          </ToolbarButton>
          {linkMenu && (
            <LinkPopover
              initialUrl={ed.getAttributes("link").href || ""}
              onApply={(url) => {
                const { from, to } = getClampedSelection()
                const chain = ed.chain().focus().setTextSelection({ from, to })
                if (url.trim()) {
                  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
                  chain.setLink({ href }).run()
                } else {
                  chain.unsetLink().run()
                }
                setLinkMenu(false)
              }}
              onRemove={() => {
                const { from, to } = getClampedSelection()
                ed.chain().focus().setTextSelection({ from, to }).unsetLink().run()
                setLinkMenu(false)
              }}
              onClose={() => setLinkMenu(false)}
            />
          )}
        </div>
        <ToolbarButton
          onMouseDown={() => {
            const { from, to } = getClampedSelection()
            ed.chain().focus().setTextSelection({ from, to }).unsetAllMarks().run()
          }}
          active={false}
          aria-label="Clear formatting"
          title="Clear formatting"
          disabled={ed.state.selection.from === ed.state.selection.to}
        >
          <RemoveFormatting className="size-4" />
        </ToolbarButton>
      </div>
      <div style={{ minHeight }} className="w-full">
        <EditorContent editor={ed} />
      </div>
    </div>
  )
}

function LinkPopover({
  initialUrl,
  onApply,
  onRemove,
  onClose,
}: {
  initialUrl: string
  onApply: (url: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-sm border border-border bg-popover p-2 shadow-md"
      onMouseDown={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onApply(url)
          if (e.key === "Escape") onClose()
        }}
        placeholder="example.com"
        className="input-text-xs w-64 rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-1">
        <button
          type="button"
          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          onClick={() => onApply(url)}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
          onClick={onRemove}
        >
          Remove link
        </button>
      </div>
    </div>
  )
}

function ColorDropdown({
  isMobile,
  anchorRef,
  colors,
  selectedColor,
  onSelect,
  onClose,
  showNoneOption,
  showDefaultOption,
  usePortal = true,
}: {
  isMobile?: boolean
  anchorRef?: React.RefObject<HTMLElement | null>
  colors: { name: string; value: string }[]
  selectedColor?: string
  onSelect: (value: string) => void
  onClose: () => void
  showNoneOption?: boolean
  showDefaultOption?: boolean
  /** When false, render inline instead of portal. Use on mobile so dropdown stays inside Sheet and receives touches. */
  usePortal?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const paletteWidth = 248
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number; maxHeight: number } | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target ?? (e as TouchEvent).target
      if (ref.current && target && !ref.current.contains(target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [onClose])

  useLayoutEffect(() => {
    if (!anchorRef?.current) {
      setPosition(null)
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - paletteWidth - 8))
    if (isMobile) {
      const maxHeight = Math.min(rect.top - 8, Math.min(window.innerHeight * 0.6, 320))
      setPosition({ left, bottom: window.innerHeight - rect.top + 4, maxHeight })
    } else {
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const maxHeight = Math.min(spaceBelow, Math.min(window.innerHeight * 0.6, 400))
      setPosition({ left, top: rect.bottom + 4, maxHeight })
    }
  }, [isMobile, anchorRef])

  const colorItems = showNoneOption ? colors.filter((c) => c.value) : colors
  const barLabel = showDefaultOption ? "Default" : showNoneOption ? "None" : null
  const isBarSelected = barLabel && !selectedColor

  const content = (
    <div
      ref={ref}
      className={cn(
        "z-[100] flex flex-col rounded-sm border border-border bg-popover shadow-md fixed overflow-y-auto",
        isMobile ? "w-[min(calc(100vw-1rem),248px)]" : "w-[248px]"
      )}
      style={{
        left: position?.left ?? 8,
        ...(isMobile
          ? { bottom: position?.bottom ?? 120 }
          : { top: position?.top ?? 100 }),
        maxHeight: position?.maxHeight ?? 320,
      }}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
    >
      {barLabel && (
        <button
          type="button"
          className={cn(
            "flex w-full shrink-0 items-center justify-between border-b border-border px-2 py-1.5 text-left text-xs transition hover:bg-secondary hover:text-foreground",
            isBarSelected ? "text-foreground" : "text-muted-foreground"
          )}
          onPointerDown={(e) => { e.preventDefault(); onSelect("") }}
          aria-label={barLabel}
        >
          {barLabel}
          {isBarSelected && <Check className="size-3" />}
        </button>
      )}
      <div
        className="grid gap-1 p-1.5 shrink-0"
        style={{
          gridTemplateColumns: "repeat(10, 1.25rem)",
          gridAutoRows: "1.25rem",
          minWidth: "calc(10 * 1.25rem + 9 * 0.25rem + 0.75rem)",
        }}
      >
        {colorItems.map((c) => {
          const isSelected = selectedColor?.toLowerCase() === c.value.toLowerCase()
          return (
            <button
              key={c.value}
              type="button"
              className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition hover:opacity-80"
              style={{ backgroundColor: c.value }}
              onPointerDown={(e) => { e.preventDefault(); onSelect(c.value) }}
              title={c.name}
              aria-label={c.name}
            >
              {isSelected && (
                <Check
                  className="absolute size-3 text-black"
                  strokeWidth={3}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (anchorRef && usePortal) {
    return createPortal(content, document.body)
  }
  return content
}

function ToolbarButton({
  onMouseDown,
  active,
  activeColor,
  children,
  "aria-label": ariaLabel,
  title,
  disabled,
}: {
  onMouseDown: () => void
  active: boolean
  activeColor?: string
  children: React.ReactNode
  "aria-label": string
  title?: string
  disabled?: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (disabled) return
        onMouseDown()
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onMouseDown()
        }
      }}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={cn(
        "flex size-8 items-center justify-center rounded-sm transition-colors select-none",
        disabled && "cursor-not-allowed opacity-40",
        !disabled && "cursor-pointer",
        active && !activeColor && "bg-primary/20 text-primary",
        !active && !disabled && "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
      style={active && activeColor ? { backgroundColor: `${activeColor}33`, color: activeColor } : undefined}
    >
      {children}
    </div>
  )
}
