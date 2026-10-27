# Component usage guide

Recommended composition patterns for the shared components. Every component shown here is live in the gallery at `/dev/components` (development builds only).

## Principles

1. **Compose, don't configure.** Prefer slots (`Card` + `CardHeader` + `CardTitle`…) over components with many boolean props.
2. **Variants over overrides.** If you keep writing the same `className` on a component, add a `cva` variant instead.
3. **Tokens only.** `bg-success/10 text-success-emphasis`, never `bg-green-50 text-green-700`.
4. **One way to show data states.** `LoadingIndicator`/skeletons, `EmptyState`, `ErrorState`.
5. **Accessible by default.** Icon-only buttons get `aria-label`; decorative icons get `aria-hidden="true"`; status is never conveyed by colour alone.

## Page skeleton

```tsx
export default function ProjectsPage() {
  useDocumentTitle('Projects')
  return (
    <div className="space-y-8">
      {' '}
      {/* inside DashboardLayout */}
      <PageHeader
        title="Projects"
        description="Everything your team is working on."
        actions={
          <Button>
            <PlusIcon aria-hidden="true" />
            New project
          </Button>
        }
      />
      <section aria-labelledby="active-heading" className="space-y-4">
        <SectionHeader id="active-heading" title="Active" />…
      </section>
    </div>
  )
}
```

On public pages, wrap content in `<Container>` (`size`: `sm` prose · `md` · `lg` · `xl` default · `full`). Dashboard pages are already constrained by the layout.

## Button

```tsx
<Button>Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button size="icon" variant="ghost" aria-label="Settings"><SettingsIcon aria-hidden="true" /></Button>
<Button loading={mutation.isPending}>Save changes</Button>  {/* spinner + disabled + aria-busy */}
<Button fullWidth>Continue</Button>
<Button asChild><Link to="/dashboard">Open dashboard</Link></Button>  {/* navigation = a link */}
```

Variants: `default | secondary | outline | ghost | destructive | link`. Sizes: `xs | sm | default | lg | icon | icon-xs | icon-sm | icon-lg`.
Use a link (`asChild` + `<Link>`) for navigation and a button for actions.

## Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>
      <h2>Team plan</h2>
    </CardTitle>{' '}
    {/* put the real heading level inside */}
    <CardDescription>12 of 20 seats in use</CardDescription>
    <CardAction>
      <Badge variant="success">Active</Badge>
    </CardAction>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">Manage</Button>
  </CardFooter>
</Card>
```

For a titled section on a marketplace page (booking detail, Profile, Privacy & data), use **`Panel`**: `<Panel title="History">…</Panel>`. It renders an `h2` that names the region.

Marketplace screens (shop cards, booking panels) use the lighter **`card-surface`** utility instead: card colour, soft warm shadow and a hairline edge. Add the radius and padding yourself: `rounded-2xl p-4 card-surface` for list items, `rounded-3xl p-5 md:p-6 card-surface` for page panels.

## Type scale

Use the `type-*` utilities from `globals.css`, not `text-[…]` sizes: `type-display`, `type-title` (page h1), `type-heading` (section h2: 18px on phones, 20px on desktop), `type-subheading` (form sections and fieldset legends), `type-body`, `type-label`, `type-caption`, `type-meta`, `type-micro` (tab bar labels, "Soon" badges, counters), `type-eyebrow`.

## Badges and alerts

```tsx
<Badge variant="success"><CircleCheckIcon aria-hidden="true" />Active</Badge>
<Alert variant="warning">
  <TriangleAlertIcon aria-hidden="true" />
  <AlertTitle>Storage almost full</AlertTitle>
  <AlertDescription>You're using 90% of your quota.</AlertDescription>
</Alert>
```

Variants for both: `default | secondary | outline` (badge only), `success | warning | info | destructive`. Only `destructive` alerts get `role="alert"` (interrupting); pass `role="status"` for dynamic, non-urgent messages.

## Forms

Use `FormField` for every React Hook Form control. It renders the label, required marker, description and error, and returns `controlProps` with the ARIA wiring.

```tsx
<FormField control={form.control} name="email" label="Email" required description="We never share it."
  render={({ field, controlProps }) => <Input type="email" {...field} {...controlProps} />} />

{/* Select: wire value/onChange; put controlProps on the trigger */}
<FormField control={form.control} name="timezone" label="Timezone"
  render={({ field, controlProps }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
      <SelectContent>…</SelectContent>
    </Select>
  )} />

