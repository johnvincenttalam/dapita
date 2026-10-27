import { ChevronLeftIcon, ChevronRightIcon, UserRoundIcon } from 'lucide-react'
import { useRef } from 'react'

import { ChoiceGroup } from '@/components/shared/ChoiceGroup'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { zonedDateTime } from '@/lib/datetime'
import { formatMonthDay, formatWeekday, initials } from '@/lib/format'
import { formatTimeOfDay } from '@/lib/opening-hours'
import { cn } from '@/lib/utils'
import type { StaffMember } from '@/types/business'
import type { DateKey, TimeOfDay } from '@/types/common'

/** The value used for "Any available" in the staff picker. */
export const ANY_STAFF = 'any'

interface StaffPickerProps {
  staff: StaffMember[]
  value: string
  onChange: (value: string) => void
}

/** "Select Staff (Optional)" from design screen 6. Shown only when the shop keeps staff records (plan C15). */
export function StaffPicker({ staff, value, onChange }: StaffPickerProps) {
  const options = [
    { value: ANY_STAFF, label: 'Any available', member: undefined },
    ...staff.map((member) => ({ value: member.id, label: member.displayName, member })),
  ]

  return (
    <ChoiceGroup
      legend="Select staff"
      legendHint="(Optional)"
      options={options}
      value={value}
      onChange={onChange}
      appearance="bare"
      // Columns are wide enough for "Any available" on one line, so every label sits on the same row.
      className="-mx-1 flex overflow-x-auto px-1 pt-1 pb-2"
      optionClassName="w-22 shrink-0 flex-col gap-2 rounded-2xl py-1"
      renderOption={({ label, member }, selected) => (
        <>
          <Avatar
            className={cn(
              'size-14 ring-2 ring-offset-2 ring-offset-background transition-shadow',
              selected ? 'ring-primary' : 'ring-transparent',
            )}
          >
            {member?.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
              {member ? (
                initials(member.displayName)
              ) : (
                <UserRoundIcon aria-hidden="true" className="size-6 text-primary" />
              )}
            </AvatarFallback>
          </Avatar>
          {/* Selection changes colour only: a bolder weight would make the selected label wider. */}
          <span className={cn('text-xs leading-tight whitespace-nowrap', selected && 'text-primary')}>{label}</span>
        </>
      )}
    />
  )
}

export interface DayOption {
  value: DateKey
  /** Full accessible name, e.g. "Today, Wed, Oct 21". */
  label: string
  disabled: boolean
  isToday: boolean
}

interface DayPickerProps {
  days: DayOption[]
  value: string | undefined
  onChange: (value: DateKey) => void
  error?: string
}

/**
 * Horizontal day strip ("Select Date", design screen 6). Days without opening hours are disabled.
 * Phones swipe it; from `md` up, buttons scroll it for mouse users.
 */
export function DayStrip({ days, value, onChange, error }: DayPickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const scroll = (direction: 1 | -1) => {
    const list = listRef.current
    list?.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ChoiceGroup
        legend="Select date"
        options={days}
        value={value}
        onChange={onChange}
        error={error}
        listRef={listRef}
        className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pt-1 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
        optionClassName="h-16 w-16 shrink-0 snap-start flex-col gap-0.5"
        renderOption={(day) => {
          const noon = zonedDateTime(day.value, '12:00')
          return (
            <>
              <span className="text-sm font-semibold">{day.isToday ? 'Today' : formatWeekday(noon)}</span>
              <span className="text-xs opacity-80">{formatMonthDay(noon)}</span>
            </>
          )
        }}
      />
      <div className="absolute top-0 right-0 hidden gap-1 md:flex">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          shape="pill"
          aria-label="Earlier dates"
          onClick={() => scroll(-1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          shape="pill"
          aria-label="Later dates"
          onClick={() => scroll(1)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

interface TimePickerProps {
  times: TimeOfDay[]
  value: string | undefined
  onChange: (value: TimeOfDay) => void
  error?: string
  /** Explains that in request mode the time is a preference (plan C2). */
  hintId?: string
  hint?: string
  /** Shown but not selectable, e.g. the time the customer already asked for. */
  disabledTimes?: readonly TimeOfDay[]
  /** Selectable but marked, e.g. times that clash with another booking. */
  flaggedTimes?: readonly TimeOfDay[]
}

/** "Select Time" grid (design screen 6). */
export function TimeSlotGrid({
  times,
  value,
  onChange,
  error,
  hint,
  hintId,
  disabledTimes = [],
  flaggedTimes = [],
}: TimePickerProps) {
  return (
    <div className="space-y-2">
      <ChoiceGroup
        legend="Select time"
        options={times.map((time) => {
          const flagged = flaggedTimes.includes(time)
          const text = formatTimeOfDay(time)
          return {
            value: time,
            text,
            flagged,
            label: flagged ? `${text}, clashes with another booking` : text,
            disabled: disabledTimes.includes(time),
          }
        })}
        value={value}
        onChange={onChange}
        error={error}
        describedBy={hint ? hintId : undefined}
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        optionClassName="h-11"
        renderOption={(option) => (
          <>
            {option.text}
            {option.flagged ? (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current opacity-60"
              />
            ) : null}
          </>
        )}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
