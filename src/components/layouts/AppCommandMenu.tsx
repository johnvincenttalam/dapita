import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import { CommandMenu, type CommandActionGroup } from '@/components/shared/CommandMenu'
import type { NavGroup } from '@/config/navigation'
import { themeOptions } from '@/config/theme-options'
import { useTheme } from '@/hooks/use-theme'
import { useUiStore } from '@/stores/ui-store'

interface AppCommandMenuProps {
  /** The navigation of the current area (marketplace, merchant, admin…). */
  nav: NavGroup[]
}

/** The command menu (Ctrl/⌘+K) wired to the current area's routes and the theme. Mounted once per layout. */
export function AppCommandMenu({ nav }: AppCommandMenuProps) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const open = useUiStore((state) => state.commandMenuOpen)
  const setOpen = useUiStore((state) => state.setCommandMenuOpen)

  const groups = useMemo<CommandActionGroup[]>(
    () => [
      ...nav.map((group) => ({
        heading: group.label ?? 'Pages',
        actions: group.items.map((item) => ({
          id: item.to,
          label: item.title,
          icon: item.icon,
          keywords: item.description ? [item.description] : undefined,
          onSelect: () => navigate(item.to),
        })),
      })),
      {
        heading: 'Theme',
        actions: themeOptions.map((option) => ({
          id: `theme-${option.value}`,
          label: `Use ${option.label.toLowerCase()} theme`,
          icon: option.icon,
          keywords: ['appearance', 'dark mode', 'light mode'],
          onSelect: () => setTheme(option.value),
        })),
      },
    ],
    [nav, navigate, setTheme],
  )

  return <CommandMenu open={open} onOpenChange={setOpen} groups={groups} />
}
