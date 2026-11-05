import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { ApiError } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'
import { updateMockDb } from '@/services/mock/db'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { merchantServicesService } from '@/services/merchant-services.service'
import { shopsService } from '@/services/shops.service'
import MerchantServiceEditorPage from '@/routes/MerchantServiceEditorPage'

vi.mock('@/lib/resize-image', () => ({
  resizeImageToDataUrl: () => Promise.resolve('data:image/webp;base64,AA'),
}))

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/business/services', element: <p>Services list</p> },
      { path: '/business/services/new', Component: MerchantServiceEditorPage },
      { path: '/business/services/:serviceId', Component: MerchantServiceEditorPage },
    ],
    { initialEntries: [path] },
  )
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

/** The live preview line, which styles its label and value separately. */
const preview = () =>
  screen.getByText((_, element) => element?.tagName === 'P' && /^Customers see:/.test(element.textContent ?? ''))

const publicServices = () => shopsService.getShopServices('the-good-cut-barbershop')
const png = () => new File(['x'], 'a.png', { type: 'image/png' })
const publicPhoto = async (id: string) => (await publicServices()).find((s) => s.id === id)?.photo
const withoutPhoto = (id: string) =>
  updateMockDb((db) => {
    delete db.services.find((s) => s.id === id)!.photo
  })

beforeAll(() => {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
})

