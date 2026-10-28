import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The admin console's audit trails: every listing decision (ADM-01) and every
 * account suspension or reinstatement, each with who, when and why.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('moderation_actions', (table) => {
      table.string('id').primary()
      table
        .string('business_id')
        .notNullable()
        .references('businesses.id')
        .onDelete('CASCADE')
        .index()
      table.string('action').notNullable()
      table.string('from_status').notNullable()
      table.string('to_status').notNullable()
      table.text('reason').notNullable()
      table.string('actor_id').notNullable()
      table.string('actor_name').notNullable()
      table.timestamp('at').notNullable()
    })

    this.schema.createTable('account_actions', (table) => {
      table.string('id').primary()
      table.string('user_id').notNullable().references('users.id').onDelete('CASCADE').index()
      table.string('action').notNullable()
      table.text('reason').notNullable()
      table.string('actor_id').notNullable()
      table.string('actor_name').notNullable()
      table.timestamp('at').notNullable()
    })

    this.schema.alterTable('users', (table) => {
      table.text('suspended_reason').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('suspended_reason')
    })
    this.schema.dropTable('account_actions')
    this.schema.dropTable('moderation_actions')
  }
}
