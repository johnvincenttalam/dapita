import { SendHorizontalIcon } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSendMessageMutation } from '@/features/messaging/api/queries'
import { getErrorMessage } from '@/lib/api-client'

const MAX_LENGTH = 2000
const SHOW_COUNT_FROM = 1800

/** Enter sends, Shift+Enter starts a new line. A failed send keeps the draft and says why. */
export function MessageComposer({ conversationId, placeholder }: { conversationId: string; placeholder: string }) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const send = useSendMessageMutation(conversationId)
  const text = draft.trim()

  const submit = () => {
    if (!text || send.isPending) return
    send.mutate(text, { onSuccess: () => setDraft('') })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Leave Enter alone while an input method is composing (e.g. accented characters).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="space-y-1.5 border-t border-border/70 p-3 sm:p-4"
    >
      {send.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(send.error)} Your message is still here.
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          Message
        </label>
        <Textarea
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={MAX_LENGTH}
          rows={1}
          className="field-sizing-content max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" shape="pill" disabled={!text} loading={send.isPending} aria-label="Send message">
          <SendHorizontalIcon aria-hidden="true" />
          <span className="max-sm:sr-only">Send</span>
        </Button>
      </div>
      {draft.length >= SHOW_COUNT_FROM ? (
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {draft.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </p>
      ) : null}
    </form>
  )
}
