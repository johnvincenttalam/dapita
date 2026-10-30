import { BaseModel, column } from '@adonisjs/lucid/orm'
import { bool, iso, json } from '#models/columns'
import { toPublicPhoto, type StoredPhoto } from '#helpers/photos'
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

  /** Uploaded photos hold a storage key here; serializers send `publicPhotos`. */
  @column(json)
  declare photos: StoredPhoto[]

  @column(json)
  declare rating: RatingSummary | null

  @column()
  declare moderationNote: string | null

  @column(iso)
  declare createdAt: ISODateTime

  @column(iso)
  declare updatedAt: ISODateTime

  /** The photos with their URLs, as clients see them. */
  get publicPhotos(): BusinessPhoto[] {
    return this.photos.map(toPublicPhoto)
  }

  get coverPhoto(): BusinessPhoto | undefined {
    const cover = this.photos.find((photo) => photo.kind === 'cover')
    return cover && toPublicPhoto(cover)
  }
}
