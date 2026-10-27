import type { CellData, Column, RowData } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'

import type { DataTableFeatures } from '@/components/shared/data-table/features'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData extends RowData, TValue extends CellData> {
  column: Column<DataTableFeatures, TData, TValue>
  title: string
  className?: string
}

/** Header cell content with a sort toggle. Falls back to plain text when the column can't sort. */
export function DataTableColumnHeader<TData extends RowData, TValue extends CellData>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>

  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon
  const nextOrder = column.getNextSortingOrder()
  const nextLabel = nextOrder === 'asc' ? 'ascending' : nextOrder === 'desc' ? 'descending' : 'unsorted'

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-2.5 h-8 data-[state=sorted]:text-foreground', className)}
      data-state={sorted ? 'sorted' : undefined}
      onClick={column.getToggleSortingHandler()}
      aria-label={`${title}, sort ${nextLabel}`}
    >
      {title}
      <Icon aria-hidden="true" className={cn('size-3.5', !sorted && 'opacity-50')} />
    </Button>
  )
}
