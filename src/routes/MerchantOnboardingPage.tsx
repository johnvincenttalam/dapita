import { CheckIcon, CircleIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ErrorState } from '@/components/feedback/ErrorState'
import { FormError } from '@/components/forms/FormError'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useBusinessProfileQuery, useSubmitForReviewMutation } from '@/features/merchant/api/business-queries'
import { useServiceMenuQuery } from '@/features/merchant/api/service-queries'
import { BusinessDetailsForm } from '@/features/merchant/components/profile/BusinessDetailsForm'
import { OpeningHoursForm } from '@/features/merchant/components/profile/OpeningHoursForm'
import { PoliciesForm } from '@/features/merchant/components/profile/PoliciesForm'
import { ServiceForm } from '@/features/merchant/components/ServiceForm'
import { SuggestionChips } from '@/features/merchant/components/SuggestionChips'
import { suggestServices } from '@/features/merchant/setup-suggestions'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import { formatDuration, formatPrice } from '@/lib/format'
import { listingChecklist, type ChecklistItem, type OnboardingStep } from '@/lib/listing-checklist'
import { cn } from '@/lib/utils'
import type { BusinessProfile } from '@/services/merchant-business.service'
import type { ServiceMenu } from '@/services/merchant-services.service'

type Step = OnboardingStep | 'review'

const steps: { value: Step; label: string }[] = [
  { value: 'details', label: 'Details' },
  { value: 'hours', label: 'Hours' },
  { value: 'services', label: 'Services' },
  { value: 'policies', label: 'Booking rules' },
  { value: 'review', label: 'Review' },
]

const stepHref = (step: Step) => (step === 'details' ? '/business/onboarding' : `/business/onboarding?step=${step}`)

