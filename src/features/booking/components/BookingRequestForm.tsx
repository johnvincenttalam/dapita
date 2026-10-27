import { zodResolver } from '@hookform/resolvers/zod'
import { SendIcon } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import type { z } from 'zod'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { MockNotice } from '@/components/shared/MockNotice'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { bookingRules } from '@/config/booking'
import { categoryIconFor } from '@/config/category-icons'
import { useCreateBookingMutation } from '@/features/booking/api/queries'
import {
  ANY_STAFF,
  DayStrip,
  StaffPicker,
  TimeSlotGrid,
  type DayOption,
} from '@/features/booking/components/BookingPickers'
import { AppointmentFacts, PriceBreakdown } from '@/features/booking/components/BookingSummary'
import { bookingSubmittedHref } from '@/features/booking/links'
import { BookingMethodNote } from '@/features/shops/components/ShopPolicies'
import { bookingHref, shopHref } from '@/features/shops/links'
import { useNow } from '@/hooks/use-now'
import { getErrorMessage } from '@/lib/api-client'
import { addDays, toDateKey, zonedDateTime } from '@/lib/datetime'
import { formatDay, formatDuration, formatPrice } from '@/lib/format'
import { createIdempotencyKey } from '@/lib/ids'
import { preferredStartTimes } from '@/lib/opening-hours'
import { bookingRequestSchema } from '@/schemas/booking'
import type { Service, ShopDetails, StaffMember } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'
import type { TimeOfDay } from '@/types/common'

type FormInput = z.input<typeof bookingRequestSchema>
type FormOutput = z.output<typeof bookingRequestSchema>

interface BookingRequestFormProps {
  shop: ShopDetails
  service: Service
  staff: StaffMember[]
  category?: ServiceCategory
}

/**
 * Design screen 6 in request mode (plan C1/C2): times come from opening hours
 * and are preferences the shop confirms, so the action sends a request and the
 * next screen says "pending", never "confirmed".
 */
