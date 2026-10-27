import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { SearchInput } from '@/components/shared/SearchInput'
import { cn } from '@/lib/utils'

interface SiteSearchFormProps {
  className?: string
  inputClassName?: string
}

/** Marketplace search (design screen 3): submits to the Explore page with the query in the URL. */
export function SiteSearchForm({ className, inputClassName }: SiteSearchFormProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = query.trim()
    void navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <form role="search" onSubmit={onSubmit} className={className}>
      <SearchInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search services, shops, or location…"
        label="Search services, shops, or location"
        className={cn('rounded-full sm:max-w-none', inputClassName)}
      />
    </form>
  )
}
