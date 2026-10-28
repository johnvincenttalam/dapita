import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, XIcon } from 'lucide-react'
import { useId } from 'react'
import { Controller, useForm, useWatch, type FieldError, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormError } from '@/components/forms/FormError'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { useUpdateHoursMutation } from '@/features/merchant/api/business-queries'
import { SuggestionChips } from '@/features/merchant/components/SuggestionChips'
import { getErrorMessage } from '@/lib/api-client'
import { parseTimeOfDay, toTimeOfDay } from '@/lib/datetime'
import { formatTimeOfDay, weekdayNames, weekdayOrder } from '@/lib/opening-hours'
import { dayHoursSchema } from '@/schemas/business'
import type { Business, TimeRange, Weekday, WeeklyHours } from '@/types/business'
import type { TimeOfDay } from '@/types/common'

/** Index = weekday (0 = Sunday), so each day is one field. */
const hoursFormSchema = z.object({ days: z.array(dayHoursSchema).length(7) })
type HoursFormValues = z.infer<typeof hoursFormSchema>

const MAX_RANGES = 3
const STEP = 30
const DAY = 24 * 60
const DEFAULT_RANGE: TimeRange = { open: '10:00', close: '19:00' }

const toDays = (hours: WeeklyHours): TimeRange[][] => ([0, 1, 2, 3, 4, 5, 6] as const).map((day) => hours[day])
const toWeek = (days: TimeRange[][]) =>
  Object.fromEntries(days.map((ranges, day) => [day, ranges])) as unknown as WeeklyHours

