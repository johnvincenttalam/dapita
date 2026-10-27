import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TimeSlotGrid } from '@/features/booking/components/BookingPickers'

describe('TimeSlotGrid', () => {
  it('disables some times and labels clashing ones', async () => {
    const onChange = vi.fn()
    render(
      <TimeSlotGrid
        times={['14:00', '14:30']}
        value={undefined}
        onChange={onChange}
        disabledTimes={['14:00']}
        flaggedTimes={['14:30']}
      />,
    )

    expect(screen.getByRole('radio', { name: '2:00 PM' })).toBeDisabled()
    const flagged = screen.getByRole('radio', { name: '2:30 PM, clashes with another booking' })
    expect(flagged).toBeEnabled()
    expect(screen.getByText('2:30 PM')).toBeInTheDocument()

    await userEvent.click(flagged)
    expect(onChange).toHaveBeenCalledWith('14:30')
  })
})
