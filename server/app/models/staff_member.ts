import { BaseModel, column } from '@adonisjs/lucid/orm'
import { bool, json } from '#models/columns'
import type { ID } from '#shared/domain'

export default class StaffMember extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare businessId: ID

  @column()
  declare displayName: string

  @column()
  declare title: string | null

  @column()
  declare avatarUrl: string | null

  @column(json)
  declare serviceIds: ID[]

  @column(bool)
  declare active: boolean
}
