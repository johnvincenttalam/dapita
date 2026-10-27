import { BaseSchema } from '@adonisjs/lucid/schema'

/** Account deletion requests (CUS-06). Support handles them (doc §13.2); one open request per account. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('deletion_requests', (table) => {
      table.string('id').primary()
      table.string('user_id').notNullable().unique().references('users.id').onDelete('CASCADE')
      table.string('status').notNullable()
      table.timestamp('requested_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('deletion_requests')
  }
}
