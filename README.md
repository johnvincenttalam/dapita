# Dapita — Beauty, Grooming & Lifestyle Marketplace (web)

_Find your place. Book your service._

Customer marketplace, merchant dashboard and admin console for a local booking marketplace launching in Davao City, Philippines. Built on a React + Vite starter template (token-based design system, shadcn/ui, typed forms, swappable data layer).

**Status:** foundation, discovery, booking journey, onboarding and account pages. Every documented route, layout, navigation element and role guard exists. Home, Explore, category, shop and service pages, the booking request flow, request-sent page, My Bookings, booking detail, Welcome, Get started, sign-in, sign-up (customer and business), email verification, forgot password, Profile and Privacy & data are built; the other screens are still **planned placeholders**. By default everything runs on in-browser **mock data** (12 fictional Davao City shops, persisted in `localStorage`). An **AdonisJS API** in [`server/`](server/README.md) serves the same demo data from a shared database with live updates, so a phone and a desktop see each other's bookings and messages as they happen (set `VITE_USE_MOCKS=false`). There are no payments. See [`docs/implementation-plan.md`](docs/implementation-plan.md) for scope, progress and open decisions.

| Area               | Routes                                                                                                                   | Layout                                 | Access                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | --------------------------- |
| Marketplace        | `/`, `/explore`, `/categories/:slug`, `/shops/:slug[/services/:id]`, `/legal/*`, `/support`, `/style-studio`, `/rentals` | PublicLayout (header, tab bar, footer) | Public                      |
| Booking flow       | `/shops/:slug/book`                                                                                                      | PublicLayout                           | Customer                    |
| Customer account   | `/bookings[/:id[/submitted\|/review]]`, `/inbox[/:id]`, `/account[/privacy]`, `/favorites`                               | PublicLayout → AccountLayout           | Customer                    |
| Onboarding & auth  | `/welcome`, `/get-started`, `/auth/sign-in\|sign-up\|forgot-password\|verify`, `/business/sign-up`                       | AuthLayout                             | Public                      |
| Merchant dashboard | `/business/*` (dashboard, bookings, calendar, messages, services, profile, settings, P1 pages)                           | MerchantLayout (DashboardLayout)       | Merchant owner/staff        |
| Admin console      | `/admin/*` (overview, merchants, categories, reports, users, logs, plans)                                                | AdminLayout (DashboardLayout)          | Admin/support               |
| Template reference | `/dev`, `/dev/components`, `/dev/forms`, `/dev/dashboard`, `/dev/settings`                                               | DevLayout (DashboardLayout)            | **Development builds only** |
| Unknown paths      | `*` inside each area                                                                                                     | The area's layout                      | —                           |

**Prototype accounts** (mock mode): on `/auth/sign-in`, use the _Customer_, _Business owner_ or _Administrator_ buttons, or `customer@example.com` / `owner@example.com` / `admin@example.com` with password `password123`. The mock session is a user id in `localStorage` (`glamspot-mock-session`). The mock database (shops, services, bookings) lives under `glamspot-mock-db` and is seeded relative to today; delete that key to reset the demo. Accounts created through sign-up, profile edits, consents and deletion requests live under `glamspot-mock-accounts`; new accounts sign in with the password chosen at sign-up.

## Technology stack

| Concern       | Choice                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| Framework     | React 19, Vite 8, TypeScript 6 (strict)                                                 |
| Styling       | Tailwind CSS 4 (`@tailwindcss/vite`), CSS-variable tokens, `tw-animate-css`             |
| Components    | shadcn/ui 4 (“Nova” style, Radix base), Lucide icons, Geist font                        |
| Class merging | `cn` (shadcn's compiled clsx + tailwind-merge replacement) + `class-variance-authority` |
| Routing       | React Router 8 (data router, lazy routes)                                               |
| Server state  | TanStack Query 5                                                                        |
| Client state  | Zustand 5 (small stores), React context (theme)                                         |
| Forms         | React Hook Form 7, Zod 4, `@hookform/resolvers` 5                                       |
| UI utilities  | Sonner (toasts), TanStack Table 9, React DayPicker 10, cmdk (command menu)              |
| Testing       | Vitest 5, React Testing Library, user-event, jest-dom, Playwright                       |
| Quality       | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y), Prettier 3                         |

