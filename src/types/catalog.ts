import type { Coordinates, ID } from '@/types/common'

/** A district of the launch city used for search and listing locations. */
export interface Area {
  id: ID
  slug: string
  name: string
  /** Approximate centre, for distance and map defaults. */
  center: Coordinates
}

export type CategoryStatus = 'active' | 'hidden' | 'coming_soon'

/** Icon keys the UI maps to icons; the taxonomy is admin-managed (ADM-02), so it can't hold components. */
export type CategoryIcon =
  'barber' | 'salon' | 'spa' | 'nails' | 'gowns' | 'makeup' | 'skin' | 'brows' | 'wellness' | 'generic'

export interface ServiceCategory {
  id: ID
  slug: string
  name: string
  /** Set on subcategories (e.g. Spa & Massage → Facial). Top-level categories have none. */
  parentId?: ID
  icon: CategoryIcon
  status: CategoryStatus
  sortOrder: number
  description?: string
}
