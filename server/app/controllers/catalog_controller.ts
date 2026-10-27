import { listAreas, listPublicCategories } from '#services/catalog'

export default class CatalogController {
  async categories() {
    return listPublicCategories()
  }

  async areas() {
    return listAreas()
  }
}
