import type { LucideIcon } from 'lucide-react'
import {
  DropletsIcon,
  EyeIcon,
  Flower2Icon,
  HandIcon,
  HandbagIcon,
  LeafIcon,
  PaletteIcon,
  ScissorsIcon,
  SparklesIcon,
  SprayCanIcon,
} from 'lucide-react'

import type { CategoryIcon, ServiceCategory } from '@/types/catalog'

/** Icons for the category tiles on design screen 3. The taxonomy stores keys, not components. */
export const categoryIcons: Record<CategoryIcon, LucideIcon> = {
  barber: ScissorsIcon,
  salon: SprayCanIcon,
  spa: Flower2Icon,
  nails: HandIcon,
  gowns: HandbagIcon,
  makeup: PaletteIcon,
  skin: DropletsIcon,
  brows: EyeIcon,
  wellness: LeafIcon,
  generic: SparklesIcon,
}

/** The icon for a category, or a generic one while categories are loading. */
export function categoryIconFor(category?: Pick<ServiceCategory, 'icon'>): LucideIcon {
  return categoryIcons[category?.icon ?? 'generic']
}
