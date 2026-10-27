import { render, screen } from '@testing-library/react'
import { CalendarCheckIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppSidebar } from '@/components/layouts/AppSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { NavGroup } from '@/config/navigation'

function renderSidebar(count: number) {
  const nav: NavGroup[] = [{ items: [{ title: 'Bookings', to: '/business/bookings', icon: CalendarCheckIcon, count }] }]
  render(
    <MemoryRouter>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar nav={nav} label="Business dashboard" homeTo="/business" />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('AppSidebar', () => {
  it('shows a count badge for waiting requests', () => {
    renderSidebar(3)
    expect(screen.getByRole('link', { name: 'Bookings, 3 waiting' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows no badge when nothing is waiting', () => {
    renderSidebar(0)
    expect(screen.getByRole('link', { name: 'Bookings' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
