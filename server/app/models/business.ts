import { BaseModel, column } from '@adonisjs/lucid/orm'
import { bool, iso, json } from '#models/columns'
import type {
  BookingMethod,
  BusinessPhoto,
  BusinessPolicies,
  BusinessStatus,
  ClosurePeriod,
  Coordinates,
  ID,
  ISODateTime,
  RatingSummary,
  WeeklyHours,
} from '#shared/domain'

export default class Business extends BaseModel {
  static table = 'businesses'
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: ID

  @column()
  declare slug: string

  @column()
  declare ownerId: ID

  @column()
  declare name: string

  @column()
  declare description: string

  /** The first entry is the primary category. */
  @column(json)
  declare categoryIds: ID[]

  @column()
  declare areaId: ID

  @column()
  declare address: string

  @column(json)
  declare coordinates: Coordinates | null

  @column()
  declare phone: string | null

  @column()
  declare status: BusinessStatus

  @column()
  declare bookingMethod: BookingMethod

  @column(bool)
  declare verified: boolean

  @column(bool)
  declare featured: boolean

  @column(json)
  declare hours: WeeklyHours

  @column(json)
  declare closures: ClosurePeriod[]

  @column(json)
  declare policies: BusinessPolicies

  @column(json)
  declare photos: BusinessPhoto[]

  @column(json)
  declare rating: RatingSummary | null

  @column()
  declare moderationNote: string | null

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare updatedAt: ISODateTime

  get coverPhoto() {
    return this.photos.find((photo) => photo.kind === 'cover')
  }
}
