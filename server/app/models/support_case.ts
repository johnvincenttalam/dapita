import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso, json } from '#models/columns'
import type {
  CaseEvent,
  CaseKind,
  CaseStatus,
  ConversationSide,
  ID,
  ISODateTime,
} from '#shared/domain'

/** A support case (ADM-03): a reported conversation, or a request sent from the support page. */
export default class SupportCase extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare kind: CaseKind

  /** `message` cases: the reported conversation. */
  @column()
  declare conversationId: ID | null

  /** The shop it's about: the conversation's, the booking's or the reported listing. */
  @column()
  declare businessId: ID | null

  @column()
  declare bookingId: ID | null

  /** Null once the sender's account is gone. */
  @column()
  declare reporterId: ID | null

  @column()
  declare reporterSide: ConversationSide | null

  @column()
  declare status: CaseStatus

  @column()
  declare ownerId: ID | null

  @column()
  declare ownerName: string | null

  /** Oldest first: the audit trail. */
  @column(json)
  declare events: CaseEvent[]

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare updatedAt: ISODateTime
}
