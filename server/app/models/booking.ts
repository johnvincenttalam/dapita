import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso, json } from '#models/columns'
import type {
  BookingContact,
  BookingMethod,
  BookingProposal,
  BookingServiceSnapshot,
  BookingStatus,
  ID,
  ISODateTime,
} from '#shared/domain'

/** Field names match the `Booking` API type; only `start`, `end` and `service` map to other columns. */
export default class Booking extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  /** Short human-readable code for support and the merchant's front desk. */
  @column()
  declare reference: string

  @column()
  declare customerId: ID

  @column(json)
  declare contact: BookingContact

  @column()
  declare businessId: ID

  @column()
  declare serviceId: ID

  /** `null` = any available staff member. */
  @column()
  declare staffId: ID | null

  /** The requested time, or the agreed time once confirmed. */
  @column({ ...iso, columnName: 'start_at' })
  declare start: ISODateTime

  @column({ ...iso, columnName: 'end_at' })
  declare end: ISODateTime

  @column(json)
  declare proposal: BookingProposal | null

  @column()
  declare status: BookingStatus

  @column()
  declare notes: string | null

  @column()
  declare bookingMethod: BookingMethod

  /** Service details as agreed when the request was made (doc §11.1). */
  @column({ ...json, columnName: 'service_snapshot' })
  declare service: BookingServiceSnapshot

  @column()
  declare policyVersion: number

  @column(iso)
  declare respondBy: ISODateTime | null

  @column({ serializeAs: null })
  declare idempotencyKey: string | null

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare updatedAt: ISODateTime
}
