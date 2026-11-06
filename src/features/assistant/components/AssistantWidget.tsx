import { MessageCircleIcon } from 'lucide-react'
import { useMatch } from 'react-router'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AssistantConversation } from '@/features/assistant/components/AssistantConversation'
import type { AssistantEngine } from '@/features/assistant/engine'
import { useAssistant } from '@/features/assistant/use-assistant'

/**
 * The customer assistant: a floating bubble that opens a side panel. Hidden on the booking page,
 * where it would compete with the form. `engine` is for tests; the app uses the shared rule engine.
 */
export function AssistantWidget({ engine }: { engine?: AssistantEngine }) {
  const assistant = useAssistant(engine)
  const onBookingPage = useMatch('/shops/:shopSlug/book') !== null

  if (onBookingPage) return null

  return (
    <>
      {assistant.open ? null : (
        <Button
          type="button"
          aria-label="Open Dapita Assistant"
          onClick={() => assistant.setOpen(true)}
          className="fixed right-4 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1rem)] z-40 size-12 rounded-full shadow-lg md:right-6 md:bottom-6"
        >
          <MessageCircleIcon aria-hidden="true" className="size-6" />
        </Button>
      )}
      <Sheet open={assistant.open} onOpenChange={assistant.setOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-[380px]">
          <SheetHeader className="border-b pr-14">
            <SheetTitle>Dapita Assistant</SheetTitle>
            <SheetDescription>An automated helper that answers from Dapita&apos;s shop listings.</SheetDescription>
          </SheetHeader>
          <AssistantConversation messages={assistant.messages} busy={assistant.busy} send={assistant.send} />
        </SheetContent>
      </Sheet>
    </>
  )
}
