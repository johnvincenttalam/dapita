import { SendIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { ShopCard } from '@/features/discovery/components/ShopCard'
import { bookingHref } from '@/features/shops/links'
import { cn } from '@/lib/utils'
import type { AssistantMessage } from '@/types/assistant'

interface AssistantConversationProps {
  messages: AssistantMessage[]
  busy: boolean
  send: (text: string) => void
}

export function AssistantConversation({ messages, busy, send }: AssistantConversationProps) {
  const [draft, setDraft] = useState('')
  const categories = useCategoriesQuery().data
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, busy])

  const lastAssistantId = messages.findLast((m) => m.role === 'assistant')?.id

  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !draft.trim()) return
    send(draft)
    setDraft('')
  }

  return (
    <>
      <div ref={listRef} aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((message) =>
          message.role === 'user' ? (
            <p
              key={message.id}
              className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
            >
              {message.text}
            </p>
          ) : (
            <div key={message.id} className="flex max-w-[92%] flex-col gap-3 self-start">
              <p className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 whitespace-pre-line">{message.reply.text}</p>
              {message.reply.shops.map(({ shop, service, distanceKm }) => (
                <div key={shop.id} className="flex flex-col gap-2">
                  <ShopCard
                    shop={shop}
                    category={categories?.find((c) => c.id === shop.categoryIds[0])}
                    distanceKm={distanceKm}
                    headingLevel="h3"
                  />
                  {service ? (
                    <Button asChild size="sm">
                      <Link to={bookingHref(shop.slug, service.id)}>Send booking request</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
              {message.reply.exploreHref ? (
                <Link
                  to={message.reply.exploreHref}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  See these on Explore
                </Link>
              ) : null}
              {message.id === lastAssistantId && message.reply.suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {message.reply.suggestions.map((label) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => send(label)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}
        {busy ? (
          <div aria-hidden="true" className="flex gap-1 self-start rounded-2xl bg-muted px-3 py-3">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className={cn('size-2 rounded-full bg-muted-foreground/60 motion-safe:animate-pulse')}
                style={{ animationDelay: `${dot * 150}ms` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t p-4">
        <Input
          aria-label="Message"
          placeholder="Ask about shops and services"
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
        />
        <Button type="submit" size="icon" aria-label="Send message" disabled={busy || !draft.trim()}>
          <SendIcon aria-hidden="true" />
        </Button>
      </form>
    </>
  )
}