ESLint stays on the maintained 9.x line because `eslint-plugin-jsx-a11y` does not support ESLint 10 yet. `@hookform/resolvers` is pinned to 5.x because 6.0.0 ships a broken optional-peer chain.

## Prerequisites

- Node.js **22 or newer** (developed on Node 24)
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; the defaults work without it
npm run dev                  # http://localhost:5173
```

## Commands

| Command                           | Purpose                                                       |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                     | Start the dev server with HMR                                 |
| `npm run build`                   | Type-check (`tsc -b`) and build to `dist/`                    |
| `npm run preview`                 | Serve the production build locally                            |
| `npm run typecheck`               | Type-check app, config and e2e projects                       |
| `npm run lint` / `lint:fix`       | ESLint (type-aware, accessibility rules)                      |
| `npm run format` / `format:check` | Prettier (sorts Tailwind classes)                             |
| `npm test`                        | Unit and component tests (Vitest, single run)                 |
| `npm run test:watch`              | Vitest in watch mode                                          |
| `npm run test:e2e:install`        | One-time download of Playwright's Chromium                    |
| `npm run test:e2e`                | Build, serve and run Playwright (desktop and mobile)          |
| `npm run check`                   | typecheck + lint + format check + unit tests (run before PRs) |

To run end-to-end tests with an installed browser instead of downloading Chromium:
`PW_BROWSER_CHANNEL=chrome npm run test:e2e` (PowerShell: `$env:PW_BROWSER_CHANNEL='chrome'; npm run test:e2e`).

## Folder structure

```
src/
├── app/                 Composition root: <App>, providers, ThemeProvider, router and route table
├── assets/              Static assets imported from code
├── components/
│   ├── ui/              shadcn/ui primitives (generated, then owned; customizations are marked)
│   ├── shared/          App-level building blocks: Container, PageHeader, SectionHeader,
│   │   │                Breadcrumbs, SearchInput, FilterBar, DatePicker, ConfirmDialog,
│   │   │                CommandMenu, ThemeToggle, Logo
│   │   └── data-table/  DataTable, column header, pagination, TanStack feature registry
│   ├── feedback/        LoadingIndicator, EmptyState, ErrorState, RouteErrorBoundary, NavigationProgress
│   ├── forms/           FormField (RHF ↔ label/description/error wiring), FormError
│   └── layouts/         RootLayout, PublicLayout (+ Navbar, BottomTabBar, Footer), AccountLayout,
│                        AuthLayout, DashboardLayout (+ AppSidebar) configured by MerchantLayout,
│                        AdminLayout and DevLayout; UserMenu, NotificationsMenu, AppCommandMenu
├── config/              Navigation, theme options, launch market, category icons and booking rule assumptions
├── features/            Domain code, one folder per feature
│   ├── auth/            Session queries and the RequireRole guard
│   ├── discovery/       Categories, search and listing cards (home, explore, category pages)
│   ├── shops/           Public shop profile pieces: status, rating, services, hours, policies
│   ├── dashboard/       Template demo: api/ (query hooks), components/, constants
│   ├── settings/        api/, components/
│   └── example/         Forms playground and component-gallery demos
├── hooks/               Generic hooks (useTheme, useDebouncedValue, useDocumentTitle, useIsMobile)
├── lib/                 Framework-agnostic utilities: cn, env, api-client, query-client, theme, format,
│                        datetime (Asia/Manila), opening-hours, booking-status (state machine), geo, roles
├── routes/              One file per page; pages only compose features and layout pieces
├── schemas/             Zod schemas: booking, service, business, message, moderation, auth, common fields
├── services/            Data access. Each service has an HTTP and a mock implementation
│   └── mock/            localStorage mock database (db.ts), seed data (seed/), accounts, helpers
├── stores/              Zustand stores (UI preferences, demo scenario)
├── styles/globals.css   Design tokens, type scale, base styles
├── test/                Vitest setup and render helpers
├── types/               Shared TypeScript types: catalog, business, booking, auth, API, router handle
└── main.tsx             Entry point
e2e/                     Playwright specs
docs/COMPONENTS.md       Component usage guide
```

**Dependency direction:** `routes → features → components/shared → components/ui`. Shared components never import from `features/`. One deliberate exception: the app shells in `components/layouts` read the session through `features/auth` (`useSession`), because the header, menus and guards depend on who is signed in. A feature may import another feature's component when two features genuinely share UI (e.g. `ProfileFields` is used by Settings and the Forms playground); if that grows, promote the component to `components/`.

## Design tokens

All tokens live in [`src/styles/globals.css`](src/styles/globals.css).

- **Colours** are semantic CSS variables in OKLCH, defined for `:root` (light) and `.dark`, and mapped to Tailwind with `@theme inline`. Use `bg-primary`, `text-muted-foreground`, `border-border`, never raw hex values.
  - Surfaces: `background`, `card`, `popover`, `muted`, `accent`, `secondary`, `sidebar-*`
  - Brand: `primary` / `primary-foreground`, `ring`
  - Status: `destructive`, `success`, `warning`, `info`, each with `-foreground` (text on a solid fill) and, for the last three, `-emphasis` (accessible text on a tinted fill).
- **Type scale** is a set of `type-*` utilities: `type-display`, `type-title` (page h1), `type-heading` (h2), `type-subheading` (h3), `type-lead`, `type-body`, `type-label`, `type-caption`, `type-meta`, `type-eyebrow`. They're named `type-*` rather than `text-*` so `cn()` never mistakes them for text colours and drops one.
- **Radius** is driven by one `--radius`; `rounded-sm` … `rounded-4xl` derive from it.
- **Spacing** uses Tailwind's 4px scale plus named layout tokens: `py-section`, `h-header`.
- **Shadows**: `shadow-xs` … `shadow-lg`, tinted to work in both themes.
- **Breakpoints**: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 (declared explicitly).
- **Motion** respects `prefers-reduced-motion` globally.

To rebrand, change `--primary`, `--ring`, `--chart-*` and `--sidebar-primary` in both themes, and the font imports at the top of the file.

**Dapita palette** ("Natural & Modern" from the brand board): green `primary` (#1B5E3F), peach `secondary`/`accent` (#F7D5C6), pink `brand-accent` (#F1718D) for the logo mark and highlights, `brand-deep` for banner gradients, warm off-white `background` (#FAF7F4), #2D2D2D text, dark green-charcoal `sidebar` with a pink active item (in the light theme too), `rating` for stars, `--radius: 0.75rem`. `font-display` (Playfair Display) is for the wordmark and hero headlines only; UI text stays Geist. Extra layout tokens: `py-page` (page padding inside a layout) and `h-tabbar`/`pb-tabbar` (mobile bottom tab bar). `Button` adds `size="xl"` and `shape="pill"` for the design's CTAs. The dark theme is derived (no dark design exists).

### Theming

`ThemeProvider` (`src/app/theme-provider.tsx`) stores `light | dark | system` in `localStorage` (`starter-theme`) and toggles `.dark` on `<html>`. An inline script in `index.html` applies the saved theme before first paint so there's no flash. Read or change the theme with `useTheme()`. Adding `light` or `dark` as a class to any element scopes that theme to its subtree (see the gallery's theme previews).

### Design tweaks panel (temporary)

While the design is being decided, a floating **Design tweaks** tab on the left edge lets you try token changes live on any screen:

- brand hue, primary strength and lightness;
- background tint and lightness, per theme;
- corner radius and the display font;
- contrast checks against WCAG AA.

- **Where it appears:** always in `npm run dev`; in a build only with `VITE_DESIGN_TWEAKS=true` (e.g. a stakeholder preview). Production builds don't contain its code.
- **How it works:** it only overrides the CSS variables from `globals.css`; components are untouched. Choices are saved in that browser only (`glamspot-design-tweaks`).
- **To keep a choice:** **Copy CSS** and paste the output into `src/styles/globals.css`. The display font goes into `--font-display` in the `@theme inline` block.
- **To remove it after sign-off:** delete `src/features/design-tweaks/`, the `DesignTweaks` lines in `src/app/App.tsx`, `VITE_DESIGN_TWEAKS` in `src/vite-env.d.ts` and `.env.example`, and this section.

## How to…

### Create a shared component

1. Check whether shadcn/ui already has it: `npx shadcn@latest add <name>`.
2. If you need app-specific behaviour on top, create `src/components/shared/MyThing.tsx` that **composes** the primitive. Don't copy it.
3. Type props with an exported interface. Use `cva` for visual variants instead of boolean style props. Accept `className` and merge it with `cn()`.
4. Use only token utilities. Give icon-only buttons an `aria-label` and mark decorative icons `aria-hidden`.
5. Add a specimen to the gallery (`src/features/example/components/gallery/`) and a test next to the component.

### Create a feature module

```
src/features/invoices/
├── api/queries.ts          # query keys + useInvoicesQuery / useCreateInvoiceMutation
├── components/             # InvoiceTable, InvoiceForm…
└── constants.ts            # option lists, labels
```

Put the service in `src/services/invoices.service.ts` (HTTP + mock implementations), Zod schemas in `src/schemas/` if they are shared (otherwise in the feature), and domain types in `src/types/`.

### Add a route

1. Create `src/routes/InvoicesPage.tsx` with a **default export**. Call `useDocumentTitle('Invoices')` and render one `<PageHeader>` (the page's only `<h1>`). Marketplace pages wrap themselves in `<Container className="py-page">`; dashboard, account and auth layouts already provide the page column.
2. Register it in `src/app/routes.tsx` in the right area array (`marketplaceRoutes`, `authRoutes`, `merchantRoutes`, `adminRoutes`):
   ```ts
   { path: 'invoices', handle: { crumb: 'Invoices' }, lazy: page(() => import('@/routes/InvoicesPage')) }
   ```
   Most documented routes are currently `...planned(crumb, meta)` placeholders: replace that spread with `handle` + `lazy` when you build the screen.
3. Add it to `src/config/navigation.ts` to make it appear in the header, tab bar or sidebar **and** the command menu. Items with `priority: 'P1' | 'P2'` render a "Soon" badge.

### Protect a route

Wrap routes in a pathless guard: `{ element: <RequireRole roles={roleGroups.merchant} audience="merchants" />, children: [...] }`. Guests are redirected to `/auth/sign-in?next=…` (only same-origin paths are honoured, see `getSafeRedirect`); signed-in users without the role see an access-denied state. Use `variant="inline"` when the guard sits inside an existing layout. Guards only control navigation; the API must authorize every request.

### Errors, loading and not-found

The root route has a full-screen `RouteErrorBoundary` and `AppLoading` hydrate fallback; `NavigationProgress` shows a top bar while lazy chunks load. Inside each area, `withinLayout()` adds `InlineRouteErrorBoundary` and a `*` not-found route, so errors and unknown paths render inside the layout with its navigation intact.

### Add a form with Zod validation

```tsx
// src/schemas/invoice.ts
export const invoiceSchema = z.object({
  customer: requiredString('Customer'),
  amount: z.number({ error: 'Enter an amount' }).positive('Amount must be positive'),
})
export type InvoiceInput = z.infer<typeof invoiceSchema>

