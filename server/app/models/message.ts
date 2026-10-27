import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { ConversationSide, ID, ISODateTime } from '#shared/domain'

export default class Message extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare conversationId: ID

  @column()
  declare senderId: ID

  @column()
  declare senderRole: ConversationSide

  @column()
  declare body: string

  @column(iso)
  declare sentAt: ISODateTime

  /** When the other side opened it. */
  @column(iso)
  declare readAt: ISODateTime | null
}
