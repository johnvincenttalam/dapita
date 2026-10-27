import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { ID, ISODateTime } from '#shared/domain'

/** One thread between a customer and a business (MER-05). There is at most one per pair. */
export default class Conversation extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare customerId: ID

  @column()
  declare customerName: string

  @column()
  declare businessId: ID

  /** The booking the conversation is most recently about, if any. */
  @column()
  declare bookingId: ID | null

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare lastMessageAt: ISODateTime

  @column(iso)
  declare reportedAt: ISODateTime | null
}
