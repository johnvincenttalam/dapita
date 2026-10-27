import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { ChoiceGroup } from '@/components/shared/ChoiceGroup'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useSaveServiceMutation } from '@/features/merchant/api/service-queries'
import { getErrorMessage } from '@/lib/api-client'
import { formatDuration, formatPrice } from '@/lib/format'
import {
  previewPrice,
  serviceFormSchema,
  serviceFormValues,
  type ServiceFormInput,
  type ServiceFormValues,
} from '@/schemas/service'
import type { Service } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

const priceOptions = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'from', label: 'Starting from' },
  { value: 'range', label: 'Price range' },
  { value: 'quote', label: 'Price on consultation' },
] as const

const amountLabel = { fixed: 'Price', from: 'Starting price', range: 'Lowest price' } as const

interface ServiceFormProps {
  businessId: string
  categories: ServiceCategory[]
  /** Omit to add a new service. */
  service?: Service
  /** Stay on the page after saving (onboarding) instead of going back to the services list. */
  onSaved?: (service: Service) => void
  onCancel?: () => void
}

/** Add or edit one service (MER-02). Prices are typed as on the shop's price list and checked as you go. */
export function ServiceForm({ businessId, categories, service, onSaved, onCancel }: ServiceFormProps) {
  const navigate = useNavigate()
  // The form shows the server's answer inline, so no toast as well.
  const save = useSaveServiceMutation(businessId, { showErrorToast: false })
  const form = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: 'onTouched',
    defaultValues: serviceFormValues(service, categories[0]?.id),
  })
  const [priceType, amount, maxAmount, durationMinutes] = useWatch({
    control: form.control,
    name: ['priceType', 'amount', 'maxAmount', 'durationMinutes'],
  })
  const price = previewPrice({ priceType, amount, maxAmount })
  const durationValid = Number.isInteger(durationMinutes) && durationMinutes >= 5 && durationMinutes <= 480
  const preview = [price && formatPrice(price), durationValid && formatDuration(durationMinutes)].filter(Boolean)

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({
        serviceId: service?.id,
        input: { ...values, bufferMinutes: service?.bufferMinutes ?? 0 },
      })
      // Onboarding shows the new service in its list, which says enough.
      if (onSaved) onSaved(saved)
      else {
        toast.success(service ? `Changes to ${saved.name} saved.` : `${saved.name} is on your menu.`)
        void navigate('/business/services')
      }
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="max-w-2xl space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save this service" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0 space-y-6">
        <Panel title="About the service">
          <FieldGroup>
            <FormField
              control={form.control}
              name="name"
              label="Service name"
              required
              render={({ field, controlProps }) => (
                <Input maxLength={80} placeholder="e.g. Men’s Haircut" {...field} {...controlProps} />
              )}
            />
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <ChoiceGroup
                  legend="Category"
                  options={categories.map((category) => ({ value: category.id, label: category.name }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  className="flex flex-wrap gap-2"
                  optionClassName="h-9 rounded-full px-4"
                  renderOption={(option) => option.label}
                />
              )}
            />
            <FormField
              control={form.control}
              name="description"
              label="Description"
              description="Optional. What’s included, in a sentence or two."
              render={({ field, controlProps }) => <Textarea rows={3} maxLength={500} {...field} {...controlProps} />}
            />
            <FormField
              control={form.control}
              name="requirements"
              label="What customers should know"
              description="Optional. Anything to bring or do before the appointment."
              render={({ field, controlProps }) => <Textarea rows={2} maxLength={300} {...field} {...controlProps} />}
            />
          </FieldGroup>
        </Panel>

        <Panel title="Price and time">
          <FieldGroup>
            <Controller
              control={form.control}
              name="priceType"
              render={({ field }) => (
                <ChoiceGroup
                  legend="How you price it"
                  options={priceOptions}
                  value={field.value}
                  onChange={field.onChange}
                  className="flex flex-wrap gap-2"
                  optionClassName="h-9 rounded-full px-4"
                  renderOption={(option) => option.label}
                />
              )}
            />
            {priceType === 'quote' ? (
              <p className="text-sm text-muted-foreground">
                Customers see “Price on consultation” and you agree the price at the shop.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  label={amountLabel[priceType]}
                  required
                  render={({ field, controlProps }) => (
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>₱</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput inputMode="numeric" autoComplete="off" {...field} {...controlProps} />
                    </InputGroup>
                  )}
                />
                {priceType === 'range' ? (
                  <FormField
                    control={form.control}
                    name="maxAmount"
                    label="Highest price"
                    required
                    render={({ field, controlProps }) => (
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>₱</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput inputMode="numeric" autoComplete="off" {...field} {...controlProps} />
                      </InputGroup>
                    )}
                  />
                ) : null}
              </div>
            )}
            <FormField
              control={form.control}
              name="durationMinutes"
              label="Duration"
              description="How long the appointment takes, in 5-minute steps."
              required
              render={({ field, controlProps }) => (
                <InputGroup className="sm:max-w-56">
                  <InputGroupInput
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    {...controlProps}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>mins</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              )}
            />
            <p className="text-sm" aria-live="polite">
              <span className="text-muted-foreground">Customers see: </span>
              <span className="font-medium tabular-nums">{preview.length ? preview.join(' · ') : '—'}</span>
            </p>
          </FieldGroup>
        </Panel>

        <Panel title="On your shop page">
          <FieldGroup>
            <FormField
              control={form.control}
              name="active"
              label="Show to customers"
              description="Hidden services stay on your menu here, but customers can’t see or book them."
              orientation="horizontal"
              controlPosition="end"
              render={({ field, controlProps }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  {...controlProps}
                />
              )}
            />
            <FormField
              control={form.control}
              name="featured"
              label="Mark as popular"
              description="Popular services are listed first on your shop page."
              orientation="horizontal"
              controlPosition="end"
              render={({ field, controlProps }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  {...controlProps}
                />
              )}
            />
          </FieldGroup>
        </Panel>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" shape="pill" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button asChild variant="outline" shape="pill">
            <Link to="/business/services">Cancel</Link>
          </Button>
        )}
        <Button type="submit" shape="pill" loading={form.formState.isSubmitting}>
          {service ? 'Save changes' : 'Add service'}
        </Button>
      </div>
    </form>
  )
}
