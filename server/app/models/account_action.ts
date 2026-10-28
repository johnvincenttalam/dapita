import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { AccountAction as AccountActionData, ID, ISODateTime } from '#shared/domain'

/** An admin suspending or reinstating an account, kept as an audit trail. */
export default class AccountAction extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare userId: ID

  @column()
  declare action: AccountActionData['action']

  @column()
  declare reason: string

  @column()
  declare actorId: ID

  @column()
  declare actorName: string

  @column(iso)
  declare at: ISODateTime
}
