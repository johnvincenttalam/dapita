import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { Matcher } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  /** Text shown on the trigger once a date is picked. Defaults to a medium date format. */
  formatValue?: (date: Date) => string
  /** Dates that cannot be selected, e.g. `{ after: new Date() }`. */
  disabled?: Matcher | Matcher[]
  /** Month/year dropdowns, useful for dates far from today such as birthdays. */
  captionLayout?: 'label' | 'dropdown'
  startMonth?: Date
  endMonth?: Date
  id?: string
  name?: string
  onBlur?: () => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  formatValue = formatDate,
  disabled,
  captionLayout = 'label',
  startMonth,
  endMonth,
  className,
  onBlur,
  ...triggerProps
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal sm:w-56',
            !value && 'text-muted-foreground',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
            className,
          )}
          {...triggerProps}
        >
          <CalendarIcon aria-hidden="true" />
          {value ? formatValue(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
            onBlur?.()
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
