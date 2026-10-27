import { CircleAlertIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface FormErrorProps {
  /** Usually `form.formState.errors.root?.message`. Nothing renders when empty. */
  message?: string
  title?: string
}

/** Form-level error, for failures that don't belong to a single field (e.g. a rejected submission). */
export function FormError({ message, title = 'We couldn’t submit the form' }: FormErrorProps) {
  if (!message) return null
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
