import { BaseSchema } from '@adonisjs/lucid/schema'

/** A service's photo becomes an object (seeded `{ url }` or an uploaded file's storage key). */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('services', (table) => {
      table.dropColumn('photo_url')
      table.json('photo').nullable()
    })
  }

  async down() {
    this.schema.alterTable('services', (table) => {
      table.dropColumn('photo')
      table.string('photo_url').nullable()
    })
  }
}