// Component
const form = useForm<InvoiceInput>({ resolver: zodResolver(invoiceSchema), mode: 'onTouched', defaultValues: { customer: '' } })
const onSubmit = form.handleSubmit(async (values) => {
  try {
    await createInvoice.mutateAsync(values)
  } catch (error) {
    form.setError('root', { message: getErrorMessage(error) })
  }
})

<form onSubmit={(e) => void onSubmit(e)} noValidate>
  <FormError message={form.formState.errors.root?.message} />
  <fieldset disabled={form.formState.isSubmitting}>
    <FormField control={form.control} name="customer" label="Customer" required
      render={({ field, controlProps }) => <Input {...field} {...controlProps} />} />
  </fieldset>
  <Button type="submit" loading={form.formState.isSubmitting}>Create</Button>
</form>
```

`FormField` wires `id`, `aria-invalid`, `aria-describedby` and `aria-required` for you; always spread `controlProps` onto the control.

### Connect an API with TanStack Query

1. Set `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL` in `.env.local`.
2. Implement the HTTP half of the service with the typed client:
   ```ts
   const httpInvoiceService = { list: () => apiClient.get<Invoice[]>('/invoices') }
   export const invoiceService = env.useMocks ? mockInvoiceService : httpInvoiceService
   ```
3. Wrap it in hooks with stable keys:
   ```ts
   export const invoiceKeys = { all: ['invoices'] as const }
   export const useInvoicesQuery = () => useQuery({ queryKey: invoiceKeys.all, queryFn: invoiceService.list })
   ```
4. Render `isPending` → skeleton or `<LoadingIndicator>`, `isError` → `<ErrorState error={error} onRetry={refetch} />`, empty → `<EmptyState>`.

`apiClient` throws `ApiError` (with `status`, `code`, `details`) for non-2xx responses. The shared `QueryClient` skips retries on 4xx, toasts background-refetch failures, and turns `meta: { successMessage }` on a mutation into a success toast (`showErrorToast: false` opts out of the error toast when the form shows it inline). Authentication should use httpOnly cookies set by your backend (the client sends `credentials: 'include'`); never store secrets in frontend code.

### Add or customize shadcn/ui components

```bash
npx shadcn@latest add accordion       # adds src/components/ui/accordion.tsx
```

Configuration is in `components.json` (style `radix-nova`, base colour neutral, CSS variables on). Generated files are yours to edit. Edits made in this template are marked with `// Customized:` so you can re-apply them if you regenerate a component with `--overwrite`:

