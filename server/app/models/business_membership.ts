import { BaseModel, column } from '@adonisjs/lucid/orm'
import { json } from '#models/columns'
import type { ID, MerchantNotificationSettings } from '#shared/domain'

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

  /** Null until the person changes them; the defaults apply until then. */
  @column(json)
  declare notificationSettings: MerchantNotificationSettings | null
}
