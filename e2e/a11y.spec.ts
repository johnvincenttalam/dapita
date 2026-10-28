import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Plan §10.3 #8: an axe scan of every primary page, as each kind of user, on desktop
// and phone. Serious and critical violations fail the test; the rest are reported.

type Account = 'guest' | 'usr_customer' | 'usr_merchant' | 'usr_admin'

const pages: Record<Account, string[]> = {
  guest: [
    '/',
    '/welcome',
    '/get-started',
    '/explore',
    '/explore?view=map',
    '/categories/barber',
    '/shops/the-good-cut-barbershop',
    '/shops/the-good-cut-barbershop/services/svc_mens_haircut',
    '/auth/sign-in',
    '/auth/sign-up',
    '/auth/forgot-password',
    '/business/sign-up',
    '/legal/terms',
    '/legal/privacy',
    '/legal/merchant-policy',
    '/support',
    '/no-such-page',
  ],
  usr_customer: [
    '/bookings',
    '/bookings/bk_andrea_alternative',
    '/inbox',
    '/inbox/conv_andrea_goodcut',
    '/account',
    '/account/privacy',
    '/shops/the-good-cut-barbershop/book',
    '/support?topic=booking',
  ],
  usr_merchant: [
    '/business',
    '/business/bookings',
    '/business/calendar',
    '/business/messages',
    '/business/messages/conv_andrea_goodcut',
    '/business/services',
    '/business/services/new',
    '/business/profile',
    '/business/settings',
  ],
  usr_admin: [
    '/admin',
    '/admin/merchants',
    '/admin/merchants/biz_kulot',
    '/admin/categories',
    '/admin/reports',
    '/admin/reports/case_conv_bea_polished',
    '/admin/users',
    '/admin/logs',
  ],
}

async function openAs(page: Page, account: Account, path: string) {
  if (account !== 'guest') {
    await page.addInitScript((id) => localStorage.setItem('glamspot-mock-session', id), account)
  }
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Let entrance transitions settle so colour contrast is measured on the final colours.
  await page.waitForTimeout(300)
}

for (const [account, paths] of Object.entries(pages) as [Account, string[]][]) {
  test.describe(`accessibility as ${account === 'guest' ? 'a guest' : account.replace('usr_', '')}`, () => {
    for (const path of paths) {
      test(`${path} has no serious or critical axe violations`, async ({ page }, testInfo) => {
        await openAs(page, account, path)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
        const summary = results.violations.map(
          (violation) =>
            `${violation.impact}: ${violation.id} (${violation.nodes.length}) ${violation.help}\n    ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(' '))
              .join('\n    ')}`,
        )
        if (summary.length)
          await testInfo.attach('axe violations', { body: summary.join('\n'), contentType: 'text/plain' })
        const blocking = results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        )
        expect(blocking.map((violation) => summary[results.violations.indexOf(violation)])).toEqual([])
      })
    }
  })
}
