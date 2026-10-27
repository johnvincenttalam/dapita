import { constructFilterFn } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@/components/shared/data-table/DataTableColumnHeader'
import { createDataTableColumnHelper } from '@/components/shared/data-table/features'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CustomerRowActions } from '@/features/dashboard/components/CustomerRowActions'
import { CustomerStatusBadge } from '@/features/dashboard/components/CustomerStatusBadge'
import { planLabels } from '@/features/dashboard/constants'
import { formatDate, initials } from '@/lib/format'
import type { Customer } from '@/types/domain'

const column = createDataTableColumnHelper<Customer>()

/** Keeps rows whose ISO date is on or after the filter Date. */
const onOrAfter = constructFilterFn({
  filter: (dataValue: string, filterValue: Date) => new Date(dataValue) >= filterValue,
  autoRemove: (filterValue) => !(filterValue instanceof Date),
})

// Module scope keeps the array referentially stable, which TanStack Table requires.
export const customerColumns = column.columns([
  column.accessor('name', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <div className="flex min-w-48 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  }),
  // Hidden column so the global search also matches email addresses.
  column.accessor('email', { header: 'Email', enableHiding: true }),
  column.accessor('company', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
  }),
  column.accessor('plan', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
    cell: ({ getValue }) => planLabels[getValue()],
    filterFn: 'equalsString',
  }),
  column.accessor('status', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ getValue }) => <CustomerStatusBadge status={getValue()} />,
    filterFn: 'equalsString',
  }),
  column.accessor('seats', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Seats" />,
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
    enableGlobalFilter: false,
  }),
  column.accessor('createdAt', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ getValue }) => <time dateTime={getValue()}>{formatDate(getValue())}</time>,
    filterFn: onOrAfter,
    // ISO 8601 strings sort chronologically with a plain comparison.
    sortFn: 'basic',
    enableGlobalFilter: false,
  }),
  column.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <CustomerRowActions customer={row.original} />
      </div>
    ),
  }),
])

/** Columns hidden by default; they still take part in filtering. */
export const customerColumnVisibility = { email: false }
