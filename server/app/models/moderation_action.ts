import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { BusinessStatus, ID, ISODateTime, ModerationActionType } from '#shared/domain'

/** An admin decision on a listing (ADM-01), kept as an audit trail. */
export default class ModerationAction extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare businessId: ID

  @column()
  declare action: ModerationActionType

  @column()
  declare fromStatus: BusinessStatus

  @column()
  declare toStatus: BusinessStatus

  @column()
  declare reason: string

  @column()
  declare actorId: ID

  @column()
  declare actorName: string

  @column(iso)
  declare at: ISODateTime
}
