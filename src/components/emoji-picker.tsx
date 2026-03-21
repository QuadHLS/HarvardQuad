import { useState } from "react"
import EmojiPickerLib from "emoji-picker-react"
import { type EmojiClickData, Categories, Theme } from "emoji-picker-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuArrow,
} from "@/components/ui/dropdown-menu"
import { Smile } from "lucide-react"

export function EmojiPicker({
  onSelect,
  triggerClassName,
}: {
  onSelect: (emoji: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  const handleEmojiClick = (data: EmojiClickData) => {
    onSelect(data.emoji)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Add emoji"
        >
          <Smile className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="bottom" sideOffset={6} arrowPadding={8} className="emoji-picker-dropdown border-border p-0 overflow-hidden outline-none">
        <DropdownMenuArrow className="fill-[var(--popover)]" />
        <EmojiPickerLib
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={280}
            height={320}
            searchPlaceHolder="Search emoji..."
            autoFocusSearch={false}
            previewConfig={{ showPreview: false }}
            categories={[
              Categories.SMILEYS_PEOPLE,
              Categories.ANIMALS_NATURE,
              Categories.FOOD_DRINK,
              Categories.TRAVEL_PLACES,
              Categories.ACTIVITIES,
              Categories.OBJECTS,
              Categories.SYMBOLS,
              Categories.FLAGS,
            ]}
          />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
