import { useId, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/utils'

export interface ChoiceOption {
  value: string
  /** Accessible name. Defaults to the rendered content's text. */
  label: string
  disabled?: boolean
}

interface ChoiceGroupProps<T extends ChoiceOption> {
  /** Visible group heading, rendered as the fieldset legend. */
  legend: ReactNode
  /** Small text next to the legend, e.g. "(Optional)". */
  legendHint?: ReactNode
  options: readonly T[]
  value: string | undefined
  onChange: (value: string) => void
  /** Renders the inside of one option. Selected styling is applied by the wrapper. */
  renderOption: (option: T, selected: boolean) => ReactNode
  /** Layout of the options, e.g. a grid or a horizontal scroller. */
  className?: string
  /** Ref to the options container, e.g. to scroll it from outside buttons. */
  listRef?: Ref<HTMLDivElement>
  /** Size and shape of each option. */
  optionClassName?: string
  /** Error message shown under the group and linked to it. */
  error?: string
  describedBy?: string
  /** `tile`: bordered box filled with primary when selected. `bare`: no box; `renderOption` draws the selection. */
  appearance?: 'tile' | 'bare'
}

/**
 * Single choice from visual options (staff, day, time in design screen 6). Built
 * on native radio inputs, so arrow keys, form semantics and screen readers work
 * without extra code.
 */
export function ChoiceGroup<T extends ChoiceOption>({
  legend,
  legendHint,
  options,
  value,
  onChange,
  renderOption,
  className,
  listRef,
  optionClassName,
  error,
  describedBy,
  appearance = 'tile',
}: ChoiceGroupProps<T>) {
  const name = useId()
  const errorId = `${name}-error`

  return (
    <fieldset
      aria-invalid={error ? true : undefined}
      aria-describedby={[error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined}
      className="min-w-0 space-y-3"
    >
      <legend className="mb-3 type-subheading">
        {legend}
        {legendHint ? <span className="ml-1 text-sm font-normal text-muted-foreground">{legendHint}</span> : null}
      </legend>
      <div ref={listRef} className={className}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-xl text-sm font-medium transition-colors outline-none',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                appearance === 'tile' && 'ring-1 ring-border',
                appearance === 'tile' &&
                  (selected
                    ? 'bg-primary text-primary-foreground ring-primary'
                    : 'bg-card text-foreground hover:bg-muted'),
                option.disabled && 'cursor-not-allowed text-muted-foreground/60',
                option.disabled && appearance === 'tile' && 'bg-muted/50 hover:bg-muted/50',
                optionClassName,
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                aria-label={option.label}
                className="sr-only"
              />
              {renderOption(option, selected)}
            </label>
          )
        })}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
