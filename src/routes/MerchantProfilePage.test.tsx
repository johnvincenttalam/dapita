import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { updateMockDb } from '@/services/mock/db'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import MerchantProfilePage from '@/routes/MerchantProfilePage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Tests can hold uploads open by swapping `resizing.gate` for a promise they resolve later.
const resizing = vi.hoisted(() => ({ gate: Promise.resolve() }))
vi.mock('@/lib/resize-image', () => ({
  resizeImageToDataUrl: () => resizing.gate.then(() => 'data:image/webp;base64,AA'),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')
const SLUG = 'the-good-cut-barbershop'

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/business/profile', Component: MerchantProfilePage }], {
    initialEntries: [path],
  })
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MerchantProfilePage', () => {
  it('saves the listing details customers see', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile')
    expect(await screen.findByRole('heading', { level: 1, name: 'Business profile' })).toBeInTheDocument()
    const name = await screen.findByRole('textbox', { name: /Business name/ })
    expect(screen.getByRole('link', { name: 'View shop page' })).toHaveAttribute('href', `/shops/${SLUG}`)
    expect(name).toHaveValue('The Good Cut Barbershop')
    expect(screen.getByRole('checkbox', { name: 'Barber' })).toBeChecked()
    await user.clear(name)
    await user.type(name, 'Good Cut Davao')
    await user.selectOptions(screen.getByRole('combobox', { name: /Area/ }), 'Lanang')
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(await screen.findByText('Business details saved.')).toBeInTheDocument()
    expect(await shopsService.getShop(SLUG)).toMatchObject({ name: 'Good Cut Davao', area: { name: 'Lanang' } })
  })

  it('explains what is missing before saving details', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile')
    await user.clear(await screen.findByRole('textbox', { name: /Description/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Barber' }))
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(await screen.findByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Choose at least one category')).toBeInTheDocument()
  })

  it('closes a day and adds split hours', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=hours')
    await user.click(await screen.findByRole('switch', { name: 'Open on Friday' }))
    const monday = screen.getByRole('group', { name: 'Monday' })
    await user.click(within(monday).getByRole('button', { name: 'Add hours' }))
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Opens' })[1] as HTMLElement, '6:00 PM')
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Closes' })[1] as HTMLElement, '10:00 PM')
    await user.click(screen.getByRole('button', { name: 'Save hours' }))

    // 10:00–21:00 and 18:00–22:00 overlap.
    expect(await within(monday).findByText('Opening times on the same day can’t overlap')).toBeInTheDocument()
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Closes' })[0] as HTMLElement, '2:00 PM')
    await user.click(screen.getByRole('button', { name: 'Save hours' }))

    expect(await screen.findByText('Opening hours saved. New bookings follow them.')).toBeInTheDocument()
    const { hours } = await shopsService.getShop(SLUG)
    expect(hours[5]).toEqual([])
    expect(hours[1]).toEqual([
      { open: '10:00', close: '14:00' },
      { open: '18:00', close: '22:00' },
    ])
  })

  it('adds a closure, warning about bookings on those dates, and removes it', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=closures')
    const add = await screen.findByRole('region', { name: 'Add a closure' })
    await user.type(within(add).getByLabelText(/First day/), '2026-10-21')
    // The last day fills in to match, for the usual one-day closure.
    expect(within(add).getByLabelText(/Last day/)).toHaveValue('2026-10-21')
    await user.clear(within(add).getByLabelText(/Last day/))
    await user.type(within(add).getByLabelText(/Last day/), '2026-10-22')
    // Three confirmed appointments today, one request tomorrow (seed data).
    expect(await within(add).findByText(/4 bookings and requests fall on these dates/)).toBeInTheDocument()

    await user.clear(within(add).getByLabelText(/First day/))
    await user.type(within(add).getByLabelText(/First day/), '2026-12-24')
    await user.clear(within(add).getByLabelText(/Last day/))
    await user.type(within(add).getByLabelText(/Last day/), '2026-12-26')
    await user.type(within(add).getByRole('textbox', { name: /Reason/ }), 'Christmas')
    expect(within(add).queryByText(/fall on these dates/)).not.toBeInTheDocument()
    await user.click(within(add).getByRole('button', { name: 'Add closure' }))

    const list = await screen.findByRole('region', { name: 'Upcoming closures' })
    expect(await within(list).findByText('Christmas')).toBeInTheDocument()
    expect((await shopsService.getShop(SLUG)).closures.map((closure) => closure.reason)).toContain('Christmas')

    await user.click(within(list).getByRole('button', { name: /Remove closure Christmas/ }))
    await waitFor(() => expect(within(list).queryByText('Christmas')).not.toBeInTheDocument())
  })

  it('saves policies as a new version', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=policies')
    const cancellation = await screen.findByRole('textbox', { name: /Cancellation policy/ })
    expect(screen.getByText(/Version 2\./)).toBeInTheDocument()
    await user.clear(cancellation)
    await user.type(cancellation, 'Free cancellation up to 6 hours before your appointment.')
    await user.click(screen.getByRole('button', { name: 'Save booking rules' }))

    expect(await screen.findByText('Booking rules saved. New requests use version 3.')).toBeInTheDocument()
    expect((await shopsService.getShop(SLUG)).policies).toMatchObject({ version: 3 })
  })

  describe('photos', () => {
    const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' })
    const seedGallery = (count: number) =>
      updateMockDb((db) => {
        const business = db.businesses.find((b) => b.slug === SLUG)!
        const cover = business.photos.filter((p) => p.kind === 'cover')
        business.photos = [
          ...cover,
          ...Array.from({ length: count }, (_, i) => ({
            id: `ph_seed_${i}`,
            url: `/seed-${i}.webp`,
            alt: `Seed ${i}`,
            kind: 'gallery' as const,
          })),
        ]
      })
    const items = async () =>
      within(await screen.findByRole('list', { name: 'Gallery photos' })).getAllByRole('listitem')
    const galleryIds = async () =>
      (await shopsService.getShop(SLUG)).photos.filter((p) => p.kind === 'gallery').map((p) => p.id)

    it('adds a gallery photo and shows it on the shop page', async () => {
      const user = userEvent.setup()
      seedGallery(1)
      renderAt('/business/profile?tab=photos')
      const before = (await items()).length
      await user.upload(screen.getByLabelText('Add photos'), png())
      await waitFor(async () => expect(await items()).toHaveLength(before + 1))
      expect(await galleryIds()).toHaveLength(before + 1)
    })

    it('replaces the cover photo', async () => {
      const user = userEvent.setup()
      renderAt('/business/profile?tab=photos')
      await user.upload(await screen.findByLabelText('Replace cover photo'), png())
      await waitFor(async () =>
        expect((await shopsService.getShop(SLUG)).photos.find((p) => p.kind === 'cover')?.url).toBe(
          'data:image/webp;base64,AA',
        ),
      )
    })

    it('only adds as many photos as fit', async () => {
      const user = userEvent.setup()
      seedGallery(7)
      renderAt('/business/profile?tab=photos')
      await user.upload(await screen.findByLabelText('Add photos'), [png('a.png'), png('b.png'), png('c.png')])
      expect(await screen.findByText('You can add up to 8 gallery photos, so 2 weren’t added.')).toBeInTheDocument()
      await waitFor(async () => expect(await galleryIds()).toHaveLength(8))
    })

    it('doesn’t let a rejected file take a free slot', async () => {
      const user = userEvent.setup({ applyAccept: false })
      seedGallery(7)
      renderAt('/business/profile?tab=photos')
      await user.upload(await screen.findByLabelText('Add photos'), [
        new File(['x'], 'a.gif', { type: 'image/gif' }),
        png('b.png'),
        png('c.png'),
      ])
      expect(await screen.findByText('That file isn’t a photo. Use JPG, PNG or WebP.')).toBeInTheDocument()
      expect(screen.getByText('You can add up to 8 gallery photos, so 1 wasn’t added.')).toBeInTheDocument()
      await waitFor(async () => expect(await galleryIds()).toHaveLength(8))
    })

    it('rejects a file that isn’t a photo', async () => {
      const user = userEvent.setup({ applyAccept: false })
      seedGallery(1)
      renderAt('/business/profile?tab=photos')
      await user.upload(await screen.findByLabelText('Add photos'), new File(['x'], 'a.txt', { type: 'text/plain' }))
      expect(await screen.findByText('That file isn’t a photo. Use JPG, PNG or WebP.')).toBeInTheDocument()
      expect(await galleryIds()).toHaveLength(1)
    })

    it('removes a photo after confirming', async () => {
      const user = userEvent.setup()
      seedGallery(2)
      renderAt('/business/profile?tab=photos')
      expect(await items()).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Remove photo 1' }))
      const dialog = await screen.findByRole('alertdialog', { name: 'Remove this photo?' })
      await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
      await waitFor(async () => expect(await items()).toHaveLength(1))
    })

    it('moves a photo earlier', async () => {
      const user = userEvent.setup()
      seedGallery(2)
      renderAt('/business/profile?tab=photos')
      await user.click(await screen.findByRole('button', { name: 'Move photo 2 earlier' }))
      await waitFor(async () => expect(await galleryIds()).toEqual(['ph_seed_1', 'ph_seed_0']))
    })

    it('keeps focus on a photo moved with the keyboard and announces where it went', async () => {
      const user = userEvent.setup()
      seedGallery(3)
      renderAt('/business/profile?tab=photos')
      await user.click(await screen.findByRole('button', { name: 'Move photo 2 earlier' }))
      expect(await screen.findByText('Photo moved to position 1.')).toBeInTheDocument()
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move photo 1 later' })),
      )
      expect(within((await items())[0]!).getByRole('img')).toHaveAttribute('alt', 'Seed 1')
    })

    it('stops uploading the rest of a batch when the owner leaves the tab', async () => {
      const user = userEvent.setup()
      seedGallery(1)
      renderAt('/business/profile?tab=photos')
      let release = () => {}
      resizing.gate = new Promise<void>((resolve) => (release = resolve))
      await user.upload(await screen.findByLabelText('Add photos'), [png('a.png'), png('b.png')])
      await user.click(screen.getByRole('tab', { name: 'Hours' }))
      release()
      resizing.gate = Promise.resolve()
      await waitFor(async () => expect(await galleryIds()).toHaveLength(2))
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(await galleryIds()).toHaveLength(2)
    })
  })
})