- `button.tsx`: `loading` and `fullWidth` props
- `badge.tsx`, `alert.tsx`: `success`, `warning`, `info` variants; non-destructive alerts don't use `role="alert"`
- `sonner.tsx`: uses the app's `useTheme` instead of `next-themes`
- `hooks/use-mobile.ts`: `useSyncExternalStore` instead of `setState` inside an effect

## Environment variables

See [`.env.example`](.env.example). Only `VITE_*` variables reach the browser, and **everything in them is public** after a build.

| Variable             | Default  | Purpose                                                   |
| -------------------- | -------- | --------------------------------------------------------- |
| `VITE_APP_NAME`      | `Dapita` | Logo text, document titles (brand name)                   |
| `VITE_API_BASE_URL`  | `/api`   | Base URL for `apiClient`                                  |
| `VITE_USE_MOCKS`     | `true`   | `false` switches services to the API in `server/`         |
| `VITE_DESIGN_TWEAKS` | unset    | TEMPORARY: `true` adds the design tweaks panel to a build |

## State management rules

- **Local UI state** → `useState` in the component.
- **App-wide UI concerns** → React context (`ThemeProvider`).
- **Server data** → TanStack Query. Never copy query data into Zustand.
- **Shared client state** that crosses routes/components → a small, typed Zustand store (`stores/ui-store.ts` persists table density and holds the command-menu flag; `stores/demo-store.ts` drives mock scenarios).

