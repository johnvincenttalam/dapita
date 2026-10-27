import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DataTable } from '@/components/shared/data-table/DataTable'
import { DataTableColumnHeader } from '@/components/shared/data-table/DataTableColumnHeader'
import { createDataTableColumnHelper } from '@/components/shared/data-table/features'

interface Person {
  id: string
  name: string
  role: string
}

const people: Person[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `Person ${String(index + 1).padStart(2, '0')}`,
  role: index % 2 === 0 ? 'admin' : 'member',
}))

const column = createDataTableColumnHelper<Person>()
const columns = column.columns([
  column.accessor('name', { header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> }),
  column.accessor('role', { header: 'Role', filterFn: 'equalsString' }),
])

function bodyRowNames() {
  const [, body] = screen.getAllByRole('rowgroup')
  return within(body!)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent)
}

describe('DataTable', () => {
  it('paginates rows', async () => {
    render(<DataTable caption="People" columns={columns} data={people} getRowId={(p) => p.id} pageSize={5} />)
    expect(bodyRowNames()).toHaveLength(5)
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()
    expect(bodyRowNames()[0]).toBe('Person 06')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('sorts when a sortable header is clicked and exposes aria-sort', async () => {
    render(<DataTable caption="People" columns={columns} data={people} pageSize={20} />)
    const header = screen.getByRole('columnheader', { name: /name/i })
    expect(header).toHaveAttribute('aria-sort', 'none')

    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(bodyRowNames()[0]).toBe('Person 01')

    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(bodyRowNames()[0]).toBe('Person 12')
  })

  it('applies global and column filters passed by the parent', () => {
    const { rerender } = render(<DataTable caption="People" columns={columns} data={people} globalFilter="person 1" />)
    expect(bodyRowNames()).toEqual(['Person 10', 'Person 11', 'Person 12'])

    rerender(
      <DataTable
        caption="People"
        columns={columns}
        data={people}
        globalFilter="person 1"
        columnFilters={[{ id: 'role', value: 'member' }]}
      />,
    )
    expect(bodyRowNames()).toEqual(['Person 10', 'Person 12'])
  })

  it('renders the empty state when nothing matches', () => {
    render(
      <DataTable caption="People" columns={columns} data={people} globalFilter="nobody" emptyState="No people found" />,
    )
    expect(screen.getByText('No people found')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })
})
