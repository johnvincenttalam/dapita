import { SlidersHorizontalIcon } from 'lucide-react'
import { useId } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { countRefinements, priceOptions } from '@/features/discovery/explore-params'
import { formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ShopSearchParams, ShopSort } from '@/services/shops.service'
import type { Area } from '@/types/catalog'

const ALL = 'all'

const sortLabels: Record<ShopSort, string> = {
  recommended: 'Recommended',
  price_low: 'Lowest price',
  name: 'Name (A–Z)',
}

interface FilterFieldsProps {
  params: ShopSearchParams
  areas: Area[]
  onChange: (changes: Partial<ShopSearchParams>) => void
  /** `inline`: one row above the results (desktop). `stacked`: labelled fields in the filter sheet (phones). */
  layout: 'inline' | 'stacked'
}

/** Area, price, open-now and sort. Open hours are filtered only because merchants maintain them (CUS-04). */
function FilterFields({ params, areas, onChange, layout }: FilterFieldsProps) {
  const id = useId()
  const stacked = layout === 'stacked'
  const labelClass = stacked ? undefined : 'sr-only'
  const fieldClass = stacked ? 'grid gap-2' : 'contents'
  const triggerClass = stacked ? 'w-full' : 'w-40'

  return (
    <div className={cn(stacked ? 'grid gap-5' : 'flex flex-wrap items-center gap-2')}>
      <div className={fieldClass}>
        <Label htmlFor={`${id}-area`} className={labelClass}>
          Area
        </Label>
        <Select
          value={params.area ?? ALL}
          onValueChange={(value) => onChange({ area: value === ALL ? undefined : value })}
        >
          <SelectTrigger id={`${id}-area`} className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.slug}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={fieldClass}>
        <Label htmlFor={`${id}-price`} className={labelClass}>
          Price
        </Label>
        <Select
          value={params.priceMax?.toString() ?? ALL}
          onValueChange={(value) => onChange({ priceMax: value === ALL ? undefined : Number(value) })}
        >
          <SelectTrigger id={`${id}-price`} className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any price</SelectItem>
            {priceOptions.map((amount) => (
              <SelectItem key={amount} value={String(amount)}>
                Services up to {formatPeso(amount)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn('flex items-center gap-2', stacked ? 'justify-between' : 'px-2')}>
        <Label htmlFor={`${id}-open`}>Open now</Label>
        <Switch
          id={`${id}-open`}
          checked={params.openNow ?? false}
          onCheckedChange={(checked) => onChange({ openNow: checked || undefined })}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor={`${id}-sort`} className={labelClass}>
          Sort by
        </Label>
        <Select value={params.sort ?? 'recommended'} onValueChange={(value) => onChange({ sort: value as ShopSort })}>
          <SelectTrigger id={`${id}-sort`} className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface ExploreFiltersProps extends Omit<FilterFieldsProps, 'layout'> {
  total?: number
  onReset: () => void
}

/** Inline filters from `md` up; a "Filters" button and bottom sheet on phones (design screen 4). */
export function ExploreFilters({ params, areas, onChange, total, onReset }: ExploreFiltersProps) {
  const active = countRefinements(params)

  return (
    <>
      <div className="hidden md:block">
        <FilterFields params={params} areas={areas} onChange={onChange} layout="inline" />
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" shape="pill" className="shrink-0 bg-card md:hidden">
            <SlidersHorizontalIcon aria-hidden="true" />
            Filters
            {active ? (
              <Badge className="ml-0.5 h-5 min-w-5 px-1.5">
                {active}
                <span className="sr-only"> active</span>
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85svh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow down shops in Davao City.</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4">
            <FilterFields params={params} areas={areas} onChange={onChange} layout="stacked" />
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={onReset} disabled={!active}>
              Reset
            </Button>
            <SheetClose asChild>
              <Button className="flex-1">
                {total === undefined ? 'Show results' : `Show ${total} ${total === 1 ? 'shop' : 'shops'}`}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
