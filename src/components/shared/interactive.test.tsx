import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'

function ControlledSearch() {
  const [value, setValue] = useState('')
  return <SearchInput value={value} onValueChange={setValue} label="Search people" />
}

describe('SearchInput', () => {
  it('clears with the clear button and returns focus to the input', async () => {
    render(<ControlledSearch />)
    const input = screen.getByRole('searchbox', { name: 'Search people' })

    await userEvent.type(input, 'ava')
    expect(input).toHaveValue('ava')

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('clears on Escape', async () => {
    render(<ControlledSearch />)
    const input = screen.getByRole('searchbox', { name: 'Search people' })
    await userEvent.type(input, 'noah{Escape}')
    expect(input).toHaveValue('')
  })
})

describe('ConfirmDialog', () => {
  it('waits for an async onConfirm before closing', async () => {
    let resolve: () => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)))

    render(
      <ConfirmDialog
        trigger={<Button>Delete</Button>}
        title="Delete item?"
        description="This cannot be undone."
        confirmLabel="Yes, delete"
        destructive
        onConfirm={onConfirm}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete item?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')

    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toHaveAttribute('aria-busy', 'true')

    resolve()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('closes without confirming on Cancel', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        trigger={<Button>Delete</Button>}
        title="Delete item?"
        description="Sure?"
        onConfirm={onConfirm}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
