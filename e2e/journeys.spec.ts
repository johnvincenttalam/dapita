import { expect, test, type Page } from '@playwright/test'

// The MVP journeys from plan §10.3 not covered in app.spec.ts: a shop proposes a new
// time (#2), a customer cancels after seeing the policy (#3), the map works with
// location denied (#6), and the legal and support pages (step 11).

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function signInAs(page: Page, account: 'Customer' | 'Business owner' | 'Administrator', next: string) {
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(next)}`)
  await page.getByRole('button', { name: account }).click()
}

/** Leaves the mock database as it is, so the next account sees the change. */
async function signOut(page: Page) {
  await page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))
}

test.describe('booking journeys', () => {
  // Plan §10.3 #2: the shop proposes another time; the customer must accept it.
  test('a business owner proposes another time and the customer is asked to accept it', async ({ page }) => {
    await signInAs(page, 'Business owner', '/business/bookings/bk_andrea_pending')
    const detail = page.getByRole('article', { name: 'Andrea Reyes' })
    await detail.getByRole('button', { name: 'Propose time' }).click()

    const dialog = page.getByRole('dialog', { name: 'Propose another time' })
    const days = dialog.getByRole('group', { name: 'Select date' }).getByRole('radio')
    await days.nth(1).check({ force: true })
    await dialog
      .getByRole('group', { name: 'Select time' })
      .getByRole('radio', { disabled: false })
      .first()
      .check({ force: true })
    await dialog.getByRole('textbox', { name: /Message to Andrea Reyes/ }).fill('We’re fully booked then, sorry.')
    await dialog.getByRole('button', { name: 'Send new time' }).click()
    await expect(dialog).toBeHidden()

    await signOut(page)
    await signInAs(page, 'Customer', '/bookings/bk_andrea_pending')
    const status = page.getByRole('region', { name: 'Status' })
    await expect(status).toContainText('New time proposed')
    await expect(status).toContainText('We’re fully booked then, sorry.')
    await expect(status.getByRole('button', { name: 'Accept new time' })).toBeVisible()
  })

  // Plan §10.3 #3: cancelling shows the shop's policy before anything changes.
  test('a customer sees the cancellation policy before cancelling', async ({ page }) => {
    await signInAs(page, 'Customer', '/bookings/bk_andrea_confirmed')
    await page.getByRole('button', { name: 'Cancel booking' }).click()

    const dialog = page.getByRole('alertdialog', { name: 'Cancel this booking?' })
    await expect(dialog).toContainText('Cancellation policy:')
    await dialog.getByRole('button', { name: 'Cancel booking' }).click()
    await expect(page.getByRole('region', { name: 'Status' })).toContainText('Cancelled')
  })
})

test.describe('map', () => {
  // Plan §10.3 #6: with location refused, choosing an area still narrows the map.
  test('with location denied, an area still narrows the map', async ({ page, context, isMobile }) => {
    await context.clearPermissions()
    await page.goto('/explore')
    await page.getByRole('group', { name: 'View' }).getByRole('link', { name: 'Map' }).click()
    await expect(page).toHaveURL(/view=map/)
    const map = page.getByRole('region', { name: 'Map of shops' })
    await expect(map.locator('.leaflet-marker-icon').first()).toBeVisible()
    const before = await map.locator('.leaflet-marker-icon').count()

    await map.getByRole('button', { name: 'Use my location' }).click()
    await expect(page.getByText(/Location is turned off|couldn’t find your location/)).toBeVisible()

    if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('combobox', { name: 'Area' }).click()
    await page.getByRole('option', { name: 'Lanang' }).click()
    if (isMobile) await page.getByRole('button', { name: /^Show \d+ shops?$/ }).click()
    await expect(page).toHaveURL(/area=lanang/)
    await expect.poll(() => map.locator('.leaflet-marker-icon').count()).toBeLessThan(before)

    await map.locator('.leaflet-marker-icon').first().click()
    if (isMobile) {
      await expect(map.getByRole('article')).toContainText('Lanang')
    } else {
      await expect(page.getByRole('list', { name: 'Shops on the map' }).locator('article.ring-2')).toContainText(
        'Lanang',
      )
    }
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('legal and support', () => {
  test('the footer links to every legal document', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    for (const [link, heading] of [
      ['Terms of use', 'Terms of use'],
      ['Privacy notice', 'Privacy notice'],
      ['Merchant policy', 'Merchant listing policy'],
    ]) {
      await footer.getByRole('link', { name: link }).click()
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(page.getByText('Draft for review')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.goto('/')
    }
  })

  test('a customer reports a listing and an administrator sees the case', async ({ page }) => {
    await signInAs(page, 'Customer', '/shops/glow-and-go-beauty-salon')
    await page.getByRole('link', { name: 'Report this listing' }).click()
    await expect(page.getByText(/Reporting: Glow & Go Beauty Salon/)).toBeVisible()
    await page.getByRole('textbox', { name: /What happened/ }).fill('The prices on this listing are out of date.')
    await page.getByRole('button', { name: 'Send to support' }).click()
    await expect(page.getByRole('heading', { name: 'Request sent' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await signOut(page)
    await signInAs(page, 'Administrator', '/admin/reports')
    await page
      .getByRole('list', { name: 'Open' })
      .getByRole('link', { name: /Glow & Go Beauty Salon’s listing/ })
      .click()
    await expect(page.getByRole('region', { name: 'Request' })).toContainText(
      'The prices on this listing are out of date.',
    )
  })
})
