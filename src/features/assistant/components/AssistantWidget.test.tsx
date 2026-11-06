import { screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AssistantWidget } from '@/features/assistant/components/AssistantWidget'
import type { AssistantEngine } from '@/features/assistant/engine'
import { useAssistantStore } from '@/features/assistant/store'
import { bookingHref } from '@/features/shops/links'
import { renderWithProviders } from '@/test/render'
import type { AssistantReply } from '@/types/assistant'
import type { Service, ShopSummary } from '@/types/business'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const shop = (slug: string, name: string): ShopSummary => ({
  id: `biz_${slug}`,
  slug,
  name,
  categoryIds: [],
  area: { id: 'area_matina', slug: 'matina', name: 'Matina' },
  address: 'Davao City',
  verified: true,
  featured: false,
  bookingMethod: 'instant',
  hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  closures: [],
  serviceCount: 1,
})

const haircut = { id: 'svc_cut', name: 'Haircut' } as Service

const greeting: AssistantReply = {
  text: 'Hi, I can help you find a shop.',
  shops: [],
  suggestions: ['Salons open now'],
}

function fakeEngine(answer: AssistantReply): AssistantEngine {
  return { greeting: () => greeting, reply: vi.fn(() => Promise.resolve(answer)) }
}

function renderWidget(engine: AssistantEngine, path = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <AssistantWidget engine={engine} /> },
      { path: '/shops/:shopSlug/book', element: <AssistantWidget engine={engine} /> },
    ],
    { initialEntries: [path] },
  )
  return renderWithProviders(<RouterProvider router={router} />)
}

beforeEach(() => {
  sessionStorage.clear()
  useAssistantStore.setState({ open: false, messages: [], busy: false })
})

describe('AssistantWidget', () => {
  it('opens from the bubble and shows the greeting', async () => {
    const { user } = renderWidget(fakeEngine({ text: 'x', shops: [], suggestions: [] }))
    await user.click(screen.getByRole('button', { name: 'Open Dapita Assistant' }))
    expect(await screen.findByText(greeting.text)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Dapita Assistant' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Dapita Assistant' })).not.toBeInTheDocument()
  })

  it('sends a typed message and shows the reply with a shop card, a booking link, and an explore link', async () => {
    const engine = fakeEngine({
      text: 'Found two in Matina.',
      shops: [{ shop: shop('glow', 'Glow Salon'), service: haircut }, { shop: shop('plain', 'Plain Salon') }],
      exploreHref: '/explore?area=matina',
      suggestions: ['Open now'],
    })
    const { user } = renderWidget(engine)
    await user.click(screen.getByRole('button', { name: 'Open Dapita Assistant' }))
    await screen.findByText(greeting.text)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'salons in Matina')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(engine.reply).toHaveBeenCalledWith('salons in Matina')
    expect(screen.getByText('salons in Matina')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('')
    expect(await screen.findByText('Found two in Matina.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Glow Salon' })).toHaveAttribute('href', '/shops/glow')
    expect(screen.getByRole('link', { name: 'Plain Salon' })).toBeInTheDocument()

    const book = screen.getAllByRole('link', { name: 'Send booking request' })
    expect(book).toHaveLength(1)
    expect(book[0]).toHaveAttribute('href', bookingHref('glow', 'svc_cut'))
    expect(screen.getByRole('link', { name: /see these on explore/i })).toHaveAttribute('href', '/explore?area=matina')
    expect(screen.getByRole('button', { name: 'Open now' })).toBeInTheDocument()
  })

  it('sends a suggestion chip as if typed', async () => {
    const engine = fakeEngine({ text: 'Done.', shops: [], suggestions: [] })
    const { user } = renderWidget(engine)
    await user.click(screen.getByRole('button', { name: 'Open Dapita Assistant' }))
    await user.click(await screen.findByRole('button', { name: 'Salons open now' }))
    expect(engine.reply).toHaveBeenCalledWith('Salons open now')
  })

  it('disables the input and chips while a reply is pending', async () => {
    let resolve!: (r: AssistantReply) => void
    const engine: AssistantEngine = {
      greeting: () => greeting,
      reply: vi.fn(() => new Promise<AssistantReply>((r) => (resolve = r))),
    }
    const { user } = renderWidget(engine)
    await user.click(screen.getByRole('button', { name: 'Open Dapita Assistant' }))
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'hello{Enter}')

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salons open now' })).toBeDisabled()

    resolve({ text: 'ok', shops: [], suggestions: [] })
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled())
  })

  it('is absent on the booking page', () => {
    renderWidget(fakeEngine({ text: 'x', shops: [], suggestions: [] }), '/shops/x/book')
    expect(screen.queryByRole('button', { name: 'Open Dapita Assistant' })).not.toBeInTheDocument()
  })
})
