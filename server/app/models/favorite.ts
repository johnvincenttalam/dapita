import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { ID, ISODateTime } from '#shared/domain'

/** A shop a customer saved to come back to (CUS-07). */
export default class Favorite extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: ID

  @column()
  declare businessId: ID

  @column(iso)
  declare savedAt: ISODateTime
}
