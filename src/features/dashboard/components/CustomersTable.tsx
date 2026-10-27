import type { ColumnFiltersState, Row } from '@tanstack/react-table'

import type { DataTableFeatures } from '@/components/shared/data-table/features'
import { SearchXIcon, UsersIcon } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { DatePicker } from '@/components/shared/DatePicker'
import { FilterBar } from '@/components/shared/FilterBar'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCustomersQuery } from '@/features/dashboard/api/queries'
import { customerColumns, customerColumnVisibility } from '@/features/dashboard/components/customer-columns'
import { CustomerRowActions } from '@/features/dashboard/components/CustomerRowActions'
import { CustomerStatusBadge } from '@/features/dashboard/components/CustomerStatusBadge'
import { planLabels, planOptions, statusOptions } from '@/features/dashboard/constants'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatDate } from '@/lib/format'
import { useUiStore } from '@/stores/ui-store'
import type { Customer } from '@/types/domain'

const ALL = 'all'
// Stable fallback: a fresh `[]` each render would make TanStack Table recompute every row model.
const noCustomers: Customer[] = []

function CustomerMobileCard({ row }: { row: Row<DataTableFeatures, Customer> }) {
  const customer = row.original
  return (
    <article className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{customer.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <CustomerRowActions customer={customer} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-0.5">
            <CustomerStatusBadge status={customer.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Plan</dt>
          <dd className="mt-0.5">{planLabels[customer.plan]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Company</dt>
          <dd className="mt-0.5 truncate">{customer.company}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Joined</dt>
          <dd className="mt-0.5">{formatDate(customer.createdAt)}</dd>
        </div>
      </dl>
    </article>
  )
}

export function CustomersTable() {
  const { data, isPending, isError, error, refetch, isRefetching } = useCustomersQuery()
  const density = useUiStore((state) => state.tableDensity)
  const setDensity = useUiStore((state) => state.setTableDensity)
  const ids = { status: useId(), plan: useId(), joined: useId(), density: useId() }

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [plan, setPlan] = useState<string>(ALL)
  const [joinedAfter, setJoinedAfter] = useState<Date | undefined>()
  const debouncedSearch = useDebouncedValue(search)

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = []
    if (status !== ALL) filters.push({ id: 'status', value: status })
    if (plan !== ALL) filters.push({ id: 'plan', value: plan })
    if (joinedAfter) filters.push({ id: 'createdAt', value: joinedAfter })
    return filters
  }, [status, plan, joinedAfter])

  const activeCount = columnFilters.length + (search ? 1 : 0)
  const resetFilters = () => {
    setSearch('')
    setStatus(ALL)
    setPlan(ALL)
    setJoinedAfter(undefined)
  }

  const hasNoData = !isPending && !isError && data.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Customers</h2>
        </CardTitle>
        <CardDescription>Search, filter, sort and paginate. Mock data generated in the browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <ErrorState
            title="Customers unavailable"
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
          />
        ) : hasNoData ? (
          <EmptyState
            bordered
            icon={UsersIcon}
            title="No customers yet"
            description="When customers sign up they will be listed here."
          />
        ) : (
          <>
            <FilterBar
              label="Filter customers"
              activeCount={activeCount}
              onReset={resetFilters}
              end={
                <div className="flex items-center gap-2">
                  <Switch
                    id={ids.density}
                    checked={density === 'compact'}
                    onCheckedChange={(checked) => setDensity(checked ? 'compact' : 'comfortable')}
                  />
                  <Label htmlFor={ids.density}>Compact rows</Label>
                </div>
              }
            >
              <SearchInput
                value={search}
                onValueChange={setSearch}
                placeholder="Search name, email, company…"
                label="Search customers"
              />
              <Label htmlFor={ids.status} className="sr-only">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id={ids.status} className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor={ids.plan} className="sr-only">
                Plan
              </Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id={ids.plan} className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All plans</SelectItem>
                  {planOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor={ids.joined} className="sr-only">
                Joined on or after
              </Label>
              <DatePicker
                id={ids.joined}
                value={joinedAfter}
                onChange={setJoinedAfter}
                placeholder="Joined after…"
                formatValue={(date) => `Joined after ${formatDate(date)}`}
                disabled={{ after: new Date() }}
              />
            </FilterBar>

            <DataTable
              caption="Customers"
              columns={customerColumns}
              initialColumnVisibility={customerColumnVisibility}
              data={data ?? noCustomers}
              getRowId={(row) => row.id}
              isLoading={isPending}
              globalFilter={debouncedSearch}
              columnFilters={columnFilters}
              initialSorting={[{ id: 'createdAt', desc: true }]}
              density={density}
              renderMobileItem={(row) => <CustomerMobileCard row={row} />}
              emptyState={
                <EmptyState
                  icon={SearchXIcon}
                  title="No matching customers"
                  description="Try a different search or clear the filters."
                  action={
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  }
                />
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
