import { parseISO } from 'date-fns'
import { CalendarDaysIcon, MapPinIcon, MonitorIcon, SearchXIcon } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { DatePicker } from '@/components/shared/DatePicker'
import { FilterBar } from '@/components/shared/FilterBar'
import { SearchInput } from '@/components/shared/SearchInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { categoryLabels, mockEvents, type EventCategory, type EventFormat } from '@/features/example/mock-events'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatDate } from '@/lib/format'

type FormatFilter = 'any' | EventFormat
type SortOrder = 'date-asc' | 'date-desc' | 'seats-desc'

const categories = Object.keys(categoryLabels) as EventCategory[]

export function SearchFilterDemo() {
  const ids = { sort: useId(), from: useId() }
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([])
  const [format, setFormat] = useState<FormatFilter>('any')
  const [from, setFrom] = useState<Date | undefined>()
  const [sort, setSort] = useState<SortOrder>('date-asc')
  const debouncedQuery = useDebouncedValue(query)

  const results = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase()
    const filtered = mockEvents.filter(
      (event) =>
        (!needle || event.title.toLowerCase().includes(needle)) &&
        (selectedCategories.length === 0 || selectedCategories.includes(event.category)) &&
        (format === 'any' || event.format === format) &&
        (!from || parseISO(event.date) >= from),
    )
    return filtered.toSorted((a, b) => {
      if (sort === 'seats-desc') return b.seatsLeft - a.seatsLeft
      const diff = parseISO(a.date).getTime() - parseISO(b.date).getTime()
      return sort === 'date-asc' ? diff : -diff
    })
  }, [debouncedQuery, selectedCategories, format, from, sort])

  const activeCount =
    (query ? 1 : 0) + (selectedCategories.length ? 1 : 0) + (format !== 'any' ? 1 : 0) + (from ? 1 : 0)
  const reset = () => {
    setQuery('')
    setSelectedCategories([])
    setFormat('any')
    setFrom(undefined)
  }

  const toggleCategory = (category: EventCategory, checked: boolean) =>
    setSelectedCategories((current) => (checked ? [...current, category] : current.filter((c) => c !== category)))

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Search and filters</h3>
        </CardTitle>
        <CardDescription>
          Debounced search, checkbox and radio filters, a date filter and sorting over mock events.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend variant="label">Category</FieldLegend>
            <div className="space-y-3">
              {categories.map((category) => {
                const id = `category-${category}`
                return (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                    />
                    <Label htmlFor={id} className="font-normal">
                      {categoryLabels[category]}
                    </Label>
                  </div>
                )
              })}
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Format</FieldLegend>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as FormatFilter)}>
              {(['any', 'online', 'in-person'] as const).map((value) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem id={`format-${value}`} value={value} />
                  <Label htmlFor={`format-${value}`} className="font-normal capitalize">
                    {value === 'any' ? 'Any format' : value.replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FieldSet>
          <div className="space-y-2">
            <Label htmlFor={ids.from}>From date</Label>
            <DatePicker id={ids.from} value={from} onChange={setFrom} className="sm:w-full" />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <FilterBar
            label="Search events"
            activeCount={activeCount}
            onReset={reset}
            end={
              <>
                <Label htmlFor={ids.sort} className="font-normal text-muted-foreground">
                  Sort
                </Label>
                <Select value={sort} onValueChange={(value) => setSort(value as SortOrder)}>
                  <SelectTrigger id={ids.sort} size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="date-asc">Soonest first</SelectItem>
                    <SelectItem value="date-desc">Latest first</SelectItem>
                    <SelectItem value="seats-desc">Most seats left</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          >
            <SearchInput value={query} onValueChange={setQuery} placeholder="Search events…" label="Search events" />
          </FilterBar>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </p>

          {results.length === 0 ? (
            <EmptyState
              bordered
              icon={SearchXIcon}
              title="No events match"
              description="Try removing a filter or searching for something else."
              action={
                <Button variant="outline" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((event) => (
                <li key={event.id} className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant="secondary">{categoryLabels[event.category]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDaysIcon aria-hidden="true" className="size-4" />
                      <time dateTime={event.date}>{formatDate(parseISO(event.date))}</time>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {event.format === 'online' ? (
                        <MonitorIcon aria-hidden="true" className="size-4" />
                      ) : (
                        <MapPinIcon aria-hidden="true" className="size-4" />
                      )}
                      {event.format === 'online' ? 'Online' : 'In person'}
                    </span>
                  </div>
                  <p className="text-sm">
                    {event.seatsLeft === 0 ? (
                      <Badge variant="destructive">Sold out</Badge>
                    ) : (
                      <span>
                        <span className="font-medium tabular-nums">{event.seatsLeft}</span> seats left
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
