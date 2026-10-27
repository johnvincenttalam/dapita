import { BaseSchema } from '@adonisjs/lucid/schema'

/** Booking requests and their audit trail (BKG-08). */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('bookings', (table) => {
      table.string('id').primary()
      table.string('reference').notNullable().unique()
      table.string('customer_id').notNullable().references('users.id')
      table.json('contact').notNullable()
      table.string('business_id').notNullable().references('businesses.id')
      table.string('service_id').notNullable()
      table.string('staff_id').nullable()
      table.timestamp('start_at').notNullable()
      table.timestamp('end_at').notNullable()
      table.json('proposal').nullable()
      table.string('status').notNullable()
      table.text('notes').nullable()
      table.string('booking_method').notNullable()
      table.json('service_snapshot').notNullable()
      table.integer('policy_version').notNullable()
      table.timestamp('respond_by').nullable()
      // Lets a retried submit return the original booking instead of a duplicate (doc §11.1).
      table.string('idempotency_key').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['customer_id', 'idempotency_key'])
      table.index(['business_id', 'start_at'])
      table.index(['status', 'respond_by'])
    })

    this.schema.createTable('booking_events', (table) => {
      table.string('id').primary()
      table.string('booking_id').notNullable().references('bookings.id').onDelete('CASCADE')
      table.string('action').notNullable()
      table.string('actor').notNullable()
      table.string('actor_id').nullable()
      table.string('from_status').notNullable()
      table.string('to_status').notNullable()
      table.text('reason').nullable()
      table.timestamp('at').notNullable()
      table.index(['booking_id', 'at'])
    })
  }

  async down() {
    this.schema.dropTable('booking_events')
    this.schema.dropTable('bookings')
  }
}
