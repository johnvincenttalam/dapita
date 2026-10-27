import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarOffIcon, XIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { EmptyState } from '@/components/feedback/EmptyState'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useBusinessBookingsQuery } from '@/features/booking/api/merchant-queries'
import { useAddClosureMutation, useDeleteClosureMutation } from '@/features/merchant/api/business-queries'
import { getErrorMessage } from '@/lib/api-client'
import { toDateKey, zonedDateTime } from '@/lib/datetime'
import { formatDay } from '@/lib/format'
import { closureSchema, type ClosureInput } from '@/schemas/business'
import type { Business, ClosurePeriod } from '@/types/business'
import type { BookingDetails } from '@/types/booking'
import type { DateKey } from '@/types/common'

const dayLabel = (date: DateKey) => formatDay(zonedDateTime(date, '12:00'))

/** "Thu, Dec 24" or "Thu, Dec 24 – Sat, Dec 26". */
function formatClosureDates({ startDate, endDate }: Pick<ClosurePeriod, 'startDate' | 'endDate'>) {
  return startDate === endDate ? dayLabel(startDate) : `${dayLabel(startDate)} – ${dayLabel(endDate)}`
}

/** Open requests and confirmed appointments on those days: closing doesn't cancel them. */
function bookingsDuring(bookings: BookingDetails[], startDate: DateKey, endDate: DateKey) {
  return bookings.filter((booking) => {
    if (!['pending', 'alternative_proposed', 'confirmed'].includes(booking.status)) return false
    const day = toDateKey(new Date(booking.proposal?.start ?? booking.start))
    return day >= startDate && day <= endDate
  }).length
}

const emptyClosure: ClosureInput = { startDate: '', endDate: '', reason: '' }

function AddClosureForm({ business }: { business: Business }) {
  const add = useAddClosureMutation(business.id)
  const bookings = useBusinessBookingsQuery(business.id)
  const today = toDateKey(new Date())
  const form = useForm<ClosureInput>({ resolver: zodResolver(closureSchema), defaultValues: emptyClosure })
  const [startDate, endDate] = useWatch({ control: form.control, name: ['startDate', 'endDate'] })
  const affected =
    startDate && endDate && endDate >= startDate ? bookingsDuring(bookings.data ?? [], startDate, endDate) : 0

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync(values)
      form.reset(emptyClosure)
      toast.success(`Closed ${formatClosureDates(values)}. Customers can’t request those days.`)
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <Panel
      title="Add a closure"
      description="Holidays, training days or repairs. Customers can’t request times on these days."
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
        <FormError message={form.formState.errors.root?.message} title="We couldn’t add the closure" />
        <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                label="First day"
                required
                render={({ field, controlProps }) => (
                  <Input
                    type="date"
                    min={today}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      // A one-day closure is the common case: fill the last day to match.
                      if (!form.getValues('endDate')) form.setValue('endDate', event.target.value)
                    }}
                    {...controlProps}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                label="Last day"
                required
                render={({ field, controlProps }) => (
                  <Input type="date" min={startDate || today} {...field} {...controlProps} />
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              label="Reason"
              description="Optional. Customers see it next to your hours, e.g. “Christmas break”."
              render={({ field, controlProps }) => <Input maxLength={120} {...field} {...controlProps} />}
            />
          </FieldGroup>
        </fieldset>
        {affected > 0 ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm" role="status">
            {affected === 1
              ? '1 booking or request falls on these dates.'
              : `${affected} bookings and requests fall on these dates.`}{' '}
            Closing doesn’t cancel them, so let those customers know.{' '}
            <Link to="/business/bookings?tab=upcoming" className="font-medium underline underline-offset-4">
              See bookings
            </Link>
          </p>
        ) : null}
        <div className="flex sm:justify-end">
          <Button type="submit" shape="pill" loading={form.formState.isSubmitting} className="w-full sm:w-auto">
            Add closure
          </Button>
        </div>
      </form>
    </Panel>
  )
}

/** One-off closures (MER-03). Past closures drop off the list; they no longer affect anyone. */
export function ClosuresPanel({ business }: { business: Business }) {
  const remove = useDeleteClosureMutation(business.id)
  const today = toDateKey(new Date())
  const upcoming = business.closures.filter((closure) => closure.endDate >= today)

  return (
    <div className="space-y-6">
      <Panel title="Upcoming closures">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarOffIcon}
            title="No closures planned"
            description="You’re open on your usual hours."
            className="py-6"
          />
        ) : (
          <ul className="-mx-2 divide-y divide-border/70">
            {upcoming.map((closure) => (
              <li key={closure.id} className="flex items-center justify-between gap-3 px-2 py-3">
                <span className="min-w-0">
                  <span className="block font-medium tabular-nums">{formatClosureDates(closure)}</span>
                  {closure.reason ? (
                    <span className="block truncate text-sm text-muted-foreground">{closure.reason}</span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  shape="pill"
                  size="sm"
                  aria-label={`Remove closure ${closure.reason ?? formatClosureDates(closure)}`}
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(closure.id, {
                      onSuccess: () => toast.success(`Open again on ${formatClosureDates(closure)}.`),
                    })
                  }
                >
                  <XIcon aria-hidden="true" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <AddClosureForm business={business} />
    </div>
  )
}
