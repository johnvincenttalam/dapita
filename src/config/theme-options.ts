import type { LucideIcon } from 'lucide-react'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import type { Theme } from '@/lib/theme'

export const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
]
