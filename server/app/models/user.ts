import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import BusinessMembership from '#models/business_membership'
import { iso, json } from '#models/columns'
import type { ID, ISODateTime, UserRole } from '#shared/domain'

export default class User extends compose(BaseModel, withAuthFinder(hash)) {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare phone: string | null

  @column(json)
  declare roles: UserRole[]

  @column(iso)
  declare emailVerifiedAt: ISODateTime | null

  /** Set while an admin has suspended the account; sign-in and sessions are refused. */
  @column(iso)
  declare suspendedAt: ISODateTime | null

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare updatedAt: ISODateTime

  @hasMany(() => BusinessMembership)
  declare memberships: HasMany<typeof BusinessMembership>
}
