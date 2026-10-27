import { BaseModel, column } from '@adonisjs/lucid/orm'
import { iso } from '#models/columns'
import type { DeletionRequest as DeletionRequestData, ID, ISODateTime } from '#shared/domain'

/** A customer's request to delete their account. Nothing is deleted until support handles it. */
export default class DeletionRequest extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare userId: ID

  @column()
  declare status: DeletionRequestData['status']

  @column(iso)
  declare requestedAt: ISODateTime
}
