import { BaseSchema } from '@adonisjs/lucid/schema'

/** The admin-managed taxonomy and the launch city's areas. */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('areas', (table) => {
      table.string('id').primary()
      table.string('slug').notNullable().unique()
      table.string('name').notNullable()
      table.json('center').notNullable()
    })

    this.schema.createTable('categories', (table) => {
      table.string('id').primary()
      table.string('slug').notNullable().unique()
      table.string('name').notNullable()
      table.string('parent_id').nullable()
      table.string('icon').notNullable()
      table.string('status').notNullable()
      table.integer('sort_order').notNullable()
      table.text('description').nullable()
    })
  }

  async down() {
    this.schema.dropTable('categories')
    this.schema.dropTable('areas')
  }
}
