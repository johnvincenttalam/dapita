import { BaseSchema } from '@adonisjs/lucid/schema'

/** Accounts, business memberships and the consents accepted at sign-up. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('users', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.string('phone').nullable()
      table.json('roles').notNullable()
      table.timestamp('email_verified_at').nullable()
      table.timestamp('suspended_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('business_memberships', (table) => {
      table.increments('id')
      table.string('user_id').notNullable().references('users.id').onDelete('CASCADE')
      table.string('business_id').notNullable()
      table.string('role').notNullable()
      table.unique(['user_id', 'business_id'])
    })

    this.schema.createTable('consents', (table) => {
      table.string('id').primary()
      table.string('user_id').notNullable().references('users.id').onDelete('CASCADE')
      table.string('purpose').notNullable()
      table.string('version').notNullable()
      table.timestamp('granted_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('consents')
    this.schema.dropTable('business_memberships')
    this.schema.dropTable('users')
  }
}
