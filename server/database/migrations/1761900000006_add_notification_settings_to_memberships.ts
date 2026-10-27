import { BaseSchema } from '@adonisjs/lucid/schema'

/** Which emails each owner or staff member gets about a business (§9.2 Settings). Null means the defaults. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('business_memberships', (table) => {
      table.json('notification_settings').nullable()
    })
  }

  async down() {
    this.schema.alterTable('business_memberships', (table) => {
      table.dropColumn('notification_settings')
    })
  }
}
