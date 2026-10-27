import { BellIcon, CheckCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/features/notifications/use-notifications'
import { formatRelative } from '@/lib/format'
import type { NotificationAudience } from '@/lib/notifications'
import { cn } from '@/lib/utils'

const itemClass = 'flex w-full gap-3 px-4 py-3 text-left outline-none hover:bg-accent focus-visible:bg-accent'

/** The bell: what's new and waiting for this person, each item leading to where it's handled. */
export function NotificationsMenu({ audience }: { audience: NotificationAudience }) {
  const [open, setOpen] = useState(false)
  const { notifications, unread, markRead } = useNotifications(audience)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <BellIcon aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 type-micro font-semibold text-destructive-foreground ring-2 ring-background"
            >
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markRead(notifications.map((item) => item.id))}
            disabled={unread === 0}
          >
            <CheckCheckIcon aria-hidden="true" />
            Mark all read
          </Button>
        </div>
        <Separator />
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">You’re all caught up.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {notifications.map((n) => (
              <li key={n.id}>
                {/* Opening a notification marks it read and goes to where it's handled. */}
                <Link
                  to={n.href}
                  onClick={() => {
                    markRead([n.id])
                    setOpen(false)
                  }}
                  className={itemClass}
                >
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')}
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium">
                      {n.title}
                      {!n.read ? <span className="sr-only"> (unread)</span> : null}
                    </span>
                    <span className="line-clamp-2 block text-sm text-muted-foreground">{n.body}</span>
                    <span className="block text-xs text-muted-foreground">{formatRelative(n.occurredAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
