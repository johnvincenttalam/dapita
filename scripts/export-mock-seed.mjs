// Writes the frontend's demo data (src/services/mock/seed) to a JSON file, so the
// AdonisJS server seeds the same shops, services, bookings and accounts the mock
// mode shows. Dates are relative to "now", so run it each time the database is reset.
//
//   node scripts/export-mock-seed.mjs server/tmp/seed.json
//
// The seed modules use Vite features (the `@/` alias, import.meta.env), so they are
// loaded through Vite rather than plain Node.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'

const output = process.argv[2]
if (!output) {
  console.error('Usage: node scripts/export-mock-seed.mjs <output.json>')
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, '..')
const vite = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { createSeedDb } = await vite.ssrLoadModule('/src/services/mock/db.ts')
  const { mockUsers, MOCK_PASSWORD } = await vite.ssrLoadModule('/src/services/mock/users.ts')
  const { legalDocuments } = await vite.ssrLoadModule('/src/config/legal.ts')

  const db = createSeedDb(new Date())
  const seed = {
    exportedAt: new Date().toISOString(),
    password: MOCK_PASSWORD,
    users: Object.values(mockUsers),
    legalVersions: Object.fromEntries(Object.entries(legalDocuments).map(([purpose, doc]) => [purpose, doc.version])),
    areas: db.areas,
    categories: db.categories,
    businesses: db.businesses,
    services: db.services,
    staff: db.staff,
    bookings: db.bookings,
    bookingEvents: db.bookingEvents,
    conversations: db.conversations,
    messages: db.messages,
    favorites: db.favorites,
  }
  await mkdir(path.dirname(path.resolve(output)), { recursive: true })
  await writeFile(output, JSON.stringify(seed, null, 2))
  console.log(
    `Exported ${seed.businesses.length} businesses, ${seed.services.length} services, ` +
      `${seed.bookings.length} bookings and ${seed.users.length} accounts to ${output}`,
  )
} finally {
  await vite.close()
}
