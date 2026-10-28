import { BaseSchema } from '@adonisjs/lucid/schema'

/** Shops a customer saved (CUS-07). Saving twice keeps one row. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('favorites', (table) => {
      table.increments('id')
      table.string('user_id').notNullable().references('users.id').onDelete('CASCADE')
      table.string('business_id').notNullable().references('businesses.id').onDelete('CASCADE')
      table.timestamp('saved_at').notNullable()
      table.unique(['user_id', 'business_id'])
    })
  }

  async down() {
    this.schema.dropTable('favorites')
  }
}
