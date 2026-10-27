import { BaseSchema } from '@adonisjs/lucid/schema'

/** Customer and shop conversations (MER-05), reports and the support cases they open. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('conversations', (table) => {
      table.string('id').primary()
      table.string('customer_id').notNullable().references('users.id')
      table.string('customer_name').notNullable()
      table.string('business_id').notNullable().references('businesses.id')
      table.string('booking_id').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('last_message_at').notNullable()
      table.timestamp('reported_at').nullable()
      table.unique(['customer_id', 'business_id'])
    })

    this.schema.createTable('messages', (table) => {
      table.string('id').primary()
      table
        .string('conversation_id')
        .notNullable()
        .references('conversations.id')
        .onDelete('CASCADE')
      table.string('sender_id').notNullable()
      table.string('sender_role').notNullable()
      table.text('body').notNullable()
      table.timestamp('sent_at').notNullable()
      table.timestamp('read_at').nullable()
      table.index(['conversation_id', 'sent_at'])
    })

    this.schema.createTable('conversation_reports', (table) => {
      table.string('id').primary()
      table
        .string('conversation_id')
        .notNullable()
        .references('conversations.id')
        .onDelete('CASCADE')
      table.string('reporter_id').notNullable()
      table.string('reporter_side').notNullable()
      table.text('reason').notNullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('support_cases', (table) => {
      table.string('id').primary()
      table
        .string('conversation_id')
        .notNullable()
        .references('conversations.id')
        .onDelete('CASCADE')
      table.string('status').notNullable()
      table.string('owner_id').nullable()
      table.string('owner_name').nullable()
      table.json('events').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('support_cases')
    this.schema.dropTable('conversation_reports')
    this.schema.dropTable('messages')
    this.schema.dropTable('conversations')
  }
}
