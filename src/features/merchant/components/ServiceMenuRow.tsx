import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useDeleteServiceMutation,
  useMoveServiceMutation,
  useSaveServiceMutation,
} from '@/features/merchant/api/service-queries'
import { ApiError } from '@/lib/api-client'
import { formatDuration, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toServiceInput } from '@/schemas/service'
import type { Service } from '@/types/business'

interface ServiceMenuRowProps {
  service: Service
  businessId: string
  isFirst: boolean
  isLast: boolean
}

function Tag({ children, muted }: { children: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 type-micro',
        muted ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </span>
  )
}

/** One service on the merchant's menu: what customers see, plus edit, order, visibility and delete. */
export function ServiceMenuRow({ service, businessId, isFirst, isLast }: ServiceMenuRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const save = useSaveServiceMutation(businessId)
  const move = useMoveServiceMutation(businessId)
  const remove = useDeleteServiceMutation(businessId)

  const toggleVisible = async () => {
    const active = !service.active
    await save.mutateAsync({ serviceId: service.id, input: { ...toServiceInput(service), active } })
    toast.success(
      active ? `${service.name} is back on your menu.` : `${service.name} is hidden. Customers won’t see it.`,
    )
  }

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(service.id)
      toast.success(`${service.name} deleted.`)
    } catch (error) {
      // Booked services can't be deleted; retrying won't help, so close and let the error toast explain.
      if (error instanceof ApiError && error.status === 409) return
      throw error
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className={cn('type-subheading', !service.active && 'text-muted-foreground')}>{service.name}</h3>
          {service.featured ? <Tag>Popular</Tag> : null}
          {service.active ? null : <Tag muted>Hidden</Tag>}
        </div>
        <p className="text-sm tabular-nums">
          {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
        </p>
        {service.description ? <p className="truncate text-sm text-muted-foreground">{service.description}</p> : null}
      </div>

      <Button asChild variant="outline" shape="pill" size="sm">
        <Link to={`/business/services/${encodeURIComponent(service.id)}`} aria-label={`Edit ${service.name}`}>
          Edit
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${service.name}`}>
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem disabled={isFirst} onSelect={() => move.mutate({ serviceId: service.id, direction: 'up' })}>
            <ArrowUpIcon aria-hidden="true" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast}
            onSelect={() => move.mutate({ serviceId: service.id, direction: 'down' })}
          >
            <ArrowDownIcon aria-hidden="true" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void toggleVisible().catch(() => undefined)}>
            {service.active ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
            {service.active ? 'Hide from customers' : 'Show to customers'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon aria-hidden="true" />
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title={`Delete ${service.name}?`}
        description="It comes off your menu for good. If you might offer it again, hide it instead."
        confirmLabel="Delete service"
        cancelLabel="Keep service"
        onConfirm={confirmDelete}
      />
    </li>
  )
}
