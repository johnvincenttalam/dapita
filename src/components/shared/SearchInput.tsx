import { SearchIcon, XIcon } from 'lucide-react'
import { useRef, type ComponentProps } from 'react'

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'ref'> {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name. Defaults to the placeholder. */
  label?: string
}

/** Controlled search field with a clear button. Debounce with `useDebouncedValue` if filtering is expensive. */
export function SearchInput({
  value,
  onValueChange,
  label,
  placeholder = 'Search…',
  className,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <InputGroup className={cn('w-full sm:max-w-xs', className)}>
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="search"
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onValueChange('')
          }
        }}
        {...props}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => {
              onValueChange('')
              inputRef.current?.focus()
            }}
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}
