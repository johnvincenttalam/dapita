import { BaseModel, column } from '@adonisjs/lucid/orm'
import { json } from '#models/columns'
import type { Coordinates, ID } from '#shared/domain'

export default class Area extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare slug: string

  @column()
  declare name: string

  @column(json)
  declare center: Coordinates
}
