import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Support cases from the support page (ADM-03): a case can now be about a booking,
 * a listing, the sender's account, or anything else, not only a reported
 * conversation. Each case records who opened it.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('support_cases', (table) => {
      table.string('kind').notNullable().defaultTo('message')
      table.setNullable('conversation_id')
      table.string('business_id').nullable().references('businesses.id').onDelete('CASCADE')
      table.string('booking_id').nullable().references('bookings.id').onDelete('SET NULL')
      // Kept when the sender's account goes, so the case and its trail survive.
      table.string('reporter_id').nullable().references('users.id').onDelete('SET NULL')
      table.string('reporter_side').nullable()
      table.index(['reporter_id', 'status'])
    })

    // Existing cases are reported conversations: their reporter is the first report's.
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE support_cases AS c
        SET reporter_id = r.reporter_id, reporter_side = r.reporter_side, business_id = v.business_id
        FROM conversations AS v,
          (SELECT DISTINCT ON (conversation_id) conversation_id, reporter_id, reporter_side
           FROM conversation_reports ORDER BY conversation_id, created_at) AS r
        WHERE v.id = c.conversation_id AND r.conversation_id = c.conversation_id
      `)
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('support_cases').whereNull('conversation_id').delete()
    })
    this.schema.alterTable('support_cases', (table) => {
      table.dropIndex(['reporter_id', 'status'])
      table.dropColumn('reporter_side')
      table.dropColumn('reporter_id')
      table.dropColumn('booking_id')
      table.dropColumn('business_id')
      table.dropColumn('kind')
      table.dropNullable('conversation_id')
    })
  }
}
