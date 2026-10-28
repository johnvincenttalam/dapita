import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useUpdatePoliciesMutation } from '@/features/merchant/api/business-queries'
import { SuggestionChips } from '@/features/merchant/components/SuggestionChips'
import {
  cancellationSuggestions,
  depositSuggestions,
  noShowSuggestions,
  type PolicySuggestion,
} from '@/features/merchant/setup-suggestions'
import { getErrorMessage } from '@/lib/api-client'
import { env } from '@/lib/env'
import { policiesSchema, type PoliciesInput } from '@/schemas/business'
import type { Business } from '@/types/business'

const policyValues = ({ policies }: Business): PoliciesInput => ({
  cancellation: policies.cancellation,
  noShow: policies.noShow ?? '',
  deposit: policies.deposit ?? '',
})

/** Policies customers agree to before booking (BKG-06). Each wording change is a new version. */
interface PoliciesFormProps {
  business: Business
  /** Onboarding: "Save and continue", then the next step. */
  submitLabel?: string
  onSaved?: () => void
}

export function PoliciesForm({ business, submitLabel = 'Save booking rules', onSaved }: PoliciesFormProps) {
  const update = useUpdatePoliciesMutation(business.id)
  const form = useForm<PoliciesInput>({
    resolver: zodResolver(policiesSchema),
    mode: 'onTouched',
    defaultValues: policyValues(business),
  })

  // A suggestion replaces the field, like typing it; the owner can edit it from there.
  const pick = (name: keyof PoliciesInput) => (suggestion: PolicySuggestion) =>
    form.setValue(name, suggestion.text, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  const label = (suggestion: PolicySuggestion) => suggestion.label

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(values)
      form.reset(policyValues(saved))
      if (onSaved) {
        onSaved()
        return
      }
      // A listing that has never been live has no earlier version to tell apart.
      toast.success(
        saved.policies.version === business.policies.version || business.policies.version === 0
          ? 'Booking rules saved.'
          : `Booking rules saved. New requests use version ${saved.policies.version}.`,
      )
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save your booking rules" />
      <Panel
        title="Booking rules"
        description={
          business.policies.version > 0
            ? `Version ${business.policies.version}. Customers agree to these before they send a request. Anyone who already booked keeps the version they agreed to.`
            : 'Customers agree to these before they send a request. Start from a common rule and change the words if you like.'
        }
      >
        <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
          <FieldGroup>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="cancellation"
                label="Cancellation policy"
                description="Until when can customers cancel without a problem?"
                required
                render={({ field, controlProps }) => (
                  <Textarea rows={4} maxLength={1000} {...field} {...controlProps} />
                )}
              />
              <SuggestionChips
                label="Start from a common rule"
                items={cancellationSuggestions}
                itemLabel={label}
                onPick={pick('cancellation')}
              />
            </div>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="noShow"
                label="If a customer doesn’t turn up"
                description="Optional. Also called a no-show policy."
                render={({ field, controlProps }) => (
                  <Textarea rows={3} maxLength={1000} {...field} {...controlProps} />
                )}
              />
              <SuggestionChips
                label="Start from a common rule"
                items={noShowSuggestions}
                itemLabel={label}
                onPick={pick('noShow')}
              />
            </div>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="deposit"
                label="Deposits"
                description={`Optional. Leave it empty if you don’t ask for one. ${env.appName} doesn’t take payments, so say how you collect it.`}
                render={({ field, controlProps }) => (
                  <Textarea rows={3} maxLength={1000} {...field} {...controlProps} />
                )}
              />
              <SuggestionChips
                label="Start from a common rule"
                items={depositSuggestions}
                itemLabel={label}
                onPick={pick('deposit')}
              />
            </div>
          </FieldGroup>
        </fieldset>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          shape="pill"
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
          onClick={() => form.reset()}
        >
          Undo changes
        </Button>
        <Button type="submit" shape="pill" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
