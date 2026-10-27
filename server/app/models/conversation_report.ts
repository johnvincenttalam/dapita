import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { ConversationSide, ID, ISODateTime } from '#shared/domain'

export default class ConversationReport extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare conversationId: ID

  @column()
  declare reporterId: ID

  @column()
  declare reporterSide: ConversationSide

  @column()
  declare reason: string

  @column(iso)
  declare createdAt: ISODateTime
}
