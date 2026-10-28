import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { ChoiceGroup } from '@/components/shared/ChoiceGroup'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useSendSupportRequestMutation } from '@/features/support/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import { formatAppointment } from '@/lib/format'
import { cn } from '@/lib/utils'
import { supportRequestSchema, type SupportRequestInput, type SupportTopic } from '@/schemas/support'
import type { SupportRequestReceipt } from '@/services/support.service'
import type { BookingDetails } from '@/types/booking'
import type { ShopDetails } from '@/types/business'

const topics: { value: SupportTopic; label: string; description: string; placeholder: string }[] = [
  {
    value: 'booking',
    label: 'A booking',
    description: 'A dispute, a no-show, a cancellation or a charge you didn’t expect.',
    placeholder: 'What happened, and what would you like us to do?',
  },
  {
    value: 'listing',
    label: 'A shop’s listing',
    description: 'Wrong details or prices, or something that breaks the listing policy.',
    placeholder: 'What’s wrong with the listing? Prices, address, photos, or something else?',
  },
  {
    value: 'account',
    label: 'My account or data',
    description: 'Correct your details, get a copy of your data, or a question about privacy.',
    placeholder: 'What would you like to change or receive?',
  },
  {
    value: 'other',
    label: 'Something else',
    description: 'Anything that doesn’t fit above, including questions about your business listing.',
    placeholder: 'How can we help?',
  },
]

interface SupportRequestFormProps {
  defaultTopic?: SupportTopic
  defaultBookingId?: string
  /** The shop being reported, from its "Report this listing" link. */
  shop?: ShopDetails
  /** The sender's bookings to choose from. Empty for people with none. */
  bookings: BookingDetails[]
  onSent: (receipt: SupportRequestReceipt) => void
}

/** Opens a support case: what it's about, the booking or shop it concerns, and what happened (ADM-03). */
export function SupportRequestForm({
  defaultTopic,
  defaultBookingId,
  shop,
  bookings,
  onSent,
}: SupportRequestFormProps) {
  const send = useSendSupportRequestMutation()
  const form = useForm<SupportRequestInput>({
    resolver: zodResolver(supportRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      topic: defaultTopic,
      bookingId: bookings.some((booking) => booking.id === defaultBookingId) ? defaultBookingId : '',
      businessId: shop?.id,
      message: '',
    },
  })
  const topic = useWatch({ control: form.control, name: 'topic' })
  const chosen = topics.find((item) => item.value === topic)
  const missingShop = topic === 'listing' && !shop

  const onSubmit = form.handleSubmit(async ({ bookingId, businessId, ...values }) => {
    try {
      onSent(
        await send.mutateAsync({
          ...values,
          ...(values.topic === 'booking' && bookingId ? { bookingId } : {}),
          ...(values.topic === 'listing' ? { businessId } : {}),
        }),
      )
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t send your request" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0 space-y-6">
        <ChoiceGroup
          legend="What is it about?"
          options={topics}
          value={topic}
          onChange={(next) => form.setValue('topic', next as SupportTopic, { shouldValidate: true })}
          error={form.formState.errors.topic?.message}
          appearance="bare"
          className="grid gap-2 sm:grid-cols-2"
          optionClassName="items-start justify-start"
          renderOption={(option, selected) => (
            <span
              className={cn(
                'flex w-full flex-col gap-1 rounded-2xl p-4 text-left ring-1 transition-colors',
                selected ? 'bg-primary/5 ring-2 ring-primary' : 'bg-card ring-border hover:bg-muted',
              )}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-sm font-normal text-pretty text-muted-foreground">{option.description}</span>
            </span>
          )}
        />

        {topic === 'booking' && bookings.length ? (
          <FormField
            control={form.control}
            name="bookingId"
            label="Which booking?"
            description="Optional. Choosing it lets us see the booking’s history."
            render={({ field, controlProps }) => (
              <NativeSelect {...field} value={field.value ?? ''} {...controlProps}>
                <option value="">Not about one booking</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.service.name} at {booking.business.name}, {formatAppointment(booking.start)} (
                    {booking.reference})
                  </option>
                ))}
              </NativeSelect>
            )}
          />
        ) : null}

        {topic === 'listing' ? (
          shop ? (
            <p className="rounded-2xl bg-muted/70 p-4 text-sm">
              <span className="font-semibold">Reporting: </span>
              {shop.name}, {shop.address}
            </p>
          ) : (
            <p role="status" className="rounded-2xl bg-muted/70 p-4 text-sm text-pretty">
              To report a shop, open its page and choose <span className="font-semibold">Report this listing</span>, so
              we know which one you mean.{' '}
              <Link to="/explore" className="font-medium text-primary underline-offset-4 hover:underline">
                Find the shop
              </Link>
            </p>
          )
        ) : null}

        {topic && !missingShop ? (
          <FieldGroup>
            <FormField
              control={form.control}
              name="message"
              label="What happened?"
              required
              description="Include dates, amounts and names where they help. Don’t share passwords or card numbers."
              render={({ field, controlProps }) => (
                <Textarea rows={6} maxLength={2000} placeholder={chosen?.placeholder} {...field} {...controlProps} />
              )}
            />
          </FieldGroup>
        ) : null}
      </fieldset>

      {topic && !missingShop ? (
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" shape="pill" loading={form.formState.isSubmitting}>
            Send to support
          </Button>
        </div>
      ) : null}
    </form>
  )
}
