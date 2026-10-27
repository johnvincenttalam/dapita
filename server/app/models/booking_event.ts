import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { BookingAction, BookingActor, BookingStatus, ID, ISODateTime } from '#shared/domain'

/** One entry in a booking's audit trail (BKG-08). Never updated or deleted. */
export default class BookingEvent extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare bookingId: ID

  @column()
  declare action: BookingAction

  @column()
  declare actor: BookingActor

  /** `null` for system actions. */
  @column()
  declare actorId: ID | null

  @column({ columnName: 'from_status' })
  declare from: BookingStatus

  @column({ columnName: 'to_status' })
  declare to: BookingStatus

  @column()
  declare reason: string | null

  @column(iso)
  declare at: ISODateTime
}