/** One tap sets the whole week from one day's hours, the usual pattern for a small shop. */
const weekPatterns: { label: string; days: Weekday[] }[] = [
  { label: 'Mon–Sat', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Mon–Fri', days: [1, 2, 3, 4, 5] },
]

/** Half-hour steps; the current value stays listed even if it's off the grid. */
function timeOptions(kind: 'open' | 'close', current: TimeOfDay) {
  const values: TimeOfDay[] = []
  for (let minutes = kind === 'open' ? 0 : STEP; minutes <= (kind === 'open' ? DAY - STEP : DAY); minutes += STEP) {
    values.push(toTimeOfDay(minutes))
  }
  if (!values.includes(current)) values.push(current)
  return values.sort((a, b) => parseTimeOfDay(a) - parseTimeOfDay(b))
}

const timeLabel = (time: TimeOfDay) => (time === '24:00' ? 'Midnight' : formatTimeOfDay(time))

/** A second window starts an hour after the last one ends, e.g. back from a lunch break. */
function nextRange(ranges: TimeRange[]): TimeRange | undefined {
  const last = ranges.at(-1)
  if (!last) return DEFAULT_RANGE
  const open = parseTimeOfDay(last.close) + 60
  if (open > DAY - STEP) return undefined
  return { open: toTimeOfDay(open), close: toTimeOfDay(Math.min(open + 180, DAY)) }
}

/** The message for one day: an overlap on the day, or a closing time before its opening time. */
function dayError(errors: FieldErrors<HoursFormValues>, day: Weekday): string | undefined {
  const error = errors.days?.[day] as unknown as
    (FieldError & Partial<Record<number, { close?: FieldError }>>) | undefined
  if (!error) return undefined
  if (error.message) return error.message
  for (let index = 0; index < MAX_RANGES; index++) {
    const message = error[index]?.close?.message
    if (message) return message
  }
  return undefined
}

interface DayRowProps {
  day: Weekday
  ranges: TimeRange[]
  onChange: (ranges: TimeRange[]) => void
  /** Hours to start from when the day is switched on. */
  fallback: TimeRange[]
  error?: string
}

function DayRow({ day, ranges, onChange, fallback, error }: DayRowProps) {
  const labelId = useId()
  const errorId = useId()
  const name = weekdayNames[day]
  const open = ranges.length > 0
  const next = nextRange(ranges)
  const set = (index: number, key: keyof TimeRange, value: TimeOfDay) =>
    onChange(ranges.map((range, i) => (i === index ? { ...range, [key]: value } : range)))

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className="grid gap-3 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start"
    >
      <div className="flex items-center justify-between gap-3 sm:h-10 sm:justify-start">
        <span id={labelId} className="font-medium">
          {name}
        </span>
        <Switch
          checked={open}
          onCheckedChange={(checked) => onChange(checked ? fallback : [])}
          aria-label={`Open on ${name}`}
        />
      </div>

      {open ? (
        <div className="min-w-0 space-y-2">
          {ranges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <NativeSelect
                aria-label="Opens"
                value={range.open}
                onChange={(event) => set(index, 'open', event.target.value)}
                aria-invalid={Boolean(error) || undefined}
                className="flex-1 sm:max-w-40"
              >
                {timeOptions('open', range.open).map((time) => (
                  <option key={time} value={time}>
                    {timeLabel(time)}
                  </option>
                ))}
              </NativeSelect>
              <span aria-hidden="true" className="text-muted-foreground">
                –
              </span>
              <NativeSelect
                aria-label="Closes"
                value={range.close}
                onChange={(event) => set(index, 'close', event.target.value)}
                aria-invalid={Boolean(error) || undefined}
                className="flex-1 sm:max-w-40"
              >
                {timeOptions('close', range.close).map((time) => (
                  <option key={time} value={time}>
                    {timeLabel(time)}
                  </option>
                ))}
              </NativeSelect>
              {ranges.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${timeLabel(range.open)} to ${timeLabel(range.close)}`}
                  onClick={() => onChange(ranges.filter((_, i) => i !== index))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ))}
          {ranges.length < MAX_RANGES && next ? (
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              size="sm"
              className="-ml-2"
              onClick={() => onChange([...ranges, next])}
            >
              <PlusIcon aria-hidden="true" />
              Add hours
            </Button>
          ) : null}
          {error ? (
            <p id={errorId} className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground sm:leading-10">Closed</p>
      )}
    </div>
  )
}

/** Weekly opening hours (MER-03). Request times and the shop's open status follow these. */
interface OpeningHoursFormProps {
  business: Business
  /** Onboarding: "Save and continue", then the next step. */
  submitLabel?: string
  onSaved?: () => void
}

export function OpeningHoursForm({ business, submitLabel = 'Save hours', onSaved }: OpeningHoursFormProps) {
  const update = useUpdateHoursMutation(business.id)
  const form = useForm<HoursFormValues>({
    resolver: zodResolver(hoursFormSchema),
    defaultValues: { days: toDays(business.hours) },
  })
  const days = useWatch({ control: form.control, name: 'days' })
  // The first open day in the week, else the usual 10–7, is copied to the chosen days.
  const source = weekdayOrder.find((day) => days[day]?.length)
  const sourceRanges = source === undefined ? [DEFAULT_RANGE] : (days[source] ?? [DEFAULT_RANGE])
  const applyPattern = (pattern: (typeof weekPatterns)[number]) =>
    form.setValue(
      'days',
      days.map((_, day) => (pattern.days.includes(day as Weekday) ? sourceRanges.map((range) => ({ ...range })) : [])),
      { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
    )

  const onSubmit = form.handleSubmit(async ({ days }) => {
    try {
      const saved = await update.mutateAsync(toWeek(days))
      form.reset({ days: toDays(saved.hours) })
      if (onSaved) onSaved()
      else toast.success('Opening hours saved. New bookings follow them.')
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save your hours" />
      <Panel
        title="Opening hours"
        description="Customers can only request times when you’re open. Add more hours to a day for a break, e.g. closed over lunch."
      >
        <SuggestionChips
          label={
            source === undefined
              ? `Open ${timeLabel(DEFAULT_RANGE.open)} – ${timeLabel(DEFAULT_RANGE.close)} on`
              : `Use ${weekdayNames[source]}’s hours for`
          }
          items={weekPatterns}
          itemLabel={(pattern) => pattern.label}
          onPick={applyPattern}
        />
        <fieldset disabled={form.formState.isSubmitting} className="-my-4 min-w-0 divide-y divide-border/70">
          {weekdayOrder.map((day) => (
            <Controller
              key={day}
              control={form.control}
              name={`days.${day}`}
              render={({ field }) => {
                const days = form.getValues('days')
                // Switching a day on starts from the nearest open day before it, else the usual 10–7.
                const before = weekdayOrder.slice(0, weekdayOrder.indexOf(day)).reverse()
                const fallback = before.map((other) => days[other] ?? []).find((ranges) => ranges.length) ?? [
                  DEFAULT_RANGE,
                ]
                return (
                  <DayRow
                    day={day}
                    ranges={field.value}
                    onChange={field.onChange}
                    fallback={fallback}
                    error={dayError(form.formState.errors, day)}
                  />
                )
              }}
            />
          ))}
        </fieldset>
      </Panel>
      <p className="text-sm text-muted-foreground">
        Bookings already made aren’t changed. For holidays and one-off days off, add a closure instead.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          shape="pill"
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
          onClick={() => form.reset()}
        >
          Undo changes
        </Button>
        <Button type="submit" shape="pill" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