export function BookingRequestForm({ shop, service, staff, category }: BookingRequestFormProps) {
  const navigate = useNavigate()
  const now = useNow()
  const hintId = useId()
  const createBooking = useCreateBookingMutation()
  // One key per visit to this form, so a double submit or retry can't create two requests.
  const [idempotencyKey] = useState(createIdempotencyKey)

  const providers = staff.filter((member) => member.serviceIds.includes(service.id))

  const { days, timesByDate } = useMemo(() => {
    const today = toDateKey(now)
    const map = new Map<string, TimeOfDay[]>()
    const list: DayOption[] = []
    for (let offset = 0; offset < bookingRules.bookingWindowDays; offset++) {
      const key = addDays(today, offset)
      const times = preferredStartTimes(shop.hours, shop.closures, key, service.durationMinutes, now).map((t) => t.time)
      map.set(key, times)
      const label = formatDay(zonedDateTime(key, '12:00'))
      list.push({
        value: key,
        label: offset === 0 ? `Today, ${label}` : label,
        disabled: times.length === 0,
        isToday: offset === 0,
      })
    }
    return { days: list, timesByDate: map }
  }, [now, shop.hours, shop.closures, service.durationMinutes])

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(bookingRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      serviceId: service.id,
      staffId: null,
      date: days.find((day) => !day.disabled)?.value ?? '',
      time: '',
      phone: '',
      notes: '',
      policyAccepted: false,
    },
  })
  const [date, time, staffId] = useWatch({ control: form.control, name: ['date', 'time', 'staffId'] })
  const times = timesByDate.get(date) ?? []
  const start = date && time ? zonedDateTime(date, time).toISOString() : undefined
  const staffName = providers.find((member) => member.id === staffId)?.displayName
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    // Times move on while the form is open; re-check before sending.
    if (!timesByDate.get(values.date)?.includes(values.time)) {
      form.setError('time', { message: 'That time is no longer available. Choose another.' })
      return
    }
    try {
      const booking = await createBooking.mutateAsync({
        serviceId: values.serviceId,
        staffId: values.staffId,
        start: zonedDateTime(values.date, values.time).toISOString(),
        phone: values.phone || undefined,
        notes: values.notes || undefined,
        idempotencyKey,
      })
      await navigate(bookingSubmittedHref(booking.id))
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10"
    >
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-8">
        <legend className="sr-only">Appointment details</legend>

        <div className="flex items-center gap-4 rounded-2xl card-surface p-3">
          <ImageWithFallback
            src={service.photoUrl}
            alt=""
            icon={categoryIconFor(category)}
            className="size-16 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{service.name}</h2>
            <p className="text-sm text-muted-foreground">
              {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{shop.name}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={bookingHref(shop.slug)} replace>
              Change<span className="sr-only"> service</span>
            </Link>
          </Button>
        </div>

        {providers.length ? (
          <StaffPicker
            staff={providers}
            value={staffId ?? ANY_STAFF}
            onChange={(value) => form.setValue('staffId', value === ANY_STAFF ? null : value)}
          />
        ) : null}

        <DayStrip
          days={days}
          value={date}
          onChange={(value) => {
            form.setValue('date', value, { shouldValidate: form.formState.isSubmitted })
            form.setValue('time', '')
          }}
          error={errors.date?.message}
        />

        {date && times.length === 0 ? (
          <p className="rounded-xl bg-muted/70 p-4 text-sm">No times left on this day. Choose another date.</p>
        ) : days.every((day) => day.disabled) ? (
          <p className="rounded-xl bg-muted/70 p-4 text-sm">
            This shop has no opening hours in the next {bookingRules.bookingWindowDays} days.
          </p>
        ) : (
          <TimeSlotGrid
            times={times}
            value={time}
            onChange={(value) => form.setValue('time', value, { shouldValidate: true })}
            error={errors.time?.message}
            hintId={hintId}
            hint={
              shop.bookingMethod === 'request'
                ? 'Preferred times based on opening hours. The shop confirms whether it’s free.'
                : undefined
            }
          />
        )}

        <section aria-labelledby="contact-heading" className="space-y-4">
          <h2 id="contact-heading" className="type-subheading">
            Details for the shop
          </h2>
          <FieldGroup>
            <FormField
              control={form.control}
              name="phone"
              label="Mobile number"
              description="Optional. Only shared with this shop for this booking."
              render={({ field, controlProps }) => (
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0917 123 4567"
                  {...field}
                  {...controlProps}
                />
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              label="Notes"
              description={`Optional. Anything the shop should know, up to ${bookingRules.notesMaxLength} characters.`}
              render={({ field, controlProps }) => <Textarea rows={3} {...field} {...controlProps} />}
            />
          </FieldGroup>
        </section>

        <section aria-labelledby="policy-heading" className="space-y-3">
          <h2 id="policy-heading" className="type-subheading">
            Cancellation policy
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">{shop.policies.cancellation}</p>
          {shop.policies.noShow ? (
            <p className="text-sm text-pretty text-muted-foreground">{shop.policies.noShow}</p>
          ) : null}
          <FormField
            control={form.control}
            name="policyAccepted"
            label="I’ve read the cancellation policy"
            required
            orientation="horizontal"
            render={({ field, controlProps }) => (
              <Checkbox
                {...controlProps}
                ref={field.ref}
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
              />
            )}
          />
        </section>
      </fieldset>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-5 rounded-3xl card-surface p-5 md:p-6">
          <div>
            <h2 id="summary-heading" className="type-heading">
              Booking summary
            </h2>
            <p className="text-sm text-muted-foreground">
              <Link to={shopHref(shop.slug)} className="underline-offset-4 hover:underline">
                {shop.name}
              </Link>
            </p>
          </div>
          <AppointmentFacts
            start={start}
            dateKey={date || undefined}
            staffName={staffName ?? (providers.length ? 'any available staff' : undefined)}
            areaName={shop.area.name}
            durationMinutes={service.durationMinutes}
          />
          <PriceBreakdown serviceName={service.name} price={service.price} deposit={shop.policies.deposit} />
          <BookingMethodNote method={shop.bookingMethod} />
          <MockNotice>Your request is saved in this browser only. No shop is notified.</MockNotice>
          <FormError message={errors.root?.message} title="We couldn’t send your request" />
          <Button type="submit" size="xl" shape="pill" fullWidth loading={isSubmitting}>
            {!isSubmitting && <SendIcon aria-hidden="true" />}
            Send booking request
          </Button>
        </div>
      </aside>
    </form>
  )
}
