import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bookingRules } from '@/config/booking'
import { DayStrip, TimeSlotGrid, type DayOption } from '@/features/booking/components/BookingPickers'
import { ClashNote } from '@/features/merchant/components/ClashNote'
import { getErrorMessage } from '@/lib/api-client'
import { proposalLeadMinutes } from '@/lib/booking-status'
import { addDays, addMinutes, minutesIntoDay, toDateKey, toTimeOfDay, zonedDateTime } from '@/lib/datetime'
import { formatAppointment, formatDay } from '@/lib/format'
import { describeClash, findClashes } from '@/lib/merchant-bookings'
import { preferredStartTimes } from '@/lib/opening-hours'
import { proposeTimeSchema, type ProposeTimeInput } from '@/schemas/booking'
import type { ClosurePeriod, WeeklyHours } from '@/types/business'
import type { BookingDetails } from '@/types/booking'
import type { TimeOfDay } from '@/types/common'

interface ProposeTimeDialogProps {
  booking: BookingDetails
  hours: WeeklyHours
  closures: ClosurePeriod[]
  /** The shop's bookings, for the clash check. */
  bookings: BookingDetails[]
  now: Date
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rejects with the server's message, which is shown above the submit button. */
  onSubmit: (input: { start: string; message?: string }) => Promise<void>
}

/**
 * Offer the customer another time (BKG-03). Times follow the opening hours and
 * start late enough for the customer to answer; clashing times stay selectable
 * but are marked, because only the owner knows whether a chair is free.
 */
export function ProposeTimeDialog(props: ProposeTimeDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl sm:p-6">
        {/* Mounted only while open, so every opening starts from a fresh form. */}
        {props.open ? <ProposeTimeForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ProposeTimeForm({ booking, hours, closures, bookings, now, onOpenChange, onSubmit }: ProposeTimeDialogProps) {
  const messageId = useId()
  const duration = booking.service.durationMinutes
  const requestedDate = toDateKey(new Date(booking.start))
  const requestedTime = toTimeOfDay(minutesIntoDay(new Date(booking.start)))

  const { days, timesByDate } = useMemo(() => {
    const today = toDateKey(now)
    const map = new Map<string, TimeOfDay[]>()
    const list: DayOption[] = []
    for (let offset = 0; offset < bookingRules.bookingWindowDays; offset++) {
      const key = addDays(today, offset)
      const times = preferredStartTimes(hours, closures, key, duration, now, { leadMinutes: proposalLeadMinutes }).map(
        (t) => t.time,
      )
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
  }, [now, hours, closures, duration])

  const form = useForm<ProposeTimeInput>({
    resolver: zodResolver(proposeTimeSchema),
    defaultValues: {
      date: timesByDate.get(requestedDate)?.length ? requestedDate : (days.find((d) => !d.disabled)?.value ?? ''),
      time: '',
      message: '',
    },
  })
  const [date, time, message] = useWatch({ control: form.control, name: ['date', 'time', 'message'] })
  const times = timesByDate.get(date) ?? []
  const { errors, isSubmitting } = form.formState

  const clashesAt = (slot: TimeOfDay) => {
    const start = zonedDateTime(date, slot)
    return findClashes(booking, start.toISOString(), addMinutes(start, duration).toISOString(), bookings)
  }
  const flaggedTimes = times.filter((slot) => clashesAt(slot).length > 0)
  const clashText = time ? describeClash(clashesAt(time), booking.staffName) : undefined

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        start: zonedDateTime(values.date, values.time).toISOString(),
        message: values.message || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="min-w-0 space-y-5">
      <DialogHeader>
        <DialogTitle>Propose another time</DialogTitle>
        <DialogDescription>
          {booking.contact.name} asked for {formatAppointment(booking.start)}. They’ll be asked to accept your new time.
        </DialogDescription>
      </DialogHeader>

      <DayStrip
        days={days}
        value={date}
        onChange={(next) => {
          form.setValue('date', next, { shouldValidate: false })
          form.setValue('time', '')
        }}
        error={errors.date?.message}
      />
      <div className="space-y-3">
        <TimeSlotGrid
          times={times}
          value={time}
          onChange={(next) => form.setValue('time', next, { shouldValidate: true })}
          error={errors.time?.message}
          disabledTimes={date === requestedDate ? [requestedTime] : []}
          flaggedTimes={flaggedTimes}
        />
        <ClashNote text={clashText} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={messageId}>Message to {booking.contact.name} (optional)</Label>
        <Textarea
          id={messageId}
          rows={2}
          maxLength={bookingRules.reasonMaxLength}
          placeholder="Ken’s free at 3 instead"
          aria-describedby={`${messageId}-count`}
          {...form.register('message')}
        />
        <p id={`${messageId}-count`} className="text-right text-xs text-muted-foreground tabular-nums">
          {message.length}/{bookingRules.reasonMaxLength}
        </p>
      </div>

      <FormError title="We couldn’t send the new time" message={errors.root?.message} />

      <DialogFooter>
        <Button type="button" variant="outline" shape="pill" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" shape="pill" loading={isSubmitting}>
          Send new time
        </Button>
      </DialogFooter>
    </form>
  )
}
