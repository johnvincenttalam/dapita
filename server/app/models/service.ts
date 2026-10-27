import { BaseModel, column } from '@adonisjs/lucid/orm'
import { bool, json } from '#models/columns'
import type { ID, ServicePrice } from '#shared/domain'

export default class Service extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare businessId: ID

  @column()
  declare categoryId: ID

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare requirements: string | null

  @column(json)
  declare price: ServicePrice

  @column()
  declare durationMinutes: number

  @column()
  declare bufferMinutes: number

  @column()
  declare photoUrl: string | null

  @column(bool)
  declare featured: boolean

  @column(bool)
  declare active: boolean

  @column()
  declare sortOrder: number
}
