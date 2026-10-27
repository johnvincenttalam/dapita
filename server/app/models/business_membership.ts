import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { ID } from '#shared/domain'

/** Which businesses a user can manage in the merchant dashboard. */
export default class BusinessMembership extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: ID

  @column()
  declare businessId: ID

  @column()
  declare role: 'owner' | 'staff'
}
