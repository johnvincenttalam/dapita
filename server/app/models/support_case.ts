import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso, json } from '#models/columns'
import type { CaseEvent, CaseStatus, ID, ISODateTime } from '#shared/domain'

/** A support case opened by a reported conversation (ADM-03). */
export default class SupportCase extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare conversationId: ID

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
