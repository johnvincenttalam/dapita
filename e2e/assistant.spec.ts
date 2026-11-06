import { expect, test } from '@playwright/test'

// The customer assistant, as a guest on the in-browser mock data: open it, ask for shops,
// ask about opening hours, then follow a shop card to the shop page.

test('a guest finds a barber, asks about hours, and follows a shop card', async ({ page }) => {
  await page.goto('/')

  const bubble = page.getByRole('button', { name: 'Open Dapita Assistant' })
  await expect(bubble).toBeVisible()
  await bubble.click()

  const panel = page.getByRole('dialog', { name: 'Dapita Assistant' })
  await expect(panel).toContainText('Tell me what you need and where')
  await expect(panel.getByRole('button', { name: /^Find a .+ near me$|^Shops in / }).first()).toBeVisible()

  const message = panel.getByRole('textbox', { name: 'Message' })

  await message.fill('barbers in Poblacion')
  await panel.getByRole('button', { name: 'Send message' }).click()
  const card = panel.getByRole('article').filter({ hasText: 'The Good Cut Barbershop' })
  await expect(card).toBeVisible()
  await expect(panel.getByRole('link', { name: 'See these on Explore' })).toBeVisible()
  // Ratings come from real reviews only; the assistant must not invent one.
  await expect(panel.getByRole('article')).not.toContainText('average rating')

  await message.fill('what time does The Good Cut close')
  await panel.getByRole('button', { name: 'Send message' }).click()
  await expect(panel.getByText(/The Good Cut Barbershop is (open|closed)/i)).toBeVisible()

  // Exact: the card's save-to-favourites link also carries the shop's name.
  await card.first().getByRole('link', { name: 'The Good Cut Barbershop', exact: true }).click()
  await expect(page).toHaveURL(/\/shops\/the-good-cut-barbershop/)
  await expect(page.getByRole('heading', { level: 1, name: 'The Good Cut Barbershop' })).toBeVisible()
  await expect(panel).toBeHidden()
})
