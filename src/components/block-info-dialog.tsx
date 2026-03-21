"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Info } from "lucide-react"

const BLOCK_INFO = [
  "Your DM is deleted. You can't message each other.",
  "You're unfriended. Any pending friend request is cancelled.",
  "You won't see their profile or posts in feeds.",
  "Notifications between you (likes, mentions, etc.) are removed.",
  "They won't be notified.",
  "To unblock: Settings → Blocked users.",
]

export function BlockInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground shrink-0" />
            About blocking
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {BLOCK_INFO.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              {item}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
