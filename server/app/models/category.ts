import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { CategoryIcon, CategoryStatus, ID } from '#shared/domain'

export default class Category extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare slug: string

  @column()
  declare name: string

  @column()
  declare parentId: ID | null

  @column()
  declare icon: CategoryIcon

  @column()
  declare status: CategoryStatus

  @column()
  declare sortOrder: number

  @column()
  declare description: string | null
}
