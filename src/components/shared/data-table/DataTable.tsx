import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { useState, type ReactNode } from 'react'

import { DataTablePagination } from '@/components/shared/data-table/DataTablePagination'
import { dataTableFeatures, type DataTableFeatures } from '@/components/shared/data-table/features'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const noop = () => {}
// Defaults must be referentially stable: a fresh `[]` per render looks like a filter
// change to TanStack Table, which then resets pagination to the first page.
const NO_FILTERS: ColumnFiltersState = []
const NO_SORTING: SortingState = []

export interface DataTableProps<TData extends RowData> {
  /** Build with `createDataTableColumnHelper<T>().columns([...])` and keep the array stable (module scope or useMemo). */
  columns: ColumnDef<DataTableFeatures, TData, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any -- TanStack's own column-array type
  /** Keep stable: a new array on every render recomputes every row model. */
  data: TData[]
  /** Describes the table for screen readers. Rendered visually hidden. */
  caption: string
  getRowId?: (row: TData) => string
  /** Free-text search applied across all filterable columns. Owned by the parent (e.g. a FilterBar). */
  globalFilter?: string
  /** Per-column filters. Owned by the parent. */
  columnFilters?: ColumnFiltersState
  initialSorting?: SortingState
  /** e.g. `{ email: false }` to keep a column searchable but not rendered. */
  initialColumnVisibility?: Record<string, boolean>
  pageSize?: number
  pageSizeOptions?: number[]
  isLoading?: boolean
  /** Shown in place of rows when there is nothing to display. */
  emptyState?: ReactNode
  density?: 'comfortable' | 'compact'
  /** When provided, small screens get a stacked list using this renderer instead of the table. */
  renderMobileItem?: (row: Row<DataTableFeatures, TData>) => ReactNode
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  caption,
  getRowId,
  globalFilter = '',
  columnFilters = NO_FILTERS,
  initialSorting = NO_SORTING,
  initialColumnVisibility,
  pageSize = 10,
  pageSizeOptions,
  isLoading,
  emptyState = 'No results.',
  density = 'comfortable',
  renderMobileItem,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageIndex: 0, pageSize }, columnVisibility: initialColumnVisibility },
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    // Filters are owned by the parent's FilterBar; the table never writes them.
    onGlobalFilterChange: noop,
    onColumnFiltersChange: noop,
  })

  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()
  const cellPadding = density === 'compact' ? 'py-1.5' : 'py-3'
  const showEmpty = !isLoading && rows.length === 0

  return (
    <div className="space-y-4">
      <div className={cn('rounded-lg border', renderMobileItem && 'hidden md:block')}>
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const ariaSort =
                    sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                        ? 'descending'
                        : header.column.getCanSort()
                          ? 'none'
                          : undefined
                  return (
                    <TableHead key={header.id} aria-sort={ariaSort}>
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} aria-hidden="true">
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className={cellPadding}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cellPadding}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            {showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumns.length} className="h-32 text-center whitespace-normal">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {renderMobileItem ? (
        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : showEmpty ? (
            <div className="rounded-lg border p-4 text-center">{emptyState}</div>
          ) : (
            <ul aria-label={caption} className="space-y-2">
              {rows.map((row) => (
                <li key={row.id}>{renderMobileItem(row)}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!isLoading && table.getFilteredRowModel().rows.length > 0 ? (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      ) : null}
    </div>
  )
}