{/* Checkbox / Switch: horizontal orientation */}
<FormField control={form.control} name="acceptTerms" label="I accept the terms" orientation="horizontal"
  render={({ field, controlProps }) => (
    <Checkbox {...controlProps} ref={field.ref} checked={field.value}
      onCheckedChange={(checked) => field.onChange(checked === true)} onBlur={field.onBlur} />
  )} />
<FormField … orientation="horizontal" controlPosition="end" render={… <Switch …/>} />  {/* label left, switch right */}

{/* Dates */}
<FormField control={form.control} name="dueDate" label="Due date"
  render={({ field, controlProps }) => <DatePicker {...controlProps} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />
```

Form conventions:

- `noValidate` on `<form>` (Zod owns validation), `mode: 'onTouched'` for forgiving feedback.
- Wrap fields in `<fieldset disabled={isSubmitting}>` to lock them during submission.
- Catch submit failures and show them with `form.setError('root', …)` + `<FormError>`; don't let the promise reject unhandled.
- Edit forms: `form.reset(serverData)` when data loads and after saving, so **Reset** returns to the saved state and `isDirty` gates the buttons.
- Use `PasswordInput` (show/hide toggle) for passwords, with `autoComplete="new-password"` on sign-up and `"current-password"` on sign-in. Don't add a confirm-password field.
- `Input`, `Textarea`, `InputGroup` (and so `SearchInput`) and the default `SelectTrigger` are 40px tall on the card colour. Don't override their height per page; use `SelectTrigger size="sm"` only in dense tables.
- Put reusable field rules in `src/schemas/common.ts` (`requiredString`, `emailField`, `passwordField`, `optionalUrlField`).

## Search and filters

```tsx
const [search, setSearch] = useState('')
const debounced = useDebouncedValue(search)

<FilterBar label="Filter invoices" activeCount={activeCount} onReset={reset} end={<span>{count} results</span>}>
  <SearchInput value={search} onValueChange={setSearch} label="Search invoices" />
  <Label htmlFor={statusId} className="sr-only">Status</Label>
  <Select value={status} onValueChange={setStatus}>…</Select>
  <DatePicker value={from} onChange={setFrom} placeholder="From…" />
</FilterBar>
```

`FilterBar` is a `role="search"` landmark and shows **Reset filters** while `activeCount > 0`. Every control needs a label, visible or `sr-only`.

## DataTable

```tsx
// columns.tsx (module scope keeps the array stable)
const column = createDataTableColumnHelper<Invoice>()
export const invoiceColumns = column.columns([
  column.accessor('number', { header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" /> }),
  column.accessor('status', { header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} />, filterFn: 'equalsString' }),
  column.display({ id: 'actions', header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <RowActions invoice={row.original} /> }),
])

// component
<DataTable
  caption="Invoices"
  columns={invoiceColumns}
  data={data ?? EMPTY}                 // stable fallback, not an inline []
  isLoading={isPending}
  globalFilter={debouncedSearch}
  columnFilters={useMemo(() => (status === 'all' ? [] : [{ id: 'status', value: status }]), [status])}
  initialSorting={[{ id: 'createdAt', desc: true }]}
  renderMobileItem={(row) => <InvoiceCard invoice={row.original} />}
  emptyState={<EmptyState title="No invoices match" />}
/>
```

TanStack Table v9 is tree-shaken: register new features or filter/sort functions once in `components/shared/data-table/features.ts`. **Keep `columns`, `data` and `columnFilters` referentially stable**; a new array on each render resets pagination.

## Overlays

```tsx
{/* Destructive confirmation; waits for the promise and keeps the dialog open on failure */}
<ConfirmDialog
  trigger={<Button variant="destructive">Delete</Button>}
  destructive title="Delete project?" description="This can't be undone." confirmLabel="Delete project"
  onConfirm={() => deleteProject.mutateAsync(id)}
/>

{/* Opening a dialog from a dropdown item: control it */}
const [open, setOpen] = useState(false)
<DropdownMenuItem onSelect={() => setOpen(true)}>Delete…</DropdownMenuItem>
<ConfirmDialog open={open} onOpenChange={setOpen} … />
```

- `Dialog`: forms and focused tasks. Always include `DialogTitle` and `DialogDescription`.
- `Sheet`: side panels and mobile navigation.
- `Popover`: non-modal anchored content (date picker, notifications).
- `Tooltip`: supplementary hints only; never the only label.
- `toast.success / info / warning / error / promise`: transient confirmation. Use inline errors for form problems.

## Data states

```tsx
if (query.isPending) return <LoadingIndicator label="Loading invoices…" /> // or skeletons matching the layout
if (query.isError)
  return <ErrorState error={query.error} onRetry={() => void query.refetch()} isRetrying={query.isRefetching} />
if (query.data.length === 0)
  return <EmptyState icon={FileTextIcon} title="No invoices yet" action={<Button>Create invoice</Button>} />
```

When a state replaces the whole page (no other `<h1>`), pass `pageTitle` to `EmptyState` so its title becomes the page heading; inside a marketplace page, put a `ScreenHeader` above it instead ("Shop not found").

In the dashboard demo (`/dev/dashboard`), use **Demo state** (mock mode only) to preview all four states.

## Layouts

Layouts are route components that render `<Outlet />`; pages never import them.

| Layout                                         | Use for                                     | Provides                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PublicLayout`                                 | Customer marketplace (public + signed-in)   | Skip link, sticky header (logo, links, search, account; location + actions on mobile), mobile bottom tab bar, footer, command menu               |
| `AccountLayout`                                | Signed-in customer pages (nested in Public) | Page container, account card + vertical nav on desktop, scrollable pill nav on mobile                                                            |
| `AuthLayout`                                   | Sign-in, sign-up, verify, password reset    | Brand panel from design screen 1 (`showBrandPanel`), centred form column, theme toggle                                                           |
| `WelcomeLayout`                                | Welcome, Get started                        | Full-bleed, no app chrome (design screens 1–2); skip link and `<main>` only                                                                      |
| `DashboardLayout`                              | Shared shell, configured by an area layout  | Dark collapsible sidebar (sheet on mobile) with "Soon" badges, top bar with hamburger, breadcrumbs, search, notifications, detailed account menu |
| `MerchantLayout` / `AdminLayout` / `DevLayout` | `/business/*`, `/admin/*`, `/dev/*`         | `DashboardLayout` with that area's nav, branding and account label                                                                               |

Breadcrumbs come from `handle: { crumb: '…' }` on routes (`<Breadcrumbs minItems={2} />` hides a lone "Home"). Navigation items come from `src/config/navigation.ts`.

Marketplace building blocks:

| Component            | Use for                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScreenHeader`       | Marketplace page titles: back button + centred title on phones (design screens 6, 9, 10), left-aligned title from `md` up. Renders the page's `<h1>`.                            |
| `ChipNav`            | Pill links that switch a listing's view (sub-categories, Explore categories). Scrolls sideways on phones.                                                                        |
| `HorizontalScroller` | A row of cards that snaps sideways on phones and becomes a grid from `md` up.                                                                                                    |
| `ImageWithFallback`  | Every image slot. Lazy-loads, and shows a branded placeholder with an icon when there is no photo.                                                                               |
| `ChoiceGroup`        | Single choice from visual options (staff, days, times) on native radios, so arrow keys and screen readers work. `appearance="bare"` lets the option draw its own selected state. |
| `MockNotice`         | "Prototype · simulated" notice for operations that only touch mock data. Renders only when `VITE_USE_MOCKS` is on.                                                               |
| `SiteSearchForm`     | The marketplace search box; submits to `/explore?q=`.                                                                                                                            |
| `Breadcrumbs labels` | Replace route crumbs with loaded names, e.g. `labels={{ [shopHref(slug)]: shop.name }}`.                                                                                         |

Domain pieces live in features: `features/booking` (`BookingRequestForm`, `StaffPicker`, `DayStrip`, `TimeSlotGrid`, `PriceBreakdown`, `AppointmentFacts`, `BookingCard`, `BookingStatusBadge`, `BookingTimeline`, `BookingActions`), `features/discovery` (`CategoryGrid`, `HomeHero`, `ShopCard`, `ShopListItem`, `ExploreFilters`) and `features/shops` (`ShopHeader`, `OpenStatusText`, `ShopRating`, `ServiceRow`, `OpeningHoursList`, `ShopPolicies`, `BookingMethodNote`, `ShopLocation`, `ShareButton`). `ShopRating` renders "No reviews yet" unless real review data exists (doc §9.3).

Placeholder screens: routes registered with `planned(crumb, meta)` render `PlannedScreen`, which shows the planned title, priority, design reference, requirement IDs and the current route/query parameters. They are temporary and should disappear as screens are built.
