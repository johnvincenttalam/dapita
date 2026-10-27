import { ArrowDownIcon, ArrowUpIcon, PencilIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/feedback/ErrorState'
import { ChoiceGroup } from '@/components/shared/ChoiceGroup'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  useAdminCategoriesQuery,
  useCategoryMutation,
  useMerchantsQuery,
  useSetFeaturedMutation,
} from '@/features/admin/api/queries'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import type { AdminCategory } from '@/types/admin'
import type { CategoryStatus } from '@/types/catalog'

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'coming_soon', label: 'Coming soon' },
  { value: 'hidden', label: 'Hidden' },
] as const

const statusLabel = Object.fromEntries(statusOptions.map((option) => [option.value, option.label])) as Record<
  CategoryStatus,
  string
>

const usage = (category: AdminCategory) =>
  category.parentId
    ? `${category.serviceCount} ${category.serviceCount === 1 ? 'service' : 'services'}`
    : `${category.shopCount} ${category.shopCount === 1 ? 'shop' : 'shops'}`

function EditCategoryDialog({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const nameId = useId()
  const [name, setName] = useState(category?.name ?? '')
  const [status, setStatus] = useState<CategoryStatus>(category?.status ?? 'active')
  const [error, setError] = useState<string>()
  const save = useCategoryMutation()
  if (!category) return null
  const inUse = category.parentId ? category.serviceCount : category.shopCount

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await save.mutateAsync({ kind: 'update', id: category.id, input: { name, status } })
      toast.success(`${name.trim()} saved.`)
      onClose()
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit {category.name}</DialogTitle>
            <DialogDescription>
              The link (/{category.slug}) stays the same, so shared links keep working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor={nameId} className="type-label">
              Name
            </label>
            <Input id={nameId} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
          </div>
          <ChoiceGroup
            legend="Status"
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value as CategoryStatus)}
            className="flex flex-wrap gap-2"
            optionClassName="h-9 rounded-full px-4"
            renderOption={(option) => option.label}
          />
          {status === 'hidden' && inUse > 0 ? (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm">
              {inUse}{' '}
              {category.parentId
                ? inUse === 1
                  ? 'service uses it'
                  : 'services use it'
                : inUse === 1
                  ? 'shop uses it'
                  : 'shops use it'}
              . Hidden categories leave browsing and search filters; the {category.parentId ? 'services' : 'shops'} stay
              listed.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" shape="pill" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" shape="pill" loading={save.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoryRow({
  category,
  first,
  last,
  onEdit,
}: {
  category: AdminCategory
  first: boolean
  last: boolean
  onEdit: () => void
}) {
  const move = useCategoryMutation()
  return (
    <div className="flex items-center gap-2 py-2.5">
      <span className="min-w-0 flex-1">
        <span className={category.parentId ? 'text-sm' : 'font-semibold'}>{category.name}</span>
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">{usage(category)}</span>
      </span>
      {category.status === 'active' ? null : (
        <Badge variant="outline" className="rounded-full">
          {statusLabel[category.status]}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${category.name} up`}
        disabled={first || move.isPending}
        onClick={() => move.mutate({ kind: 'move', id: category.id, direction: 'up' })}
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${category.name} down`}
        disabled={last || move.isPending}
        onClick={() => move.mutate({ kind: 'move', id: category.id, direction: 'down' })}
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${category.name}`} onClick={onEdit}>
        <PencilIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

function AddSubcategory({ parent }: { parent: AdminCategory }) {
  const id = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const add = useCategoryMutation()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(undefined)
    try {
      await add.mutateAsync({ kind: 'add', parentId: parent.id, name })
      setName('')
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-1 pt-2">
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          New subcategory in {parent.name}
        </label>
        <Input
          id={id}
          value={name}
          maxLength={40}
          placeholder={`New subcategory in ${parent.name}`}
          onChange={(event) => setName(event.target.value)}
          className="h-9"
        />
        <Button type="submit" variant="outline" shape="pill" size="sm" disabled={!name.trim()} loading={add.isPending}>
          Add
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}

function FeaturedShops() {
  const merchants = useMerchantsQuery()
  const feature = useSetFeaturedMutation()
  const live = merchants.data?.filter((item) => item.status === 'approved').sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Panel title="Featured shops" description="Shown first on the home page. Only live listings can be featured.">
      {!live ? (
        <Skeleton aria-hidden="true" className="h-40 rounded-2xl" />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {live.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[item.categoryNames.join(', '), item.areaName].filter(Boolean).join(' · ')}
                </span>
              </span>
              <Switch
                checked={item.featured}
                aria-label={`Feature ${item.name}`}
                disabled={feature.isPending}
                onCheckedChange={(featured) => feature.mutate({ id: item.id, featured })}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Categories (ADM-02): the service taxonomy customers browse, and featured placement. */
export default function AdminCategoriesPage() {
  useDocumentTitle('Categories')
  const categories = useAdminCategoriesQuery()
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const top = categories.data?.filter((category) => !category.parentId) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="The categories customers browse by, and the shops featured on the home page."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        {categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : !categories.data ? (
          <Skeleton aria-hidden="true" className="h-[32rem] rounded-3xl" />
        ) : (
          <Panel
            title="Service categories"
            description="Hide a category instead of deleting it, so nothing filed under it breaks."
          >
            <div className="-mx-2 divide-y divide-border/70">
              {top.map((parent, index) => {
                const subs = categories.data.filter((category) => category.parentId === parent.id)
                const headingId = `category-${parent.id}`
                return (
                  <div key={parent.id} role="group" aria-labelledby={headingId} className="px-2 py-2">
                    <span id={headingId} className="sr-only">
                      {parent.name}
                    </span>
                    <CategoryRow
                      category={parent}
                      first={index === 0}
                      last={index === top.length - 1}
                      onEdit={() => setEditing(parent)}
                    />
                    <div className="border-l border-border/70 pl-4">
                      {subs.map((sub, subIndex) => (
                        <CategoryRow
                          key={sub.id}
                          category={sub}
                          first={subIndex === 0}
                          last={subIndex === subs.length - 1}
                          onEdit={() => setEditing(sub)}
                        />
                      ))}
                      <AddSubcategory parent={parent} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
        <FeaturedShops />
      </div>
      <EditCategoryDialog key={editing?.id ?? 'none'} category={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