## Accessibility

Skip link and `main` landmark on every layout, one `h1` per page, labelled navigation landmarks, visible focus rings, Radix-managed focus for dialogs and menus, `aria-sort` on sortable headers, status shown with icon + text (never colour alone), a card list instead of the table on small screens, and global reduced-motion support. `eslint-plugin-jsx-a11y` runs in `npm run lint`. The two inline `eslint-disable` comments in generated shadcn files are documented false positives.

## Known limitations and extension points

- **Backend covers every built screen.** `server/` serves auth, discovery, bookings, messaging, the customer account (profile, consents, deletion requests), the merchant dashboard (listing, services, notification settings) and the admin console (moderation, featured listings, categories, support cases, account suspension); see `server/README.md`. In mock mode, sign-in uses mock accounts (session kept in `localStorage`). Route guards are components (`RequireRole`), which work with any query client; switch to redirecting `loader`s if you need guards before lazy chunks download.
- **Mock data.** Marketplace services (`catalog`, `shops`, `bookings`) use a `localStorage` database that enforces the booking state machine, role scoping and idempotent submits, like the documented backend should. The template demo services under `/dev` are still in memory.
- **DataTable is client-side.** For large datasets, switch to `manualPagination/manualSorting/manualFiltering` and pass server state (see TanStack Table's `client-vs-server` guide).
- **No i18n.** Copy is inline English; `Intl` is used for dates, so adding a library like `react-i18next` is straightforward.
- **No charts.** Add shadcn's `chart` component (Recharts) when you have real metrics; `--chart-1…5` tokens are ready.
- The `shadcn` package is a runtime dependency because `globals.css` imports `shadcn/tailwind.css` from it; this is the official v4 setup.
