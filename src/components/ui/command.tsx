"use client"

import * as React from "react"
import {
  Command as CmdkCommand,
  CommandEmpty as CmdkEmpty,
  CommandGroup as CmdkGroup,
  CommandInput as CmdkInput,
  CommandItem as CmdkItem,
  CommandList as CmdkList,
  CommandSeparator as CmdkSeparator,
} from "cmdk"
import { cn } from "@/lib/utils"

const Command = React.forwardRef<
  React.ElementRef<typeof CmdkCommand>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand>
>(({ className, ...props }, ref) => (
  <CmdkCommand
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
      /* Compact command-palette density (Reddit / Supabase–like) */
      "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground",
      "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
      "[&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:gap-2.5",
      /* Subtle highlight — lighter than default accent fill */
      "[&_[cmdk-item][data-selected=true]]:bg-muted/40 [&_[cmdk-item][data-selected=true]]:text-foreground dark:[&_[cmdk-item][data-selected=true]]:bg-muted/30",
      className
    )}
    {...props}
  />
))
Command.displayName = CmdkCommand.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CmdkInput>,
  React.ComponentPropsWithoutRef<typeof CmdkInput>
>(({ className, ...props }, ref) => (
  <CmdkInput
    ref={ref}
    className={cn(
      "flex h-10 w-full min-w-0 border-0 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground md:text-[15px]",
      "focus-visible:ring-0",
      className
    )}
    {...props}
  />
))
CommandInput.displayName = "CommandInput"

const CommandList = React.forwardRef<
  React.ElementRef<typeof CmdkList>,
  React.ComponentPropsWithoutRef<typeof CmdkList>
>(({ className, ...props }, ref) => (
  <CmdkList
    ref={ref}
    className={cn("max-h-[min(52vh,420px)] overflow-y-auto overflow-x-hidden overscroll-contain p-1.5", className)}
    {...props}
  />
))
CommandList.displayName = CmdkList.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CmdkEmpty>,
  React.ComponentPropsWithoutRef<typeof CmdkEmpty>
>((props, ref) => (
  <CmdkEmpty ref={ref} className="py-8 text-center text-sm text-muted-foreground" {...props} />
))
CommandEmpty.displayName = CmdkEmpty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CmdkGroup>,
  React.ComponentPropsWithoutRef<typeof CmdkGroup>
>(({ className, ...props }, ref) => (
  <CmdkGroup ref={ref} className={cn("overflow-hidden p-0 text-foreground", className)} {...props} />
))
CommandGroup.displayName = CmdkGroup.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CmdkItem>,
  React.ComponentPropsWithoutRef<typeof CmdkItem>
>(({ className, ...props }, ref) => (
  <CmdkItem
    ref={ref}
    className={cn(
      "relative flex min-h-[38px] cursor-pointer select-none items-center gap-2 outline-none",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CmdkItem.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CmdkSeparator>,
  React.ComponentPropsWithoutRef<typeof CmdkSeparator>
>(({ className, ...props }, ref) => (
  <CmdkSeparator ref={ref} className={cn("mx-3 my-2 h-px shrink-0 bg-border", className)} {...props} />
))
CommandSeparator.displayName = CmdkSeparator.displayName

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator }
