import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Listings, their services and staff. Nested values the API always returns
 * whole (hours, closures, policies, photos, prices) are JSON columns; anything
 * filtered or joined on is a column of its own.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('businesses', (table) => {
      table.string('id').primary()
      table.string('slug').notNullable().unique()
      table.string('owner_id').notNullable().references('users.id')
      table.string('name').notNullable()
      table.text('description').notNullable()
      table.json('category_ids').notNullable()
      table.string('area_id').notNullable()
      table.string('address').notNullable()
      table.json('coordinates').nullable()
      table.string('phone').nullable()
      table.string('status').notNullable().index()
      table.string('booking_method').notNullable()
      table.boolean('verified').notNullable()
      table.boolean('featured').notNullable()
      table.json('hours').notNullable()
      table.json('closures').notNullable()
      table.json('policies').notNullable()
      table.json('photos').notNullable()
      table.json('rating').nullable()
      table.text('moderation_note').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('services', (table) => {
      table.string('id').primary()
      table.string('business_id').notNullable().references('businesses.id').onDelete('CASCADE')
      table.string('category_id').notNullable()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.text('requirements').nullable()
      table.json('price').notNullable()
      table.integer('duration_minutes').notNullable()
      table.integer('buffer_minutes').notNullable()
      table.string('photo_url').nullable()
      table.boolean('featured').notNullable()
      table.boolean('active').notNullable()
      table.integer('sort_order').notNullable()
    })

    this.schema.createTable('staff_members', (table) => {
      table.string('id').primary()
      table.string('business_id').notNullable().references('businesses.id').onDelete('CASCADE')
      table.string('display_name').notNullable()
      table.string('title').nullable()
      table.string('avatar_url').nullable()
      table.json('service_ids').notNullable()
      table.boolean('active').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('staff_members')
    this.schema.dropTable('services')
    this.schema.dropTable('businesses')
  }
}
