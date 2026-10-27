import { apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { readMockDb } from '@/services/mock/db'
import { delay } from '@/services/mock/utils'
import type { Area, ServiceCategory } from '@/types/catalog'

export interface CatalogService {
  /** Public categories (active and coming soon), sorted for display. */
  getCategories: () => Promise<ServiceCategory[]>
  getAreas: () => Promise<Area[]>
}

const httpCatalogService: CatalogService = {
  getCategories: () => apiClient.get<ServiceCategory[]>('/categories'),
  getAreas: () => apiClient.get<Area[]>('/areas'),
}

// MOCK: reads the seeded taxonomy from the in-browser database.
const mockCatalogService: CatalogService = {
  async getCategories() {
    await delay(250)
    return readMockDb()
      .categories.filter((category) => category.status !== 'hidden')
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },
  async getAreas() {
    await delay(250)
    return readMockDb().areas.sort((a, b) => a.name.localeCompare(b.name))
  },
}

export const catalogService: CatalogService = env.useMocks ? mockCatalogService : httpCatalogService
