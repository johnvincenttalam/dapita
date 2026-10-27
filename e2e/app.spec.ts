import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function signInWithPrototypeAccount(page: Page, account: 'Customer' | 'Business owner' | 'Administrator') {
  await page.getByRole('button', { name: account }).click()
}

test.describe('marketplace navigation', () => {
  test('uses the tab bar on mobile and the header on desktop', async ({ page, isMobile }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /find your style/i })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    if (isMobile) {
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
      await page.getByRole('navigation', { name: 'Tab bar' }).getByRole('link', { name: 'Explore' }).click()
    } else {
      await expect(page.getByRole('navigation', { name: 'Tab bar' })).toBeHidden()
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Explore' }).click()
    }
    await expect(page).toHaveURL(/\/explore$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Explore' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('shows a 404 page inside the layout for unknown routes', async ({ page }) => {
    await page.goto('/nope')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('template reference pages are not part of production builds', async ({ page }) => {
    await page.goto('/dev/components')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})

test.describe('discovery', () => {
  // Doc §18.1 #1: a guest can search and open a shop.
  test('a guest browses a category, opens a shop and is asked to sign in to book', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Barber', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Barber' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: 'The Good Cut Barbershop' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'The Good Cut Barbershop' })).toBeVisible()
    await expect(page.getByText('Request to book')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: 'Men’s Haircut', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Men’s Haircut' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: /book this service/i }).click()
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=/)
    await signInWithPrototypeAccount(page, 'Customer')
    await expect(page).toHaveURL(/\/shops\/the-good-cut-barbershop\/book\?service=svc_mens_haircut$/)

    // Doc §18.1 #3: the request is sent and shown as pending, not confirmed.
    await expect(page.getByRole('heading', { level: 1, name: 'Book appointment' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('group', { name: 'Select time' }).getByRole('radio').first().check({ force: true })
    await page.getByRole('checkbox', { name: /cancellation policy/i }).click()
    await page.getByRole('button', { name: /send booking request/i }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Request sent!' })).toBeVisible()
    await expect(page.getByText(/booking confirmed/i)).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await page.getByRole('link', { name: 'View booking' }).click()
    await expect(page.getByRole('region', { name: 'Status' })).toContainText('Pending')
  })

  test('a customer accepts a proposed time and the booking becomes confirmed', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/bookings')
    await signInWithPrototypeAccount(page, 'Customer')
    await expect(page.getByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: /review new time/i }).click()
    await page.getByRole('button', { name: 'Accept new time' }).click()
    await expect(page.getByRole('region', { name: 'Status' })).toContainText('Confirmed')
    await expect(page.getByRole('button', { name: /add to calendar/i })).toBeVisible()
  })

  test('explore filters live in the URL', async ({ page }) => {
    await page.goto('/explore?q=hilot')
    await expect(page.getByText('1 shop for “hilot”')).toBeVisible()
    await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: 'Nails' }).click()
    await expect(page).toHaveURL(/category=nails/)
    await expect(page.getByText('No shops match your search')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('onboarding', () => {
  // Plan step 5 exit criterion: guest → sign-up → returns to the intended action.
  test('a guest signs up while booking and comes back to the booking form', async ({ page }) => {
    const bookPath = '/shops/the-good-cut-barbershop/book?service=svc_mens_haircut'
    await page.goto(bookPath)
    await page.getByRole('link', { name: 'Create an account' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'How will you use Dapita?' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('link', { name: /i’m a customer/i }).click()

    await page.getByRole('textbox', { name: /your name/i }).fill('Lea Cruz')
    await page.getByRole('textbox', { name: /email/i }).fill('lea@example.com')
    await page.getByLabel(/^password/i).fill('mirror42')
    await page.getByRole('checkbox', { name: /i agree to the terms of use/i }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible()
    await page.getByRole('link', { name: 'Open verification link' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Email verified' })).toBeVisible()
    await page.getByRole('link', { name: 'Continue' }).click()

    await expect(page).toHaveURL(new RegExp(`${bookPath.replace(/[?]/g, '\\?')}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Book appointment' })).toBeVisible()
  })
})

test.describe('new shops', () => {
  // MER-01, plan §8 #5: a new owner sets up the listing and sends it for review; it stays private.
  test('a business owner signs up, sets up the listing and submits it for review', async ({ page }) => {
    await page.goto('/business/sign-up')
    await page.getByRole('textbox', { name: /your name/i }).fill('Lea Cruz')
    await page.getByRole('textbox', { name: /business name/i }).fill('Kulot Studio')
    await page.getByRole('textbox', { name: /email/i }).fill('lea@kulot.ph')
    await page.getByRole('textbox', { name: /mobile number/i }).fill('0917 123 4567')
    await page.getByLabel(/^password/i).fill('mirror42')
    await page.getByRole('checkbox', { name: /i agree/i }).click()
    await page.getByRole('button', { name: 'Create business account' }).click()
    await page.getByRole('link', { name: 'Open verification link' }).click()
    await page.getByRole('link', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Set up your listing' })).toBeVisible()
    await page.getByRole('textbox', { name: /Description/ }).fill('Curls, cuts and colour for every hair type.')
    await page.getByRole('checkbox', { name: 'Salon' }).check({ force: true })
    await page.getByRole('combobox', { name: /Area/ }).selectOption({ label: 'Bajada' })
    await page.getByRole('textbox', { name: /Address/ }).fill('12 J.P. Laurel Ave, Bajada, Davao City')
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { name: 'Opening hours' })).toBeVisible()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('textbox', { name: /Service name/ }).fill('Curly Cut')
    await page.getByRole('textbox', { name: /^Price/ }).fill('600')
    await page.getByRole('button', { name: 'Add service' }).click()
    await expect(page.getByRole('list', { name: 'Your services' }).getByText('Curly Cut')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('textbox', { name: /Cancellation policy/ }).fill('Free cancellation up to 3 hours before.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Submit for review' }).click()
    await expect(page.getByRole('heading', { name: 'Your listing is waiting for review' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // Still private until an admin approves it.
    await page.goto('/shops/kulot-studio')
    await expect(page.getByText('This shop isn’t available')).toBeVisible()
  })
})

test.describe('admin console', () => {
  // ADM-01: an administrator approves a submitted listing with a reason, and it goes public.
  test('an administrator approves a listing and the shop goes live', async ({ page }) => {
    await page.goto('/shops/kulot-studio')
    await expect(page.getByText('This shop isn’t available')).toBeVisible()

    await page.goto('/auth/sign-in?next=/admin')
    await signInWithPrototypeAccount(page, 'Administrator')
    await page.getByRole('link', { name: /listings waiting for review/ }).click()
    await page
      .getByRole('list', { name: 'Waiting for review' })
      .getByRole('link', { name: /Kulot Studio/ })
      .click()
    await expect(page.getByRole('heading', { level: 1, name: 'Kulot Studio' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Approve' }).click()
    const dialog = page.getByRole('dialog', { name: 'Approve Kulot Studio?' })
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('Address and prices check out.')
    await dialog.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByRole('region', { name: 'History' }).getByText('Address and prices check out.')).toBeVisible()

    await page.getByRole('link', { name: 'View shop page' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Kulot Studio' })).toBeVisible()
  })

  test('an administrator suspends an account and it can no longer sign in', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/admin/users')
    await signInWithPrototypeAccount(page, 'Administrator')
    await page.getByRole('button', { name: 'Suspend Andrea Reyes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Suspend Andrea Reyes?' })
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('Repeated abuse in messages.')
    await dialog.getByRole('button', { name: 'Suspend' }).click()
    await expect(page.getByText('Suspended: “Repeated abuse in messages.”')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))
    await page.goto('/auth/sign-in')
    await signInWithPrototypeAccount(page, 'Customer')
    await expect(page.getByText('This account is suspended. Contact Dapita support.')).toBeVisible()
  })
})

test.describe('signed-in areas', () => {
  test('a guest is sent to sign-in and returned to their bookings', async ({ page }) => {
    await page.goto('/bookings')
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fbookings$/)
    await signInWithPrototypeAccount(page, 'Customer')

    await expect(page).toHaveURL(/\/bookings$/)
    await expect(page.getByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('a business owner lands in the merchant dashboard', async ({ page, isMobile }) => {
    await page.goto('/auth/sign-in')
    await signInWithPrototypeAccount(page, 'Business owner')

    await expect(page).toHaveURL(/\/business$/)
    await expect(
      page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Paolo$/ }),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Needs your answer' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // The sidebar is a sheet on mobile, opened from the top bar.
    if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await page.getByRole('navigation', { name: 'Business dashboard' }).getByRole('link', { name: 'Services' }).click()
    await expect(page).toHaveURL(/\/business\/services$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Services' })).toBeVisible()
  })

  // Plan §15 step 7: request → merchant accepts → customer sees Confirmed.
  test('a business owner accepts a request and the customer sees it confirmed', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/business/bookings/bk_andrea_pending')
    await signInWithPrototypeAccount(page, 'Business owner')
    const detail = page.getByRole('article', { name: 'Andrea Reyes' })
    await expect(detail).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await detail.getByRole('button', { name: 'Accept' }).click()
    await expect(page.getByText('Booking confirmed. Andrea Reyes can see it now.')).toBeVisible()

    // Sign out without touching the mock database, then come back as the customer.
    await page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))
    await page.goto('/auth/sign-in?next=/bookings/bk_andrea_pending')
    await signInWithPrototypeAccount(page, 'Customer')
    await expect(page.getByRole('region', { name: 'Status' })).toContainText('Confirmed')
  })

  // MER-02: a new service goes on the public shop page straight away.
  test('a business owner adds a service and customers can see it', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/business/services')
    await signInWithPrototypeAccount(page, 'Business owner')
    await expect(page.getByRole('heading', { level: 1, name: 'Services' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: 'Add service' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Add service' })).toBeVisible()
    await page.getByRole('textbox', { name: /Service name/ }).fill('Buzz Cut')
    await page.getByRole('textbox', { name: /^Price/ }).fill('150')
    await page.getByRole('spinbutton', { name: /Duration/ }).fill('20')
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Add service' }).click()
    await expect(page.getByText('Buzz Cut is on your menu.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Buzz Cut' })).toBeVisible()

    await page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))
    await page.goto('/shops/the-good-cut-barbershop')
    await page.getByRole('tab', { name: 'Services' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Buzz Cut' })).toBeVisible()
  })

  // MER-03: a closure takes the day out of the customer's booking calendar.
  test('a business owner closes a day and customers can’t request it', async ({ page }) => {
    // Two days from now in Davao, as the booking page labels it ("Tue, Oct 27").
    const day = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(day)
    const label = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(
      day,
    )

    await page.goto('/auth/sign-in?next=/business/profile?tab=closures')
    await signInWithPrototypeAccount(page, 'Business owner')
    await expect(page.getByRole('heading', { level: 1, name: 'Business profile' })).toBeVisible()
    const add = page.getByRole('region', { name: 'Add a closure' })
    await add.getByLabel(/First day/).fill(dateKey)
    await add.getByLabel(/Last day/).fill(dateKey)
    await add.getByRole('textbox', { name: /Reason/ }).fill('Staff outing')
    await expectNoHorizontalOverflow(page)
    await add.getByRole('button', { name: 'Add closure' }).click()
    await expect(page.getByRole('region', { name: 'Upcoming closures' }).getByText('Staff outing')).toBeVisible()

    await page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))
    await page.goto('/auth/sign-in?next=/shops/the-good-cut-barbershop/book?service=svc_mens_haircut')
    await signInWithPrototypeAccount(page, 'Customer')
    const dates = page.getByRole('group', { name: 'Select date' })
    await expect(dates.getByRole('radio', { name: new RegExp(label) })).toBeDisabled()
  })

  test('a business owner checks the day and the week on the calendar', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/business/calendar')
    await signInWithPrototypeAccount(page, 'Business owner')
    await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible()
    // The seeded day: John, Mark and Alyssa are booked with Ken and Mark.
    await expect(page.getByRole('region', { name: 'Ken' }).getByRole('link', { name: /John Dela Cruz/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Week' }).click()
    await expect(page).toHaveURL(/view=week/)
    await expect(page.getByRole('link', { name: /Alyssa Santos/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  // Plan §15 #5: messaging round trip customer ↔ merchant.
  test('a customer messages a shop and reads the reply', async ({ page }) => {
    const signOut = () => page.evaluate(() => localStorage.removeItem('glamspot-mock-session'))

    await page.goto('/auth/sign-in?next=/shops/the-good-cut-barbershop')
    await signInWithPrototypeAccount(page, 'Customer')
    await page.getByRole('button', { name: 'Message shop' }).first().click()
    await expect(page).toHaveURL(/\/inbox\/conv_andrea_goodcut$/)
    const box = page.getByRole('textbox', { name: 'Message' })
    await box.fill('Is there parking near the shop?')
    await box.press('Enter')
    await expect(page.getByRole('log', { name: 'Messages' }).getByText('Is there parking near the shop?')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await signOut()
    await page.goto('/auth/sign-in?next=/business/messages')
    await signInWithPrototypeAccount(page, 'Business owner')
    await page
      .getByRole('list', { name: 'Conversations' })
      .getByRole('link', { name: /Andrea Reyes/ })
      .click()
    const thread = page.getByRole('article', { name: 'Conversation with Andrea Reyes' })
    await expect(
      thread.getByRole('log', { name: 'Messages' }).getByText('Is there parking near the shop?'),
    ).toBeVisible()
    await thread.getByRole('textbox', { name: 'Message' }).fill('Yes, free parking at the back.')
    await thread.getByRole('button', { name: 'Send message' }).click()
    // In the conversation, not the box: the reply is only saved once it shows there.
    await expect(
      thread.getByRole('log', { name: 'Messages' }).getByText('Yes, free parking at the back.'),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await signOut()
    await page.goto('/auth/sign-in?next=/inbox')
    await signInWithPrototypeAccount(page, 'Customer')
    const row = page.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Good Cut/ })
    await expect(row).toContainText('Yes, free parking at the back.')
    await expect(row).toContainText('1 unread')
  })

  test('the session survives a reload', async ({ page }) => {
    await page.goto('/auth/sign-in?next=/admin/merchants')
    await signInWithPrototypeAccount(page, 'Administrator')
    await expect(page.getByRole('heading', { level: 1, name: 'Merchants' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Merchants' })).toBeVisible()
  })
})

test.describe('preferences', () => {
  test('theme choice applies and survives a reload', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await page.getByRole('button', { name: /change theme/i }).click()
    await page.getByRole('menuitemradio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