function StepNav({ current, items }: { current: Step; items: ChecklistItem[] }) {
  return (
    <nav aria-label="Setup steps">
      <ol className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const done = items.find((item) => item.step === step.value)?.done ?? false
          const active = step.value === current
          return (
            <li key={step.value} className="shrink-0">
              <Link
                to={stepHref(step.value)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-medium ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-border hover:bg-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                    active ? 'bg-primary-foreground/20' : done ? 'bg-accent text-accent-foreground' : 'bg-muted',
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                {step.label}
                {done ? <span className="sr-only">, done</span> : null}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ServicesStep({
  profile,
  menu,
  onContinue,
}: {
  profile: BusinessProfile
  menu: ServiceMenu
  onContinue: () => void
}) {
  const [adding, setAdding] = useState(menu.services.length === 0)
  // The suggestion the open form started from; a new pick restarts the form with it.
  const [picked, setPicked] = useState<ReturnType<typeof suggestServices>[number]>()
  const { services, categories } = menu
  const suggestions = suggestServices(
    categories,
    services.map((service) => service.name),
  ).slice(0, 8)
  const close = () => {
    setAdding(false)
    setPicked(undefined)
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Services"
        description="Add what customers can book, with prices as on your price list. Start with your main services; you can add more later."
      >
        {services.length ? (
          <ul aria-label="Your services" className="-mx-2 divide-y divide-border/70">
            {services.map((service) => (
              <li key={service.id} className="flex items-baseline justify-between gap-3 px-2 py-2.5">
                <span className={cn('min-w-0 truncate font-medium', !service.active && 'text-muted-foreground')}>
                  {service.name}
                  {service.active ? null : <span className="ml-2 text-xs font-normal">Hidden</span>}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        )}
        {categories.length === 0 ? (
          <p className="text-sm">
            Choose your business categories first, so services have somewhere to go.{' '}
            <Link to={stepHref('details')} className="font-medium underline underline-offset-4">
              Go to details
            </Link>
          </p>
        ) : (
          <>
            <SuggestionChips
              label="Common services for your shop. Tap one, then add your price."
              items={suggestions}
              itemLabel={(suggestion) => suggestion.name}
              onPick={(suggestion) => {
                setPicked(suggestion)
                setAdding(true)
              }}
            />
            {adding ? null : (
              <Button variant="outline" shape="pill" onClick={() => setAdding(true)}>
                <PlusIcon aria-hidden="true" />
                Add a service
              </Button>
            )}
          </>
        )}
      </Panel>

      {adding && categories.length ? (
        <ServiceForm
          key={picked ? `${picked.categoryId}:${picked.name}` : 'blank'}
          businessId={profile.business.id}
          categories={categories}
          suggestion={picked}
          simple
          onSaved={close}
          onCancel={services.length ? close : undefined}
        />
      ) : null}

      {!adding || categories.length === 0 ? (
        <div className="flex justify-end">
          <Button shape="pill" onClick={onContinue}>
            Continue
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ReviewStep({ profile, items, ready }: { profile: BusinessProfile; items: ChecklistItem[]; ready: boolean }) {
  const submit = useSubmitForReviewMutation(profile.business.id)

  return (
    <Panel
      title="Ready to submit?"
      description="Dapita checks every new listing before customers can see it. You can keep editing while it’s reviewed."
    >
      <FormError message={submit.isError ? getErrorMessage(submit.error) : undefined} title="We couldn’t submit it" />
      <ul className="-mx-2 divide-y divide-border/70">
        {items.map((item) => (
          <li key={item.step} className="flex items-start gap-3 px-2 py-3">
            {item.done ? (
              <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <CircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {item.label}
                <span className="sr-only">{item.done ? ', done' : ', not done'}</span>
              </span>
              {item.missing ? <span className="block text-sm text-muted-foreground">{item.missing}</span> : null}
            </span>
            {item.done ? null : (
              <Link
                to={stepHref(item.step)}
                className="shrink-0 text-sm font-medium underline underline-offset-4"
                aria-label={`Fix ${item.label.toLowerCase()}`}
              >
                Fix
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end border-t border-border/70 pt-4">
        <Button
          shape="pill"
          disabled={!ready}
          loading={submit.isPending}
          onClick={() =>
            submit.mutate(undefined, {
              onSuccess: () => toast.success('Listing submitted. We’ll let you know when it’s live.'),
            })
          }
        >
          Submit for review
        </Button>
      </div>
    </Panel>
  )
}

function StatusScreen({ profile }: { profile: BusinessProfile }) {
  const { business } = profile
  const screen =
    business.status === 'approved'
      ? {
          title: 'Your listing is live',
          text: 'Customers can find and book you. Edit your details any time from Business profile and Services.',
          actions: [
            { to: `/shops/${encodeURIComponent(business.slug)}`, label: 'View shop page', primary: true },
            { to: '/business', label: 'Go to dashboard' },
          ],
        }
      : business.status === 'pending_review'
        ? {
            title: 'Your listing is waiting for review',
            text: 'Dapita checks every new listing before customers can see it. Meanwhile you can still change your details, hours and services.',
            actions: [
              { to: '/business/profile', label: 'Business profile' },
              { to: '/business/services', label: 'Services' },
            ],
          }
        : {
            title: 'Your listing isn’t available',
            text: 'It can’t be changed or submitted right now. Our support team can tell you why.',
            actions: [{ to: '/support', label: 'Contact support' }],
          }

  return (
    <Panel title={screen.title} description={screen.text}>
      <div className="flex flex-wrap gap-2">
        {screen.actions.map((action) => (
          <Button key={action.to} asChild variant={'primary' in action ? 'default' : 'outline'} shape="pill">
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </Panel>
  )
}

/**
 * Listing setup for a new shop (MER-01, plan §8 #5): details, hours, services and policies,
 * then submit for review. Each step saves on its own, so leaving halfway loses nothing.
 */
export default function MerchantOnboardingPage() {
  useDocumentTitle('Set up your listing')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('step')
  const step: Step = steps.some((item) => item.value === requested) ? (requested as Step) : 'details'
  const businessId = useCurrentBusinessId()
  const profile = useBusinessProfileQuery(businessId)
  const menu = useServiceMenuQuery(businessId)
  const go = (next: Step) => void navigate(stepHref(next))

  const editable = profile.data?.business.status === 'draft' || profile.data?.business.status === 'changes_requested'

  return (
    <div className="space-y-6">
      <PageHeader title="Set up your listing" description="Tell customers what you offer and when you’re open." />
      {profile.isError || menu.isError ? (
        <ErrorState
          error={profile.error ?? menu.error}
          onRetry={() => void Promise.all([profile.refetch(), menu.refetch()])}
        />
      ) : !profile.data || !menu.data ? (
        <Skeleton aria-hidden="true" className="h-96 max-w-2xl rounded-3xl" />
      ) : !editable ? (
        <div className="max-w-2xl">
          <StatusScreen profile={profile.data} />
        </div>
      ) : (
        <Wizard profile={profile.data} menu={menu.data} step={step} go={go} />
      )}
    </div>
  )
}

function Wizard({
  profile,
  menu,
  step,
  go,
}: {
  profile: BusinessProfile
  menu: ServiceMenu
  step: Step
  go: (step: Step) => void
}) {
  const { items, ready } = listingChecklist(profile.business, menu.services)
  return (
    <div className="max-w-2xl space-y-6">
      <StepNav current={step} items={items} />
      {profile.business.status === 'changes_requested' ? (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm">
          Dapita asked for changes to your listing
          {profile.business.moderationNote ? `: “${profile.business.moderationNote}”` : '.'} Update it, then submit it
          again.
        </p>
      ) : null}
      {step === 'details' ? (
        <BusinessDetailsForm profile={profile} submitLabel="Save and continue" onSaved={() => go('hours')} />
      ) : step === 'hours' ? (
        <OpeningHoursForm business={profile.business} submitLabel="Save and continue" onSaved={() => go('services')} />
      ) : step === 'services' ? (
        <ServicesStep profile={profile} menu={menu} onContinue={() => go('policies')} />
      ) : step === 'policies' ? (
        <PoliciesForm business={profile.business} submitLabel="Save and continue" onSaved={() => go('review')} />
      ) : (
        <ReviewStep profile={profile} items={items} ready={ready} />
      )}
    </div>
  )
}
