import type { LucideIcon } from 'lucide-react'
import { Fragment, useEffect } from 'react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

export interface CommandAction {
  id: string
  label: string
  icon?: LucideIcon
  /** Extra words that should match this item in search. */
  keywords?: string[]
  shortcut?: string
  onSelect: () => void
}

export interface CommandActionGroup {
  heading: string
  actions: CommandAction[]
}

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandActionGroup[]
  /** Toggle with Ctrl+K / ⌘K. Disable if several menus are mounted. */
  enableShortcut?: boolean
}

export function CommandMenu({ open, onOpenChange, groups, enableShortcut = true }: CommandMenuProps) {
  useEffect(() => {
    if (!enableShortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enableShortcut, open, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command menu" description="Search pages and actions">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, index) => (
          <Fragment key={group.heading}>
            {index > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.heading}>
              {group.actions.map(({ id, label, icon: Icon, keywords, shortcut, onSelect }) => (
                <CommandItem
                  key={id}
                  value={`${group.heading} ${label}`}
                  keywords={keywords}
                  onSelect={() => {
                    onOpenChange(false)
                    onSelect()
                  }}
                >
                  {Icon ? <Icon aria-hidden="true" /> : null}
                  <span>{label}</span>
                  {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
