import { BaseSchema } from '@adonisjs/lucid/schema'

/** What a customer is here for: `{ categoryIds, answeredAt }`, null until they answer. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.json('interests').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('interests')
    })
  }
}
