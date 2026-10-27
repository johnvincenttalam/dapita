import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { ConsentPurpose, ID, ISODateTime } from '#shared/domain'

/** A legal document version the user accepted, kept as a record (doc §13.3). */
export default class Consent extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare userId: ID

  @column()
  declare purpose: ConsentPurpose

  @column()
  declare version: string

  @column(iso)
  declare grantedAt: ISODateTime
}