async function fillNewService(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(await screen.findByRole('textbox', { name: /Service name/ }), name)
  await user.type(screen.getByRole('textbox', { name: /^Price/ }), '150')
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

describe('MerchantServiceEditorPage', () => {
  it('adds a service that customers can see', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/services/new')
    expect(await screen.findByRole('heading', { level: 1, name: 'Add service' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Service name/ }), 'Buzz Cut')
    await user.click(screen.getByRole('radio', { name: 'Beard & Shave' }))
    await user.type(screen.getByRole('textbox', { name: /^Price/ }), '150')
    await user.click(screen.getByRole('radio', { name: 'Other' }))
    const duration = screen.getByRole('spinbutton', { name: /Duration/ })
    await user.clear(duration)
    await user.type(duration, '20')
    expect(preview()).toHaveTextContent('Customers see: ₱150 · 20 mins')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
    expect((await publicServices()).find((service) => service.name === 'Buzz Cut')).toMatchObject({
      categoryId: 'sub_beard',
      price: { type: 'fixed', amount: 150 },
      durationMinutes: 20,
      active: true,
    })
  })

  it('asks for both ends of a price range, in order', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.type(await screen.findByRole('textbox', { name: /Service name/ }), 'Fade')
    await user.click(screen.getByRole('radio', { name: 'Price range' }))
    await user.type(screen.getByRole('textbox', { name: /Lowest price/ }), '500')
    await user.type(screen.getByRole('textbox', { name: /Highest price/ }), '300')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByText('The highest price must be more than the lowest')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Highest price/ })).toHaveAttribute('aria-invalid', 'true')
  })

  it('hides the amount for price on consultation', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.click(await screen.findByRole('radio', { name: 'Price on consultation' }))
    expect(screen.queryByRole('textbox', { name: /Price/ })).not.toBeInTheDocument()
    expect(preview()).toHaveTextContent('Customers see: Price on consultation · 30 mins')
  })

  it('edits a saved service', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/services/svc_mens_haircut')
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Men’s Haircut' })).toBeInTheDocument()
    const price = screen.getByRole('textbox', { name: /^Price/ })
    expect(price).toHaveValue('250')
    expect(screen.getByRole('switch', { name: 'Mark as popular' })).toBeChecked()

    await user.clear(price)
    await user.type(price, '280')
    await user.click(screen.getByRole('switch', { name: 'Show to customers' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Changes to Men’s Haircut saved.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
    expect((await publicServices()).map((service) => service.id)).not.toContain('svc_mens_haircut')
  })

  it('shows the server’s answer when the name is taken', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.type(await screen.findByRole('textbox', { name: /Service name/ }), 'Hot towel shave')
    await user.type(screen.getByRole('textbox', { name: /^Price/ }), '200')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You already have a service called “Hot Towel Shave”.')
  })

  it('says so when the service doesn’t exist', async () => {
    renderAt('/business/services/svc_nope')
    expect(await screen.findByText('We couldn’t find that service.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All services' })).toHaveAttribute('href', '/business/services')
  })

  describe('photo', () => {
    it('uploads a photo as soon as it is picked, without saving the form', async () => {
      const user = userEvent.setup()
      withoutPhoto('svc_hot_shave')
      renderAt('/business/services/svc_hot_shave')
      await user.upload(await screen.findByLabelText('Add photo'), png())
      await waitFor(async () =>
        expect(await publicPhoto('svc_hot_shave')).toEqual({ url: 'data:image/webp;base64,AA' }),
      )
      expect(await screen.findByLabelText('Replace photo')).toBeInTheDocument()
      expect(screen.queryByText('Changes to Hot Towel Shave saved.')).not.toBeInTheDocument()
    })

    it('shows why a file was refused and keeps the current photo', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderAt('/business/services/svc_mens_haircut')
      const before = await publicPhoto('svc_mens_haircut')
      await user.upload(await screen.findByLabelText('Replace photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('That file isn’t a photo. Use JPG, PNG or WebP.')
      expect(await publicPhoto('svc_mens_haircut')).toEqual(before)
    })

    it('shows a server-rejected upload once, not as an alert and a toast', async () => {
      const user = userEvent.setup()
      vi.spyOn(merchantServicesService, 'setServicePhoto').mockRejectedValueOnce(
        new ApiError('Photos can be up to 10 MB.', 422),
      )
      renderAt('/business/services/svc_mens_haircut')
      await user.upload(await screen.findByLabelText('Replace photo'), png())
      expect(await screen.findByRole('alert')).toHaveTextContent('Photos can be up to 10 MB.')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(screen.queryAllByText('Photos can be up to 10 MB.')).toHaveLength(1)
    })

    it('removes a photo after confirming', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderAt('/business/services/svc_mens_haircut')
      await user.upload(await screen.findByLabelText('Replace photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Remove photo' }))
      await user.click(screen.getByRole('button', { name: 'Remove' }))
      await waitFor(async () => expect(await publicPhoto('svc_mens_haircut')).toBeUndefined())
      expect(await screen.findByLabelText('Add photo')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('saving the form leaves the photo alone', async () => {
      const user = userEvent.setup()
      renderAt('/business/services/svc_mens_haircut')
      const before = await publicPhoto('svc_mens_haircut')
      await user.click(await screen.findByRole('button', { name: 'Save changes' }))
      expect(await screen.findByText('Changes to Men’s Haircut saved.')).toBeInTheDocument()
      expect(await publicPhoto('svc_mens_haircut')).toEqual(before)
    })

    it('adds a service with a photo in one trip', async () => {
      const user = userEvent.setup()
      const router = renderAt('/business/services/new')
      await fillNewService(user, 'Buzz Cut')
      await user.upload(screen.getByLabelText('Add photo'), png())
      expect(screen.getByRole('img', { name: 'Photo to upload' })).toHaveAttribute('src', 'blob:preview')
      expect(screen.getByLabelText('Replace photo')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Add service' }))
      expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
      const created = (await publicServices()).find((s) => s.name === 'Buzz Cut')!
      expect(created.photo).toEqual({ url: 'data:image/webp;base64,AA' })
    })

    it('lets the merchant drop a held photo before saving', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderAt('/business/services/new')
      await fillNewService(user, 'Buzz Cut')
      await user.upload(screen.getByLabelText('Add photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      await user.upload(screen.getByLabelText('Add photo'), png())
      await user.click(screen.getByRole('button', { name: 'Remove photo' }))
      expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Add service' }))
      expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
      expect((await publicServices()).find((s) => s.name === 'Buzz Cut')!.photo).toBeUndefined()
    })

    it('locks the held photo while the service is being saved', async () => {
      const user = userEvent.setup()
      const create = merchantServicesService.createService.bind(merchantServicesService)
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      vi.spyOn(merchantServicesService, 'createService').mockImplementationOnce(async (...args) => {
        await gate
        return create(...args)
      })
      renderAt('/business/services/new')
      await fillNewService(user, 'Buzz Cut')
      await user.upload(screen.getByLabelText('Add photo'), png())
      await user.click(screen.getByRole('button', { name: 'Add service' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Remove photo' })).toBeDisabled())
      expect(screen.getByLabelText('Replace photo')).toBeDisabled()
      release()
      expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
      expect((await publicServices()).find((s) => s.name === 'Buzz Cut')!.photo).toEqual({
        url: 'data:image/webp;base64,AA',
      })
    })

    it('refuses a non-photo on the Add page without holding it', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderAt('/business/services/new')
      await user.upload(await screen.findByLabelText('Add photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('That file isn’t a photo. Use JPG, PNG or WebP.')
      expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
    })

    it('keeps the new service and lands on its edit page when the photo upload fails', async () => {
      const user = userEvent.setup()
      vi.spyOn(merchantServicesService, 'setServicePhoto').mockRejectedValueOnce(
        new ApiError('Photos can be up to 10 MB.', 422),
      )
      const router = renderAt('/business/services/new')
      await fillNewService(user, 'Buzz Cut')
      await user.upload(screen.getByLabelText('Add photo'), png())
      await user.click(screen.getByRole('button', { name: 'Add service' }))
      expect(await screen.findByText('Buzz Cut is on your menu, but the photo didn’t upload.')).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/business\/services\/svc_/))
      expect(await screen.findByRole('alert')).toHaveTextContent('Photos can be up to 10 MB.')
      expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
      expect((await publicServices()).find((s) => s.name === 'Buzz Cut')!.photo).toBeUndefined()
    })
  })
})
