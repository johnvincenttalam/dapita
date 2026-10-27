import { ArrowLeftIcon, CalendarIcon, FlagIcon, MoreHorizontalIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { useMarkReadMutation } from '@/features/messaging/api/queries'
import { MessageComposer } from '@/features/messaging/components/MessageComposer'
import { ReportConversationDialog } from '@/features/messaging/components/ReportConversationDialog'
import { formatAppointment, formatTime } from '@/lib/format'
import { messageDays, otherParty } from '@/lib/messaging'
import { cn } from '@/lib/utils'
import type { ConversationDetails } from '@/types/message'

interface MessageThreadProps {
  conversation: ConversationDetails
  now: Date
  /** Back to the list on phones, where the list and the thread are separate screens. */
  backHref: string
  /** Where the booking the conversation is about opens for this viewer. */
  bookingHref: (id: string) => string
}

/** One conversation: who it's with, what booking it's about, the messages by day, and a reply box. */
export function MessageThread({ conversation, now, backHref, bookingHref }: MessageThreadProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const name = otherParty(conversation)
  const viewer = conversation.viewerSide
  const markRead = useMarkReadMutation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Opening the thread reads what the other side sent; new arrivals are read while it stays open.
  const { id, unreadCount } = conversation
  const { mutate: markAsRead } = markRead
  useEffect(() => {
    if (unreadCount > 0) markAsRead(id)
  }, [id, unreadCount, markAsRead])

  // Keep the newest message in view.
  const count = conversation.messages.length
  useEffect(() => {
    const list = scrollRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [count, id])

  const lastOwn = conversation.messages.findLast((message) => message.senderRole === viewer)

  return (
    <article
      aria-label={`Conversation with ${name}`}
      className="flex h-[min(46rem,calc(100svh-13rem))] min-h-96 flex-col overflow-hidden rounded-3xl card-surface"
    >
      <header className="flex items-center gap-2 border-b border-border/70 px-3 py-3 sm:px-5">
        <Button asChild variant="ghost" size="icon-sm" className="lg:hidden">
          <Link to={backHref} aria-label="All messages">
            <ArrowLeftIcon aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate type-subheading">{name}</h2>
          {conversation.booking ? (
            <Link
              to={bookingHref(conversation.booking.id)}
              className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">
                {conversation.booking.serviceName} · {formatAppointment(conversation.booking.start)}
              </span>
              <BookingStatusBadge status={conversation.booking.status} className="shrink-0" />
            </Link>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Conversation options">
              <MoreHorizontalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem variant="destructive" onSelect={() => setReportOpen(true)}>
              <FlagIcon aria-hidden="true" />
              Report conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {conversation.reported ? (
        <p className="border-b border-border/70 bg-muted px-5 py-2 text-xs text-muted-foreground">
          This conversation was reported. Dapita support will review it; you can keep messaging.
        </p>
      ) : null}

      <div
        ref={scrollRef}
        role="log"
        aria-label="Messages"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-5"
      >
        {conversation.messages.length === 0 ? (
          <p className="mx-auto max-w-xs pt-10 text-center text-sm text-pretty text-muted-foreground">
            {viewer === 'customer'
              ? `Ask ${name} about prices, times or anything else before you book.`
              : 'No messages yet.'}
          </p>
        ) : (
          messageDays(conversation.messages, now).map((day) => (
            <section key={day.key} aria-label={day.label} className="space-y-1.5">
              <p className="py-1 text-center type-micro text-muted-foreground">{day.label}</p>
              {day.messages.map((message) => {
                const own = message.senderRole === viewer
                return (
                  <div key={message.id} className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
                    <p
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap sm:max-w-[75%]',
                        own ? 'rounded-br-md bg-secondary text-secondary-foreground' : 'rounded-bl-md bg-muted',
                      )}
                    >
                      <span className="sr-only">{own ? 'You' : name}: </span>
                      {message.body}
                    </p>
                    <span className="mt-0.5 px-1 type-micro font-normal text-muted-foreground tabular-nums">
                      {formatTime(message.sentAt)}
                      {message.id === lastOwn?.id && message.readAt ? ' · Seen' : null}
                    </span>
                  </div>
                )
              })}
            </section>
          ))
        )}
      </div>

      <MessageComposer
        conversationId={conversation.id}
        placeholder={viewer === 'customer' ? `Message ${name}` : `Reply to ${name}`}
      />

      <ReportConversationDialog
        conversationId={conversation.id}
        otherName={name}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  )
}
