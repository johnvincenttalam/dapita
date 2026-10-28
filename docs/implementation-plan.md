# Implementation Plan — Beauty, Grooming & Lifestyle Marketplace ("Dapita", formerly "GlamSpot")

Living plan. Phase 1 (discovery), Phase 2 (application foundation and shared layouts), Phase 3 (domain core and discovery screens, plan steps 2 and 4) the customer marketplace phase (booking journey, plan step 6) Phase 4 (UI fidelity and quality audit, `docs/ui-audit.md`) and plan step 5 (onboarding, auth and account pages) are complete. Progress is tracked in §13.

| Item            | Value                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Business source | `Beauty_Grooming_Lifestyle_Marketplace_Project_Documentation.docx` (v1.0, 21 Oct 2026)         |
| Visual source   | `GlamSpot Beauty Booking App Showcase.png` (12 screens, 1536×1024 composite)                   |
| Codebase        | This repository: React 19 + Vite 8 + TS 6 starter (`react-vite-starter@0.1.0`)                 |
| Baseline health | `npm run check` passes: typecheck, lint, Prettier, Vitest (7 files, 39 tests) — 21 Oct 2026    |
| Precedence      | Documentation wins on business rules; the image wins on visual design; conflicts listed in §11 |

Priority labels follow the documentation: **P0** = MVP pilot, **P1** = after core booking is proven, **P2** = later.

---

## 0. Current repository assessment

### 0.1 What exists and will be reused as-is

| Area            | Current state                                                                                                                                                 | Verdict                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Build & scripts | `dev`, `build` (`tsc -b && vite build`), `typecheck`, `lint`, `format`, `test`, `test:e2e`, `check`                                                           | Keep unchanged                                       |
| TypeScript      | `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `@/*` alias                                                                                       | Keep unchanged                                       |
| Lint / format   | ESLint 9 flat config (type-aware, react-hooks, jsx-a11y), Prettier + Tailwind plugin                                                                          | Keep unchanged                                       |
| Routing         | React Router 8 data router, lazy pages/layouts, `handle.crumb` breadcrumbs (`src/app/routes.tsx`)                                                             | Extend with new route tree                           |
| Providers       | `ThemeProvider → QueryClientProvider → TooltipProvider + Toaster` (`src/app/providers.tsx`)                                                                   | Keep; add a session provider/loader only if needed   |
| Server state    | TanStack Query with 4xx no-retry, background-error toast, `meta.successMessage` (`src/lib/query-client.ts`)                                                   | Keep unchanged                                       |
| API client      | Typed `fetch` wrapper, `ApiError`, `credentials: 'include'` (`src/lib/api-client.ts`)                                                                         | Keep; add multipart upload helper later (AI, photos) |
| Service pattern | Each service has HTTP + mock implementation switched by `VITE_USE_MOCKS` (`src/services/*.service.ts`)                                                        | Follow for every new domain service                  |
| Client state    | Zustand: `ui-store` (persisted prefs), `demo-store` (mock scenarios)                                                                                          | Reuse pattern for session + booking draft            |
| Forms           | RHF + Zod + `FormField` (ARIA wiring) + `FormError`; shared rules in `src/schemas/common.ts`                                                                  | Reuse for every form                                 |
| Layouts         | `RootLayout`, `PublicLayout` (navbar + mobile sheet), `AuthLayout` (split brand panel), `DashboardLayout` (collapsible sidebar, breadcrumbs, bell, user menu) | Reuse; parametrize dashboard nav (see §4.3)          |
| Feedback        | `LoadingIndicator`, `EmptyState`, `ErrorState`, `RouteErrorBoundary`, `NavigationProgress`                                                                    | Reuse everywhere                                     |
| Tests           | Vitest + RTL + user-event + jest-dom, `renderWithProviders`; Playwright desktop + Pixel 7 projects with a no-horizontal-overflow helper                       | Extend                                               |
| Docs            | `README.md`, `docs/COMPONENTS.md`                                                                                                                             | Update as conventions change                         |

### 0.2 What is template/demo code and should be retired (later, not in Phase 1)

- Routes `/`, `/components`, `/forms`, `/dashboard`, `/settings` and their pages are demonstrations.
- `src/features/example`, `src/features/dashboard`, `src/features/settings`, `src/types/domain.ts` (`Customer`, `Metric`…), `src/services/dashboard.service.ts`, `src/services/mock/data.ts`.
- `src/schemas/auth.ts` `registrationSchema` has demo-only fields (`role: developer|designer…`, min age 16).
- Recommendation: keep `/components` as an internal gallery (dev-only route) because it doubles as a visual regression page for new shared components; remove the other demo routes once their replacements exist.

### 0.3 Environment notes

- The workspace is **not a git repository** (`git log` fails) even though tooling reported one. Run `git init` and commit the pristine template before Phase 2 so every change is reviewable and reversible.
- `dist/` and `test-results/` are build artefacts already git-ignored.
- `writing-block.md` is the prompt that generated this template; it is not product documentation.

---

## 1. Product overview and user roles

### 1.1 Product

A local discovery and booking marketplace for **Davao City, Philippines**: barbershops, salons, nails, spas/massage, makeup, skin care, brows & lashes, wellness, and (later) gown/dress rental. Customers find nearby providers, compare services and prices, message them and request appointments. Merchants manage their listing, services, hours, booking requests and messages through a web dashboard. An **AI Style Studio** (hairstyle / hair-colour preview) is a P1 experiment that must link previews to real local services.

Core principles that constrain the UI (doc §2.2, §7.3, §9.3):

1. **Booking clarity** — a pending request is never shown as a confirmed appointment.
2. **No fabricated data** — never invent ratings, verification badges, availability, prices or distances. Missing data is labelled "not available".
3. **Local-first, request-to-confirm by default** — live slot booking only for merchants who maintain a calendar (P1).
4. **Privacy by design** — location permission optional; AI photo consent, deletion and retention explained up front.
5. **Responsive web first** — no native apps; customer screens must work from 320 px to desktop.

### 1.2 Roles

| Role             | Access in the frontend                                                                                          | Priority |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| Guest            | Browse home, categories, search, map, shop profiles, services. Prompted to sign in to book, save or message.    | P0       |
| Customer         | Profile, bookings, inbox, consent/privacy, account-deletion request; favourites and reviews (P1).               | P0       |
| Merchant owner   | `/business/*`: listing, services, hours, policies, bookings, messages, settings; staff, insights, billing (P1). | P0       |
| Merchant staff   | `/business/*` restricted to assigned schedule and permitted booking details; no billing/ownership controls.     | P1       |
| Administrator    | `/admin/*`: merchant approval, taxonomy, reports/support cases, notification-failure logs, plans (P1).          | P0       |
| Support operator | Subset of `/admin/*` with least privilege; no unrestricted access to sensitive content.                         | P1       |

All authorization is enforced server-side; the frontend only routes and hides (doc §13.1).

---

## 2. Page inventory and route map

Legend — **Design**: number of the matching screen in the showcase image, or `—` when no design exists (see §11.3).

### 2.1 Customer marketplace — new `CustomerLayout`

| Route                                  | Page                                                                 | Design            | Priority | Auth     | Doc refs               |
| -------------------------------------- | -------------------------------------------------------------------- | ----------------- | -------- | -------- | ---------------------- |
| `/`                                    | Home / discovery                                                     | 3                 | P0       | Public   | CUS-01, §9.1           |
| `/explore`                             | Search results, list ⇄ map toggle, filters                           | 4 (map)           | P0       | Public   | CUS-02/03/04           |
| `/categories/:categorySlug`            | Category listing with sub-filters                                    | 10 (and 9 layout) | P0       | Public   | CUS-01/02              |
| `/shops/:shopSlug`                     | Shop details (tabs: Overview, Services, Staff, Reviews)              | 5                 | P0       | Public   | CUS-05                 |
| `/shops/:shopSlug/services/:serviceId` | Service detail                                                       | —                 | P0       | Public   | §9.1 Service detail    |
| `/shops/:shopSlug/book`                | Book appointment (`?service=` `&staff=`)                             | 6                 | P0       | Customer | BKG-01/05/06           |
| `/bookings/:bookingId/submitted`       | Request sent / Booking confirmed                                     | 7                 | P0       | Customer | BKG-01, §7.3           |
| `/bookings`                            | My bookings (Upcoming · Past · Cancelled)                            | 11                | P0       | Customer | CUS-08                 |
| `/bookings/:bookingId`                 | Booking detail + status timeline + respond to alternative time       | —                 | P0       | Customer | BKG-03/06/08           |
| `/inbox`                               | Conversations list                                                   | —                 | P0       | Customer | §9.1 Messages          |
| `/inbox/:conversationId`               | Conversation thread                                                  | —                 | P0       | Customer | MER-05 (customer side) |
| `/account`                             | Profile, notification & privacy prefs                                | —                 | P0       | Customer | CUS-06                 |
| `/account/privacy`                     | Consents, data request, account deletion                             | —                 | P0       | Customer | CUS-06, §13.2          |
| `/favorites`                           | Saved shops                                                          | —                 | P1       | Customer | CUS-07                 |
| `/bookings/:bookingId/review`          | Write review (completed bookings only)                               | —                 | P1       | Customer | CUS-09                 |
| `/style-studio`                        | AI Hairstyle Try-On (consent → upload → style → preview → providers) | 8                 | P1       | Customer | AI-01…07               |
| `/rentals`, `/rentals/:itemId`         | Gowns & Dresses                                                      | 9                 | P2       | Public   | §5.3 (feature-flagged) |

### 2.2 Onboarding and auth — `AuthLayout` (rebranded) plus a full-bleed welcome layout

| Route                   | Page                                                    | Design | Priority |
| ----------------------- | ------------------------------------------------------- | ------ | -------- |
| `/welcome`              | Splash / welcome ("Get Started", "Sign In")             | 1      | P0       |
| `/get-started`          | Choose account type (Customer / Business owner, "Skip") | 2      | P0       |
| `/auth/sign-in`         | Sign in (existing page, re-skinned and re-wired)        | —      | P0       |
| `/auth/sign-up`         | Customer sign-up                                        | —      | P0       |
| `/auth/forgot-password` | Account recovery request                                | —      | P0       |
| `/business/sign-up`     | Merchant account creation                               | —      | P0       |
| `/auth/verify`          | Verify email/contact                                    | —      | P0       |

### 2.3 Merchant dashboard — `DashboardLayout` with merchant nav (dark sidebar)

| Route                           | Page                                                                                          | Design                   | Priority                 |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ |
| `/business`                     | Overview: KPIs, today's bookings, recent messages                                             | 12                       | P0 (KPIs P1)             |
| `/business/onboarding`          | Multi-step listing setup → submit for review                                                  | —                        | P0                       |
| `/business/bookings`            | Booking requests & appointments (table/cards, filters)                                        | — (12 table style)       | P0                       |
| `/business/bookings/:bookingId` | Accept / decline / propose time / complete / no-show                                          | —                        | P0 (complete/no-show P1) |
| `/business/calendar`            | Day/week schedule view                                                                        | —                        | P0                       |
| `/business/messages[/:id]`      | Inquiry inbox and reply                                                                       | — (12 "Recent Messages") | P0                       |
| `/business/services`            | Service catalogue CRUD (price type, duration, photos)                                         | —                        | P0                       |
| `/business/profile`             | Public listing: details, photos, location, hours, closures, policies, booking method, preview | —                        | P0                       |
| `/business/settings`            | Account, notifications, team roles                                                            | —                        | P0                       |
| `/business/staff`               | Staff and availability                                                                        | —                        | P1                       |
| `/business/customers`           | Customer booking details (minimal, logged)                                                    | —                        | P1                       |
| `/business/reviews`             | Reviews and replies                                                                           | —                        | P1                       |
| `/business/promotions`          | Promotions / shareable booking link & QR                                                      | —                        | P1                       |
| `/business/insights`            | Analytics (requests, confirmation rate, response time)                                        | —                        | P1                       |
| `/business/billing`             | Plan, entitlements, billing history                                                           | —                        | P1                       |

### 2.4 Admin console — `DashboardLayout` with admin nav

| Route                          | Page                                                                                | Priority |
| ------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `/admin`                       | Operations overview (pending approvals, open cases, failures)                       | P0       |
| `/admin/merchants`             | Approval queue + all merchants (approve/reject/suspend/request changes with reason) | P0       |
| `/admin/merchants/:businessId` | Listing review detail + audit history                                               | P0       |
| `/admin/categories`            | Category & service taxonomy, featured listings                                      | P0       |
| `/admin/reports`               | User reports / support cases (status, owner, audit trail)                           | P0       |
| `/admin/logs`                  | Notification & system failure logs (PII-minimised)                                  | P0       |
| `/admin/users`                 | User lookup, suspension                                                             | P0       |
| `/admin/plans`                 | Plans and entitlements                                                              | P1       |

No admin designs exist; build them from existing template primitives (DataTable, FilterBar, PageHeader, ConfirmDialog) in the merchant dashboard's visual language.

### 2.5 Static and system pages

`/legal/terms`, `/legal/privacy`, `/legal/merchant-policy`, `/support` (P0, doc §5.1 and §18.1) and the existing `*` 404 page (re-skinned).

### 2.6 Route-tree shape

```
/ RootLayout
├── WelcomeLayout          /welcome, /get-started
├── CustomerLayout         /, /explore, /categories/*, /shops/*, /style-studio, /rentals/*, /legal/*, /support
│   └── RequireRole(customer)   /bookings/*, /inbox/*, /account/*, /favorites, /shops/:slug/book
├── AuthLayout             /auth/*, /business/sign-up
├── RequireRole(merchant) → DashboardLayout(merchantNav)   /business/*
├── RequireRole(admin)    → DashboardLayout(adminNav)      /admin/*
└── NotFoundPage           *
```

Guards are route `loader`s that read the session query and `redirect('/auth/sign-in?next=…')` — the extension point the README already names.

---

## 3. UI reference → page mapping

| #   | Screen in image          | Route / component target                           | Key visual elements to reproduce                                                                                                                                                                                                                                                                                                                             | Deviation needed (see §11)                                                       |
| --- | ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | Splash / Welcome         | `/welcome`                                         | Full-bleed portrait photo, gradient scrim, serif "GlamSpot" wordmark with butterfly/flower mark, tagline "Beauty • Grooming • Wellness • Lifestyle Near You", "Look Good / Feel Good / Do More", pill "Get Started", text "Sign In"                                                                                                                          | Desktop composition undefined                                                    |
| 2   | Choose user type         | `/get-started`                                     | Back + "Skip", heading "How will you use GlamSpot?", two large image cards with title, description and chevron                                                                                                                                                                                                                                               | —                                                                                |
| 3   | Home (customer)          | `/`                                                | Location selector ("Davao City ▾"), bell, rounded search field, gradient hero "Find Your Style / Try AI Look", 10 circular category tiles, "Popular Near You · See All" 2-col cards (photo, heart, name, area · distance, ★ rating (count)), bottom tab bar Home/Explore/Bookings/Inbox/Profile                                                              | Hero CTA targets P1 feature; ratings P1                                          |
| 4   | Map view                 | `/explore?view=map`                                | Search "Search this area", filter button, category chips (All active pill), map with rose pins, bottom card (thumb, name, rating, distance, open status, photo strip, "View Details")                                                                                                                                                                        | Map provider undecided                                                           |
| 5   | Shop details             | `/shops/:slug`                                     | Hero image with back/heart/share overlay buttons, name + heart, ★ rating (reviews), distance · area, green "Open · Closes 9:00 PM", underline tabs, description, photo grid with "+8", "Popular Services" rows with duration, ₱ price and "Book"                                                                                                             | Rating/staff tab hidden until P1 data exists                                     |
| 6   | Book appointment         | `/shops/:slug/book`                                | Selected service summary card, "Select Staff (Optional)" avatar row with "Any Available", horizontal day strip, 3-col time-slot grid (selected = filled rose), full-width "Confirm Booking"                                                                                                                                                                  | Request vs instant wording; policy summary + notes missing in design             |
| 7   | Booking confirmed        | `/bookings/:id/submitted`                          | Confetti + check badge, "Booking Confirmed!", summary card (shop, service, staff, date, time, area), "Add to Calendar" (outline), "View Booking" (filled), quick actions Message Shop / Get Directions / Share                                                                                                                                               | Must have a **"Request sent — pending"** variant                                 |
| 8   | AI Hairstyle Try-On      | `/style-studio`                                    | Before/after split slider, style thumbnails (Long Layers, Bob Cut, Curtain Bangs, Wavy, Pixie), "Try This Look", segmented Hairstyle / Hair Color / Makeup, disclaimer "AI results are for visual reference only."                                                                                                                                           | P1; consent/upload/delete/provider-link steps not designed; "Makeup" not in docs |
| 9   | Gown / Dress rental      | `/rentals` (P2); layout reused by category listing | Back + title + search, chips (All, Formal, Wedding, Debut, Graduation), 2-col item cards with heart, name, "₱3,500 / 3 days"                                                                                                                                                                                                                                 | P2 — not in MVP                                                                  |
| 10  | Spa & Massage            | `/categories/:slug`                                | Back + title + search, chips (All, Massage, Facial, Body Scrub), large image cards with heart, name, area · distance, ★ rating                                                                                                                                                                                                                               | Generic for all categories                                                       |
| 11  | My bookings              | `/bookings`                                        | Underline tabs Upcoming/Past/Cancelled, booking cards (thumb, shop, service with staff, date·time, area), status pill (Confirmed green / Pending amber), actions Reschedule, Cancel (rose text), View Details, Add to Calendar, Message                                                                                                                      | 9 doc states must map to 3 tabs                                                  |
| 12  | Merchant dashboard (web) | `/business`                                        | Dark navy sidebar with "GlamSpot for Business", rose active item, 10 nav items; top bar with hamburger, bell, business avatar + name + "Owner" ▾; "Welcome, {business}!", date-range picker, 4 KPI cards with deltas, "Today's Bookings" table (Time, Name, Booking, Status) + "View Calendar ▾", "Recent Messages" panel, "View Calendar" / "+ Add Booking" | Messages nav item missing; P1 nav items; revenue/rating KPIs                     |

### 3.1 Visual language extracted from the image

| Token            | Observed                                                                                                             | Template today                   | Action                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Primary          | Raspberry rose ≈ `#C84A5B`–`#CC4159` (CTAs, active chips, selected slot, pins, active tab underline, sidebar active) | Indigo `oklch(0.51 0.2 268)`     | Replace `--primary`, `--ring`, `--chart-1`, `--sidebar-primary` (light + dark)                          |
| Primary tint     | Pale blush ≈ `#F8E1E4` (secondary buttons "Add to Calendar", category tile circles, inactive segmented tab)          | `--secondary` cool grey          | Warm `--secondary` / `--accent`                                                                         |
| Page background  | Warm off-white ≈ `#F7ECE9`; cards near-white with soft warm shadow                                                   | Pure white, cool shadows         | Warm `--background`, `--muted`, `--border`, shadow hue                                                  |
| Merchant sidebar | Dark navy ≈ `#262937`, light text, rose active pill                                                                  | Light sidebar                    | Dark `--sidebar-*` values in **light** theme (merchant/admin only if we keep a light customer nav)      |
| Status           | Confirmed = green tint pill, Pending = amber tint pill, Open = green text, rating stars amber ≈ `#FB9D13`            | `success`/`warning` tokens exist | Reuse; add `--rating` token for stars                                                                   |
| Typography       | Serif display wordmark ("GlamSpot"); clean sans for UI                                                               | Geist only                       | Keep Geist for UI; add one serif for the wordmark/display only (decision Q5)                            |
| Shape            | Large radii (cards ≈ 16 px, sheets ≈ 24 px), pill buttons and chips, circular avatars/category tiles                 | `--radius: 0.625rem`             | Raise `--radius` (≈ 0.875–1rem); pill CTAs via a `shape` variant on Button rather than per-page classes |
| Imagery          | Warm, photographic, people-centred                                                                                   | none                             | Licensed placeholder imagery needed (Q6)                                                                |
| Dark mode        | Not shown                                                                                                            | Supported                        | Derive a warm dark palette; keep the theme toggle                                                       |

---

## 4. Shared components to reuse

### 4.1 shadcn/ui primitives (`src/components/ui`) — reuse directly

| Primitive                                                                                                 | Used for                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `button`                                                                                                  | All CTAs ("Book", "Confirm Booking", "View Details"); `loading`, `fullWidth`, `asChild` links     |
| `card`                                                                                                    | Shop cards, booking cards, KPI cards, summary panels                                              |
| `badge`                                                                                                   | Booking status, "Open/Closed", "Pending review", "Coming soon" (success/warning/info/destructive) |
| `tabs` (`variant="line"`)                                                                                 | Shop details tabs, My Bookings tabs, admin queues                                                 |
| `avatar`                                                                                                  | Staff picker, message list, user menu, business switcher                                          |
| `dialog`, `alert-dialog`                                                                                  | Propose new time, decline reason, cancel booking, photo lightbox, AI consent                      |
| `sheet`                                                                                                   | Mobile filters, map bottom panel on small screens, mobile nav                                     |
| `popover`, `calendar`                                                                                     | Date selection, date-range picker                                                                 |
| `select`, `radio-group`, `checkbox`, `switch`, `textarea`, `input`, `input-group`, `field`, `label`       | All forms                                                                                         |
| `dropdown-menu`                                                                                           | Row actions, business/user menus, "View Calendar ▾"                                               |
| `sidebar`                                                                                                 | Merchant and admin navigation                                                                     |
| `table`, `pagination`                                                                                     | Via `DataTable` for merchant bookings, admin queues                                               |
| `skeleton`, `spinner`, `sonner`, `tooltip`, `separator`, `empty`, `alert`, `kbd`, `command`, `breadcrumb` | As in the template                                                                                |

### 4.2 App-level shared components — reuse directly

`Container`, `PageHeader`, `SectionHeader` ("Popular Near You · See All"), `Breadcrumbs`, `SearchInput`, `FilterBar`, `DatePicker`, `ConfirmDialog` (cancel booking, decline, suspend listing), `DataTable` (+ `renderMobileItem` card list), `CommandMenu`/`AppCommandMenu`, `ThemeToggle`, `Logo` (re-skinned), `FormField`, `FormError`, `EmptyState`, `ErrorState`, `LoadingIndicator`, `RouteErrorBoundary`, `NavigationProgress`, `SkipLink`, `NotificationsMenu` (re-wired to real data), `UserMenu` (re-wired to session).

Hooks/utilities: `useDocumentTitle`, `useDebouncedValue`, `useIsMobile`, `useTheme`, `cn`, `apiClient`, `getErrorMessage`, `formatRelative`, `initials`.

### 4.3 Existing pieces that need small, deliberate extensions

| Component                         | Change                                                                                                                                      | Why                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `DashboardLayout` / `AppSidebar`  | Accept nav groups (merchant vs admin) and a header slot (business switcher) instead of hard-coded `appNav`/`publicNav`.                     | One shell for merchant + admin, no duplication |
| `config/navigation.ts`            | Replace demo nav with `customerTabs`, `merchantNav`, `adminNav`, `footerNav`; optional `priority`/feature-flag field to hide P1/P2 entries. | Single source for nav + command menu           |
| `Logo`                            | SVG mark + serif wordmark, `subtitle` ("for Business"), keep `compact`/`inverted`.                                                          | Brand                                          |
| `Button`                          | Add `shape: 'default' \| 'pill'` cva variant (marked `// Customized:`).                                                                     | Pill CTAs everywhere in the design             |
| `MetricCard` (features/dashboard) | Promote to `components/shared/StatCard` with optional delta + period label.                                                                 | Merchant + admin KPIs                          |
| `DatePicker`                      | Add range mode (`DateRangePicker`).                                                                                                         | Dashboard "Jul 7 – Jul 13"                     |
| `lib/format.ts`                   | `formatCurrency` (PHP, `en-PH`), `formatTime`, `formatDateTime` with `timeZone: 'Asia/Manila'`, `formatDistance`, `formatDuration`.         | Doc §7.3 timezone rule, ₱ prices               |
| `lib/env.ts` / `.env.example`     | `VITE_APP_NAME=GlamSpot`; add `VITE_MAP_PROVIDER`/public map key, `VITE_FEATURE_AI_STUDIO`, `VITE_FEATURE_RENTALS`.                         | Brand + feature flags                          |
| `index.html`                      | Title/description; theme storage key rename is optional.                                                                                    | Brand                                          |

---

## 5. New components to create

Placement follows the README dependency rule: generic → `components/shared`, domain-specific → `features/<name>/components`.

### 5.1 Layout

| Component                   | Location             | Notes                                                                                                                                                                                                                             |
| --------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CustomerLayout`            | `components/layouts` | Mobile: compact header (location + bell) and fixed **BottomTabBar** (Home, Explore, Bookings, Inbox, Profile; `aria-current`, safe-area inset). Desktop (≥ md): top navbar with logo, search, links, bell, user menu; no tab bar. |
| `BottomTabBar`              | `components/layouts` | Reads `customerTabs` from navigation config.                                                                                                                                                                                      |
| `WelcomeLayout`             | `components/layouts` | Full-bleed hero for `/welcome` and `/get-started`.                                                                                                                                                                                |
| `RequireRole` loader helper | `app/` or `lib/auth` | Redirects with `next` param.                                                                                                                                                                                                      |
| `MobilePageHeader`          | `components/shared`  | Back button + centred title + optional action (screens 6, 8, 9, 10, 11).                                                                                                                                                          |

### 5.2 Generic shared

| Component                              | Purpose                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `ChipGroup` (on shadcn `toggle-group`) | Pill filter chips with horizontal scroll (screens 4, 9, 10).                      |
| `HorizontalScroller`                   | Keyboard/scroll-snap row for categories, day strip, style thumbnails.             |
| `ImageWithFallback`                    | Aspect-ratio image, lazy loading, blurred placeholder, alt text required.         |
| `PhotoGrid` + `Lightbox`               | Gallery with "+N" overflow tile.                                                  |
| `RatingStars`                          | Stars + numeric + count; renders "No reviews yet" when absent (never fabricated). |
| `FavoriteButton`                       | Heart toggle; prompts sign-in for guests; optimistic mutation.                    |
| `ShareButton`                          | Web Share API with copy-link fallback.                                            |
| `StatCard`                             | Promoted from `MetricCard`.                                                       |
| `DateRangePicker`                      | Range calendar in popover.                                                        |
| `Stepper`                              | Merchant onboarding, AI flow steps.                                               |
| `ImageUploader`                        | Type/size validation, preview, remove; used by merchant photos and AI upload.     |
| `SuccessHero`                          | Check badge + confetti (respects reduced motion).                                 |
| `CopyField` / `QrCode`                 | Merchant booking link (P1).                                                       |

### 5.3 Domain components (feature folders)

| Feature           | Components                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discovery         | `LocationSelector` (Davao City + areas, "Use my location" with denial fallback), `CategoryGrid`/`CategoryTile`, `PromoHero`, `ShopCard` (vertical), `ShopListItem` (horizontal), `ExploreFilters` (sheet on mobile), `ListMapToggle`, `MapView` (provider adapter, pins, selected-shop card)                                                                                                                                                      |
| shops             | `ShopHero` (overlay actions), `ShopHeader` (name, rating, distance, `OpenStatus`), `OpenStatus`, `ServiceRow` (thumb, name, duration, `PriceTag`, Book), `PriceTag` (fixed / from / range / quote-required), `OpeningHoursList`, `PoliciesPanel`, `BookingMethodNotice` ("Requires merchant confirmation")                                                                                                                                        |
| booking           | `BookingServiceSummary`, `StaffPicker` (radio group of avatars + "Any available"), `DayStrip`, `TimeSlotGrid` (radio semantics, disabled slots, "preferred time" labelling), `BookingNotesField`, `PolicySummary`, `BookingStatusBadge` (all 9 states, icon + text), `BookingCard`, `BookingTimeline`, `AlternativeTimeResponse`, `AddToCalendarButton` (ICS download), `BookingQuickActions`                                                     |
| messaging         | `ConversationList`, `ConversationListItem`, `MessageThread`, `MessageBubble`, `MessageComposer`, `ReportConversationDialog` — shared by customer inbox and merchant messages                                                                                                                                                                                                                                                                      |
| account           | `ProfileForm`, `PrivacyPreferences`, `DeleteAccountRequest`                                                                                                                                                                                                                                                                                                                                                                                       |
| merchant          | `MerchantSidebarHeader`/`BusinessSwitcher`, `TodayBookingsTable`, `RecentMessagesPanel`, `BookingRequestActions` (accept/decline/propose), `ProposeTimeDialog`, `DeclineReasonDialog`, `ScheduleView` (day/week), `ServiceForm`, `ServicesTable`, `BusinessProfileForm`, `OpeningHoursEditor`, `ClosureDatesEditor`, `PoliciesForm`, `ListingPreview`, `ListingStatusBanner` (pending review / changes requested / suspended), `OnboardingWizard` |
| admin             | `ApprovalQueueTable`, `ListingReviewPanel`, `ModerationActionDialog` (reason required), `TaxonomyEditor`, `CaseTable`, `FailureLogTable`, `AuditTrail`                                                                                                                                                                                                                                                                                            |
| style-studio (P1) | `AiNoticeConsent`, `PhotoUploadStep`, `StylePicker`, `BeforeAfterSlider` (keyboard-operable `role="slider"`), `PreviewResult`, `MatchingProviders`, `DeletePreviewButton`                                                                                                                                                                                                                                                                         |
| rentals (P2)      | `RentalItemCard`, `RentalInquiryForm`                                                                                                                                                                                                                                                                                                                                                                                                             |

### 5.4 shadcn primitives to add (`npx shadcn@latest add …`)

`toggle-group` (chips, segmented tabs), `scroll-area` (horizontal rows), `aspect-ratio` (photos), `slider` (before/after — or a custom element), `chart` (Recharts; P1 insights only). No other new UI libraries are needed.

### 5.5 New third-party dependencies (each requires approval)

| Need               | Candidate                                                               | Priority | Notes                                                                    |
| ------------------ | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| Map                | `leaflet` + `react-leaflet` with OSM tiles, or Google Maps / Mapbox SDK | P0       | Provider decision (Q3); wrap in a `MapView` adapter so it can be swapped |
| Serif display font | `@fontsource/<serif>` (e.g. Playfair Display / Cormorant)               | P0       | Wordmark/display only (Q5)                                               |
| A11y checks in e2e | `@axe-core/playwright`                                                  | P0       | Dev dependency                                                           |
| Charts             | `recharts` via shadcn `chart`                                           | P1       | README already anticipates it                                            |

---

## 6. Feature modules and dependencies

```
src/features/
├── auth/            session query, sign-in/up/out, forgot password, role guards, useSession()
├── discovery/       home, explore (list/map), categories, location
├── shops/           public shop profile, services, hours, policies
├── booking/         customer booking flow, my bookings, booking detail, alternative-time response
├── messaging/       conversations + messages (customer and merchant views)
├── account/         profile, privacy/consents, deletion request
├── notifications/   in-app notifications for the bell
├── merchant/        overview, bookings mgmt, calendar, services, profile, settings, onboarding
├── admin/           approvals, taxonomy, reports, logs, users
├── favorites/       (P1)
├── reviews/         (P1)
├── style-studio/    (P1)
└── rentals/         (P2)
```

Cross-cutting domain logic lives outside features so customer, merchant and admin views share one implementation:

- `src/lib/booking-status.ts` — the state machine from doc §7.2: allowed transitions per actor, `isActive`, `isConfirmed`, tab grouping, display labels. Pure functions, unit tested.
- `src/lib/opening-hours.ts` — "Open · Closes 9:00 PM" computation in `Asia/Manila`.
- `src/lib/format.ts` — currency/time/distance formatters.

Dependency graph (build order follows it):

```
auth ─────────────┬──────────────┬───────────────┐
                  │              │               │
discovery → shops → booking → messaging      merchant ──→ admin
                     │            │    ↖________/  │
                     └→ notifications ←────────────┘
account (needs auth)       reviews (needs completed bookings)
favorites (needs auth + shops)   style-studio (needs shops/services + auth + consent)
```

Services (`src/services/`, HTTP + mock each): `auth`, `catalog` (categories, areas), `shops`, `availability`, `bookings`, `conversations`, `notifications`, `account`, `merchant` (own business, services, hours, staff), `admin`, later `favorites`, `reviews`, `ai`, `subscriptions`.

The mock layer must behave like the documented backend: enforce the booking state machine, scope data by role, keep an audit trail, and persist to `localStorage` so a demo survives reloads and can play customer → merchant → customer round-trips (README already suggests this).

---

## 7. Data models and API requirements

### 7.1 Frontend domain types (`src/types/`)

Derived from doc §11; field names are proposals until an API contract exists.

```ts
type ID = string
type ISODateTime = string // stored UTC; displayed in Asia/Manila

type UserRole = 'customer' | 'merchant_owner' | 'merchant_staff' | 'admin' | 'support'
interface SessionUser {
  id: ID
  name: string
  email: string
  phone?: string
  roles: UserRole[]
  businessIds: ID[]
  avatarUrl?: string
}

interface Area {
  id: ID
  name: string
  city: 'Davao City'
} // Poblacion, Lanang, Buhangin, Bajada…
interface ServiceCategory {
  id: ID
  slug: string
  name: string
  parentId?: ID
  icon: string
  status: 'active' | 'hidden' | 'coming_soon'
}

type BusinessStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'suspended' | 'rejected'
type BookingMethod = 'request' | 'instant' // instant = live calendar (P1)
interface Business {
  id: ID
  slug: string
  name: string
  description: string
  categoryIds: ID[]
  areaId: ID
  address: string
  coordinates?: { lat: number; lng: number }
  status: BusinessStatus
  bookingMethod: BookingMethod
  phone?: string
  photos: BusinessPhoto[]
  coverPhotoUrl?: string
  hours: WeeklyHours
  closures: AvailabilityException[]
  policies: { cancellation?: string; noShow?: string; deposit?: string; version: number }
  rating?: { average: number; count: number } // absent until reviews exist
  verified: boolean
}
interface WeeklyHours {
  [weekday: number]: { open: string; close: string }[]
} // 'HH:mm', business timezone
interface BusinessPhoto {
  id: ID
  url: string
  alt: string
  kind: 'cover' | 'gallery' | 'service'
}

type PriceType = 'fixed' | 'from' | 'range' | 'quote'
interface Service {
  id: ID
  businessId: ID
  categoryId: ID
  name: string
  description?: string
  price: { type: PriceType; amount?: number; maxAmount?: number; currency: 'PHP' }
  durationMinutes: number
  bufferMinutes?: number
  photoUrl?: string
  active: boolean
}
interface StaffMember {
  id: ID
  businessId: ID
  displayName: string
  avatarUrl?: string
  serviceIds: ID[]
  active: boolean
}

type BookingStatus =
  | 'draft'
  | 'pending'
  | 'alternative_proposed'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'expired'
interface Booking {
  id: ID
  customerId: ID
  businessId: ID
  serviceId: ID
  staffId?: ID
  requestedStart: ISODateTime
  requestedEnd: ISODateTime
  proposedStart?: ISODateTime
  proposedEnd?: ISODateTime
  status: BookingStatus
  notes?: string
  serviceSnapshot: { name: string; durationMinutes: number; price: Service['price'] } // price snapshot
  policyVersion: number
  respondBy?: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
interface BookingEvent {
  id: ID
  bookingId: ID
  actorId: ID
  actorRole: UserRole
  from: BookingStatus | null
  to: BookingStatus
  reason?: string
  at: ISODateTime
}

interface Conversation {
  id: ID
  customerId: ID
  businessId: ID
  bookingId?: ID
  status: 'open' | 'closed' | 'reported'
  lastMessageAt: ISODateTime
  unreadCount: number
}
interface Message {
  id: ID
  conversationId: ID
  senderId: ID
  senderRole: 'customer' | 'business'
  body: string
  sentAt: ISODateTime
  status: 'sent' | 'read' | 'hidden'
}

interface AppNotification {
  id: ID
  type: string
  title: string
  body: string
  href?: string
  read: boolean
  createdAt: ISODateTime
}
interface ConsentRecord {
  id: ID
  purpose: 'privacy_notice' | 'ai_preview' | 'marketing'
  version: string
  grantedAt: ISODateTime
  withdrawnAt?: ISODateTime
}

// Admin
interface ModerationAction {
  id: ID
  businessId: ID
  action: 'approve' | 'reject' | 'suspend' | 'request_changes'
  reason: string
  actorId: ID
  at: ISODateTime
}
interface SupportCase {
  id: ID
  kind: 'listing' | 'message' | 'price' | 'booking_dispute' | 'other'
  status: 'open' | 'in_progress' | 'resolved'
  ownerId?: ID
  targetType: string
  targetId: ID
  createdAt: ISODateTime
}

// P1
interface Review {
  id: ID
  bookingId: ID
  businessId: ID
  rating: 1 | 2 | 3 | 4 | 5
  text?: string
  status: 'pending' | 'published' | 'rejected'
  createdAt: ISODateTime
}
interface Subscription {
  id: ID
  businessId: ID
  planId: ID
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  currentPeriodEnd?: ISODateTime
}
interface AiPreviewJob {
  id: ID
  status: 'queued' | 'processing' | 'succeeded' | 'failed'
  styleId: ID
  outputUrl?: string
  expiresAt: ISODateTime
}
```

### 7.2 Zod schemas (`src/schemas/`)

`auth.ts` (customer sign-up, merchant sign-up, sign-in, forgot password — replacing demo registration), `booking.ts` (booking request: serviceId, staffId?, date, time, notes ≤ 500, policy acknowledged), `business.ts` (profile, hours with open < close, closures, policies), `service.ts` (price-type discriminated union, duration 5–480 min), `message.ts` (1–2000 chars), `moderation.ts` (reason required), `account.ts` (profile; timezone default `Asia/Manila`), later `review.ts`, `ai.ts` (file type jpeg/png/webp, max size).

### 7.3 API surface the frontend will call

REST-style, JSON, cookie session. All mutating booking endpoints should accept an `Idempotency-Key` header (doc §11.1).

| Area                | Endpoints                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session/auth        | `GET /auth/session` · `POST /auth/sign-in` · `POST /auth/sign-up` · `POST /auth/sign-out` · `POST /auth/forgot-password` · `POST /auth/verify`                                                                                                                                                                                                                                         |
| Catalog             | `GET /categories` · `GET /areas`                                                                                                                                                                                                                                                                                                                                                       |
| Discovery           | `GET /shops?q=&category=&area=&priceMin=&priceMax=&openNow=&lat=&lng=&bounds=&page=` → `Paginated<ShopSummary>` · `GET /shops/featured` · `GET /shops/:slug` · `GET /shops/:slug/services` · `GET /shops/:slug/staff` · `GET /shops/:slug/availability?serviceId=&staffId=&date=` (instant merchants only; otherwise opening-hours windows)                                            |
| Bookings (customer) | `POST /bookings` · `GET /me/bookings?group=upcoming                                                                                                                                                                                                                                                                                                                                    | past    | cancelled`·`GET /bookings/:id`(with events) ·`POST /bookings/:id/cancel`·`POST /bookings/:id/accept-alternative`·`POST /bookings/:id/decline-alternative`·`POST /bookings/:id/reschedule-request`·`GET /bookings/:id/calendar.ics` |
| Messaging           | `GET /conversations` · `POST /conversations` (shopId, optional bookingId) · `GET /conversations/:id/messages` · `POST /conversations/:id/messages` · `POST /conversations/:id/read` · `POST /conversations/:id/report`                                                                                                                                                                 |
| Notifications       | `GET /me/notifications` · `POST /me/notifications/read`                                                                                                                                                                                                                                                                                                                                |
| Account             | `GET/PUT /me/profile` · `GET/PUT /me/preferences` · `GET /me/consents` · `POST /me/consents` · `POST /me/deletion-request`                                                                                                                                                                                                                                                             |
| Merchant            | `GET /merchant/businesses` · `GET/PUT /merchant/businesses/:id` · `POST /merchant/businesses/:id/submit` · `POST/DELETE /merchant/businesses/:id/photos` · `GET/POST/PUT/DELETE /merchant/businesses/:id/services` · `PUT /merchant/businesses/:id/hours` · `POST/DELETE …/closures` · `GET /merchant/businesses/:id/bookings?from=&to=&status=` · `POST /merchant/bookings/:id/accept | decline | propose                                                                                                                                                                                                                            | complete | no-show`·`GET /merchant/businesses/:id/overview?from=&to=`·`GET /merchant/businesses/:id/conversations` |
| Admin               | `GET /admin/overview` · `GET /admin/businesses?status=` · `GET /admin/businesses/:id` · `POST /admin/businesses/:id/moderate` · `GET/POST/PUT /admin/categories` · `GET/PUT /admin/cases` · `GET /admin/logs/notifications` · `GET /admin/users` · `POST /admin/users/:id/suspend`                                                                                                     |
| P1                  | favourites, reviews, staff, insights, subscriptions/billing, AI jobs (`POST /ai/previews` multipart, `GET /ai/previews/:id`, `DELETE /ai/previews/:id`, `GET /ai/previews/:id/providers`)                                                                                                                                                                                              |

Server responsibilities the frontend must **not** reimplement: authorization, state-transition validation, overlap/conflict checks, entitlement checks, notification idempotency, audit logging, rate limiting.

---

## 8. Authentication and authorization

1. **Session model**: httpOnly cookie set by the backend; the SPA learns the user from `GET /auth/session` cached with TanStack Query (`sessionKeys.current`). No tokens in `localStorage` (matches the API client's existing comment).
2. **Route guards**: route `loader`s call `queryClient.ensureQueryData(sessionQuery)` and `redirect` to `/auth/sign-in?next=<path>` when unauthenticated, or to a 403/"switch account" page when the role is wrong. Lazy merchant/admin bundles are not downloaded by customers.
3. **Gated actions for guests**: "Book", heart, "Message shop" open a sign-in prompt and resume the intended action after sign-in (`next` + preserved booking draft in a small Zustand store, `sessionStorage`-persisted).
4. **Role-aware UI**: `useSession()` exposes `hasRole`, active business and permissions; merchant staff see only permitted nav items. This is presentation only — every endpoint authorizes server-side.
5. **Merchant onboarding gate**: a merchant with a non-approved listing can use `/business/onboarding` and `/business/profile` but their shop is not public; a `ListingStatusBanner` explains the state.
6. **Account lifecycle**: sign-up (email + password; phone optional), email verification, forgot password, sign out everywhere via `POST /auth/sign-out`, deletion request (CUS-06).
7. **Mock mode**: the mock auth service seeds one customer, one merchant owner (The Good Cut Barbershop), one staff member and one admin, plus a dev-only **role switcher** (like the existing `DemoStateSwitcher`) so every view can be demoed without a backend. Clearly labelled "mock".

---

## 9. Recommended implementation order

Status: steps 0–6 are **done** (§13.1–13.3, §13.7); the repository is on GitHub since 27 Oct 2026. Merchant screens (step 7) are built in mock mode, and their listing, services and settings endpoints are served by `server/` since 27 Oct 2026. Customer profile, consents and deletion requests, and the admin console (step 9 screens) followed the same day, so every built screen now runs on the server. Next: steps 10–12 (map, legal and support pages, MVP hardening).

Each step ends with `npm run check`, updated tests and (from step 3) a Playwright run at mobile and desktop sizes.

| Step | Scope                                                                                                                                                                                                                                          | Priority | Exit criteria                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| 0    | `git init` + baseline commit; confirm blocking decisions (§12)                                                                                                                                                                                 | —        | Decisions recorded in this file                                           |
| 1    | **Foundation & rebrand**: rose/warm tokens (light + dark), radius, dark merchant sidebar, serif wordmark, `Logo`, `Button` pill shape, `VITE_APP_NAME=GlamSpot`, PHP/Manila formatters, navigation config, feature flags                       | P0       | Gallery `/components` shows rebranded primitives; contrast AA verified    |
| 2    | **Domain core**: types, Zod schemas, `booking-status` state machine, opening-hours helper, Davao mock seed data (categories, areas, ~12 shops, services, staff), `localStorage`-backed mock services, session service + guards + role switcher | P0       | State machine and schemas unit-tested; guards tested in `routes.test.tsx` |
| 3    | **Layouts**: `CustomerLayout` (+ `BottomTabBar`), `WelcomeLayout`, parametrized `DashboardLayout` for merchant/admin; remove demo routes from nav (keep `/components` dev-only)                                                                | P0       | No horizontal overflow at 320/390/768/1440 px                             |
| 4    | **Discovery**: Home (3), category listing (10), Explore list view, shop details (5), service detail; empty/loading/error states                                                                                                                | P0       | Guest can search and open a shop (doc §18.1 #1)                           |
| 5    | **Onboarding & auth**: Welcome (1), Get started (2), sign-in/up/forgot/verify, account & privacy pages                                                                                                                                         | P0       | Guest → sign-up → returns to intended action                              |
| 6    | **Customer booking**: Book appointment (6) in request mode, submitted screen (7) with pending variant, My Bookings (11), booking detail + timeline, accept/decline alternative, cancel with policy                                             | P0       | Pending never shown as confirmed; alternative needs customer acceptance   |
| 7    | **Merchant core**: onboarding wizard, business profile/hours/closures/policies, services CRUD, bookings list + accept/decline/propose, calendar view, overview (12) with P0-safe KPIs                                                          | P0       | Full request → accept → customer sees Confirmed round-trip in mock mode   |
| 8    | **Messaging & notifications**: customer inbox, merchant messages, recent-messages panel, bell notifications for booking events                                                                                                                 | P0       | Messages scoped per customer/business                                     |
| 9    | **Admin console**: approval queue + review, moderation with reason/audit, taxonomy, cases, failure logs, users                                                                                                                                 | P0       | Approved-only shops appear publicly                                       |
| 10   | **Map view** (4) behind `MapView` adapter; location permission with manual fallback                                                                                                                                                            | P0       | Pin ↔ card ↔ profile linking; works with location denied                  |
| 11   | **Legal & trust**: terms, privacy, merchant policy, support/report flows; footer                                                                                                                                                               | P0       | §18.1 legal items present                                                 |
| 12   | **MVP hardening**: a11y audit, e2e journeys, visual review against the image, performance (image lazy loading, route chunks)                                                                                                                   | P0       | MVP release gate (§10.4) passes                                           |
| 13   | P1: instant booking (live availability), favourites, reviews + ratings, staff & availability, insights with charts, plan & billing, promotions/booking link + QR, complete/no-show                                                             | P1       | Per-feature gates in doc §18.3                                            |
| 14   | P1: AI Style Studio (8) with consent, upload, preview, delete, provider matching                                                                                                                                                               | P1       | Doc §18.2 AI release gate                                                 |
| 15   | P2: Rentals (9)                                                                                                                                                                                                                                | P2       | Only after rental inventory rules are defined                             |

Map is listed after the list view because the provider is undecided; if the decision lands early, steps 4 and 10 merge.

---

## 10. Testing and visual verification plan

### 10.1 Unit (Vitest)

- `booking-status`: every allowed and forbidden transition per actor; tab grouping (Upcoming = pending/alternative_proposed/confirmed in the future; Past = completed/no_show/declined/expired or past confirmed; Cancelled = cancelled).
- `opening-hours`: open/closed/closes-at/opens-tomorrow across midnight and closure dates, fixed to `Asia/Manila` regardless of test machine timezone.
- Formatters: `₱250`, "From ₱1,200", "₱800–₱1,500", "Price on consultation"; durations; times.
- Zod schemas: booking request, service price union, hours (open < close), moderation reason.
- Mock services: state machine enforced, role scoping, idempotent create.

### 10.2 Component (RTL + user-event)

`TimeSlotGrid` and `StaffPicker` keyboard/radio semantics; `DayStrip` arrow-key navigation; `BookingStatusBadge` renders icon + text for all states; `RatingStars` "No reviews yet"; `FavoriteButton` guest prompt; booking form validation and the pending vs confirmed submitted screen; `ProposeTimeDialog`; `BeforeAfterSlider` keyboard control (P1); guards redirect with `next` (`routes.test.tsx`).

### 10.3 End-to-end (Playwright, desktop + Pixel 7 projects)

1. Guest: home → category → shop → service → "Book" → sign-in → returns to booking → submit → sees **Pending** (doc §18.1 #3).
2. Merchant: sign in → bookings → accept one, propose new time for another.
3. Customer: sees Confirmed; accepts alternative → Confirmed; cancel shows policy first.
4. Admin: approve a pending shop → it appears in search.
5. Messaging round trip customer ↔ merchant.
6. Map: location denied → manual area search still works.
7. Existing checks kept: no horizontal overflow, keyboard navigation, theme toggle.
8. `@axe-core/playwright` scan on every primary page (no serious/critical violations).

### 10.4 Visual verification against the design

- Capture Playwright screenshots of screens 1–12 at **390×844** (mobile screens) and **1440×900** (screen 12, and desktop adaptations), stored under `e2e/__screenshots__/`.
- Review each side-by-side with the corresponding crop of the showcase image; record accepted deviations in this file.
- Use `toHaveScreenshot` baselines once a screen is signed off, to catch regressions (masking dynamic dates).
- Check light and dark theme for every screen; contrast AA for rose-on-blush and white-on-rose combinations.
- Manual pass in a real browser at 320, 390, 768, 1024, 1440 px.

---

## 11. Missing information, contradictions and assumptions

### 11.1 Contradictions between the documentation and the design

| #   | Conflict                   | Documentation says                                                                                                                    | Image shows                                                                                                       | Recommended resolution                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Booking confirmation model | Request-to-confirm is P0 default; live slots P1 (BKG-01/05, §7.3 "never show a pending request as confirmed")                         | Slot picker → "Booking Confirmed! successfully booked"                                                            | Implement both variants keyed on `business.bookingMethod`. MVP: request mode — slots are "preferred times" from opening hours, button reads "Send booking request", screen 7 becomes "Request sent · Pending merchant confirmation" with the same layout. Instant/confirmed variant enabled in P1 for live-calendar merchants. |
| C2  | Time-slot availability     | Do not imply availability that is not maintained (CUS-04, BKG-05, §9.3)                                                               | Grid of specific free slots                                                                                       | In request mode, label "Preferred time — the shop will confirm" and derive slots from hours only; show real availability only for instant merchants.                                                                                                                                                                           |
| C3  | Ratings and review counts  | Reviews P1; never invent ratings (§9.3)                                                                                               | ★ 4.8 (120) on every card; "Average Rating" KPI                                                                   | Render `RatingStars` only when real review data exists; otherwise "New" / "No reviews yet". Hide the Reviews tab and Rating KPI until P1.                                                                                                                                                                                      |
| C4  | AI Try-On prominence       | AI Style Studio is a P1 experiment after core booking (§1.2, §16)                                                                     | Home hero CTA "Try AI Look", full screen 8                                                                        | Build screen 8 in step 14. Until then the hero promotes a P0 action (e.g. "Book your next look") or shows "Coming soon" behind `VITE_FEATURE_AI_STUDIO`.                                                                                                                                                                       |
| C5  | AI scope: Makeup           | Hairstyle and hair-colour only (AI-03, §1)                                                                                            | Segmented tabs Hairstyle / Hair Color / **Makeup**                                                                | Ship Hairstyle + Hair Color; omit Makeup (or disabled "Coming soon") pending product decision.                                                                                                                                                                                                                                 |
| C6  | AI consent/deletion flow   | Notice + consent before upload, file validation, delete action, provider/service links (AI-01…06)                                     | Only the result screen with a one-line disclaimer                                                                 | Add consent, upload, delete and "Find providers for this look" steps using screen 8's visual language.                                                                                                                                                                                                                         |
| C7  | Gown/Dress rental          | P2; do not launch until partner inventory exists (§5.3, §19)                                                                          | Category tile on home + full screen 9 with prices per 3 days                                                      | Keep tile as "Coming soon" (or hide) behind `VITE_FEATURE_RENTALS`; build screen 9 in P2. Reuse its card/chip layout for category listings now.                                                                                                                                                                                |
| C8  | Merchant nav scope         | P0: overview, bookings, calendar, messages, services, profile, settings; P1: staff, customers, reviews, promotions, insights, billing | 10 items incl. Staff, Customers, Reviews, Promotions, Analytics; **no Messages**, **no Billing/Business profile** | Add "Messages" and "Business profile" to the P0 sidebar; show P1 items only when enabled (feature flags) rather than as dead links.                                                                                                                                                                                            |
| C9  | "Total Revenue" KPI        | No payment processing in MVP; no revenue definition                                                                                   | ₱6,500 total revenue                                                                                              | Show "Estimated value of completed bookings" from price snapshots (P1, with completion status), or omit in P0. Needs owner decision.                                                                                                                                                                                           |
| C10 | Merchant "+ Add Booking"   | Not specified (manual/walk-in bookings absent)                                                                                        | Primary CTA on dashboard                                                                                          | Treat as P1 "manual booking" (merchant creates a confirmed booking for a walk-in/phone customer); hide in P0. Needs owner decision.                                                                                                                                                                                            |
| C11 | My Bookings tabs           | 9 states incl. Alternative proposed, Declined, Expired, No-show, Completed                                                            | 3 tabs, 2 statuses (Confirmed, Pending)                                                                           | Keep 3 tabs; map states as in §10.1; show every state with its own badge; "Alternative proposed" gets an inline Accept/Decline.                                                                                                                                                                                                |
| C12 | Brand name                 | Working name; final brand after validation (§19)                                                                                      | "GlamSpot"                                                                                                        | Use "GlamSpot" via `VITE_APP_NAME` and a swappable `Logo`, so a rename is a config change.                                                                                                                                                                                                                                     |
| C13 | Platform                   | Responsive web MVP; desktop + mobile                                                                                                  | Mobile phone frames for all customer screens; only the merchant dashboard is desktop                              | Mobile-first faithful to the image; desktop customer layouts adapted (top nav, multi-column grids, map + list side by side). Flag as design gap (§11.3).                                                                                                                                                                       |
| C14 | Distance on cards          | Distance only "where available"; location permission optional                                                                         | Distance on every card                                                                                            | Show distance only with granted location; otherwise show area name only.                                                                                                                                                                                                                                                       |
| C15 | Staff selection            | Staff management P1 (MER-06)                                                                                                          | "Select Staff (Optional)" in booking                                                                              | Show staff picker only when the shop has staff records; default "Any available". Staff tab on shop profile hidden otherwise.                                                                                                                                                                                                   |

### 11.2 Missing information (needs answers or assumptions)

1. **Backend**: no API, contract, or hosting exists. Assumption: build fully on mock services that mirror §7.3; swap via `VITE_USE_MOCKS=false` later.
2. **Auth provider** (managed service vs custom) and whether phone/OTP sign-in is required in the Philippines market.
3. **Map provider** and budget (§12 doc dependency); affects a new dependency and API key handling.
4. **Merchant onboarding fields** beyond the doc checklist (verification evidence? business permit upload?).
5. **Booking request response deadline** that triggers `expired` (e.g. 24 h? before start time?).
6. **Cancellation/reschedule policy** structure — free text, or structured (deadline hours, fee)?
7. **Service areas list** for Davao City (Poblacion, Lanang, Buhangin, Bajada, Talomo… seen in image/doc) — final list for the location selector.
8. **Category taxonomy** final list and which categories are live at launch (doc recommends barbers + salons first).
9. **Imagery**: real merchant photos come from merchants; demo/mock imagery source and licence.
10. **Email notification** content (templates) — backend concern, but in-app notification copy is needed.
11. **Localization**: English only for MVP (doc §9.3) — assumed.
12. **Multi-role users**: can one account be both customer and merchant owner? Assumed yes, with a role/context switcher.
13. **Multi-branch businesses**: assumed single business per owner for MVP (doc "only if required").

### 11.3 Screens required by the documentation but absent from the design

Search results **list** view and filters; service detail; sign-in / sign-up / forgot password / verify; customer profile, privacy and account deletion; inbox and conversation thread; booking detail with timeline and alternative-time response; request-sent (pending) confirmation; all merchant pages except the overview; merchant onboarding; the entire admin console; AI consent/upload/delete/provider steps; legal and support pages; empty, loading, error and permission-denied states; desktop layouts for customer screens; dark theme. These will be built with the extracted visual language (§3.1) and existing template primitives, and should be reviewed by the designer.

### 11.4 Assumptions made in this plan

- The template stays; no new Vite app, no config rewrites beyond tokens, env, navigation and the small extensions listed in §4.3.
- Customer, merchant and admin apps live in one SPA with lazy-loaded route groups (separate deployments are possible later).
- SEO: the doc asks for "SEO-friendly public pages"; this SPA has no SSR. Assumption: acceptable for the pilot with per-route `<title>`/meta; revisit pre-rendering or SSR before marketing launch (see Q8).
- Currency PHP, locale `en-PH`, timezone `Asia/Manila` everywhere.
- Light theme matches the image; dark theme is derived, not designed.

---

## 12. Blocking questions (answer before step 1–2)

| #   | Question                                                                                                                         | Default if unanswered                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Q1  | **MVP scope**: implement strictly P0 (doc), or also build the designed P1/P2 screens (AI Try-On, Rentals) now as flagged-off UI? | P0 only; P1/P2 designs later                                                        |
| Q2  | **Booking model** (C1/C2): accept request-to-confirm as the MVP default with a "pending" variant of screen 7?                    | Yes                                                                                 |
| Q3  | **Map provider**: Leaflet + OpenStreetMap (free, no key) vs Google Maps vs Mapbox?                                               | Leaflet + OSM behind an adapter                                                     |
| Q4  | **Backend**: is there an API team/contract, or should the frontend proceed on mock services for the whole MVP?                   | Mock services (localStorage-backed)                                                 |
| Q5  | **Brand**: confirm "GlamSpot" and approve adding one serif display font for the wordmark — **answered: "Dapita"** (§13.9)        | GlamSpot + one serif font                                                           |
| Q6  | **Imagery**: may we use royalty-free stock photos (e.g. Unsplash licence) for mock shops, or neutral placeholders only?          | **Answered 22 Oct 2026:** AI-generated photos supplied by the product owner (§13.9) |
| Q7  | **Merchant dashboard KPIs** (C9/C10): keep "Total Revenue" and "+ Add Booking"?                                                  | Hide both in P0                                                                     |
| Q8  | **Template demo routes**: remove `/forms`, `/dashboard`, `/settings` demos; keep `/components` as dev-only gallery?              | Yes                                                                                 |

Non-blocking but needed before step 6–7: §11.2 items 5 (response deadline), 6 (policy structure) and 7 (area list).

**Status (Phase 2):** none of Q1–Q8 has been answered yet; Phase 2 proceeded on the defaults above. Q5 (GlamSpot + Playfair Display) and Q8 are now in effect. For Q8, the demos were **moved to `/dev/*` (development builds only)** rather than deleted, so the decision stays reversible. These remain open and are still recorded as defaults.

---

## 13. Progress

### 13.1 Phase 2 — application foundation and shared layouts (complete, 21 Oct 2026)

Covers plan steps 1 and 3 and the session/guard part of step 2.

| Area                     | Done                                                                                                                                                                                                                                                                                              | Where                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Design tokens            | GlamSpot palette from the design (rose primary, blush secondary/accent, warm off-white surfaces, dark navy sidebar), warm shadows, `--radius: 0.75rem`, `rating` colour, `font-display` serif (Playfair Display, wordmark/hero only), `py-page` and `h-tabbar` spacing tokens, derived dark theme | `src/styles/globals.css`                                                                         |
| Brand                    | Butterfly mark + serif wordmark `Logo` (`subtitle`, `size`, `inverted`), favicon, `VITE_APP_NAME=GlamSpot`, HTML title/description/theme colour, launch-market config (Davao City, `Asia/Manila`, `en-PH`, PHP)                                                                                   | `Logo.tsx`, `public/favicon.svg`, `config/market.ts`                                             |
| Primitives               | `Button` `size="xl"` and `shape="pill"` (marked `// Customized:`); `Breadcrumbs` `minItems`; `ThemeToggle` `className`                                                                                                                                                                            | `components/ui/button.tsx`, `components/shared/*`                                                |
| Navigation config        | `customerTabs`, `headerNav`, `accountNav`, `merchantNav` (design order + Messages, Business profile, Plan & billing), `adminNav`, `footerNav`, `devNav`; `priority` drives "Soon" badges                                                                                                          | `config/navigation.ts`                                                                           |
| Marketplace layout       | `PublicLayout`: sticky header (desktop: logo, Home/Explore/Bookings/Inbox, search submitting to `/explore?q=`, theme, account; mobile: mark + "Davao City" + account), mobile **bottom tab bar** (design screen 3), footer with legal links and a mock-data notice                                | `PublicLayout`, `Navbar`, `BottomTabBar`, `Footer`                                               |
| Customer dashboard       | `AccountLayout` nested in the marketplace shell: account card + vertical nav (desktop), scrollable pill nav (mobile)                                                                                                                                                                              | `AccountLayout.tsx`                                                                              |
| Auth layout              | Brand panel based on design screen 1 (serif "Look Good / Feel Good / Do More", tagline), gradient in place of photography                                                                                                                                                                         | `AuthLayout.tsx`                                                                                 |
| Merchant / admin layouts | One `DashboardLayout` + `AppSidebar` shell configured by `MerchantLayout` ("for Business", business name + "Owner" in the top bar, design screen 12), `AdminLayout` and `DevLayout`; dark sidebar with rose active pill, hamburger toggle, breadcrumbs, command menu, notifications               | `DashboardLayout`, `AppSidebar`, `*Layout.tsx`                                                   |
| Account menu             | Session-aware `UserMenu` (avatar or detailed variant), role-based links, theme, sign out                                                                                                                                                                                                          | `UserMenu.tsx`                                                                                   |
| Routes                   | Every route in §2 registered under its layout and guard. Screens not yet built use `planned(crumb, meta)` → `PlannedScreen` (title, priority, design screen, requirement IDs, route/query params), clearly marked temporary                                                                       | `app/routes.tsx`, `PlannedScreen.tsx`                                                            |
| Session & guards         | `SessionUser`/`UserRole` types, `auth.service` (HTTP + **mock**), `useSession`/sign-in/sign-out hooks, `RequireRole` (redirect with safe `next`, access-denied state), role helpers; sign-in page with prototype-account shortcuts                                                                | `types/auth.ts`, `services/auth.service.ts`, `features/auth/*`, `lib/roles.ts`, `SignInPage.tsx` |
| Loading / error / 404    | Root full-screen error boundary + hydrate fallback; per-area inline error boundary and `*` not-found inside each layout; guard loading/error states; navigation progress bar                                                                                                                      | `RouteErrorBoundary.tsx`, `NotFoundPage.tsx`, `routes.tsx`                                       |
| Tests                    | Route/layout/guard tests rewritten (12), role/redirect unit tests (11), e2e rewritten (7 scenarios × desktop + Pixel 7)                                                                                                                                                                           | `src/app/routes.test.tsx`, `src/lib/roles.test.ts`, `e2e/app.spec.ts`                            |
| Docs                     | README (routes, accounts, tokens, guards, error handling), COMPONENTS layouts table                                                                                                                                                                                                               | `README.md`, `docs/COMPONENTS.md`                                                                |

**Temporary mock data (all labelled in code and UI):** `services/mock/users.ts` (three prototype accounts, password `password123`, session id in `localStorage`), `services/mock/notifications.ts` (bell contents per audience), `PlannedScreen` placeholders. The template demo mock data under `services/mock/data.ts` is used only by `/dev/*`.

**Verification (21 Oct 2026):**

- `npm run check`: typecheck, lint, Prettier, Vitest **8 files / 58 tests passed**.
- `npm run build`: passed; `/dev/*` template pages are excluded from the production bundle (checked).
- `npm run test:e2e` with `PW_BROWSER_CHANNEL=chrome`: **14/14 passed** (desktop + mobile), including no horizontal overflow on home, explore, account and merchant pages. Playwright's bundled Chromium is not downloaded on this machine (`npm run test:e2e:install`).
- Visual check: production-build screenshots at 390×844 and 1440×900 (light and dark) compared with design screens 1, 3 and 12. The changes made after the review: compact two-column mobile footer, and a hidden "(coming soon)" label so screen readers announce the sidebar's "Soon" badges.

**Accepted deviations from the design (Phase 2):**

- Desktop customer layout, account area, admin console and dark theme have no design; they extend the extracted visual language (§3.1).
- Mobile header shows the brand mark next to "Davao City". The location is a label, not a selector, because the MVP has a single market (design shows "Davao City ▾").
- The auth brand panel uses a gradient instead of the welcome photo (Q6 default: no stock imagery).
- Notification bell shows an unread count badge (not in the design) for accessibility of the unread state.
- Merchant sidebar keeps the design's items and order, adds Messages, Business profile and Plan & billing (C8), and marks P1 items "Soon". They link to planned pages, not dead ends.
- Breadcrumbs appear in the dashboard top bar and on deeper marketplace pages (desktop only); the design shows none.

### 13.2 Phase 3 — domain core and discovery screens (complete, 21 Oct 2026)

Covers plan steps 2 (rest) and 4.

| Area                    | Done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Where                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Domain types            | `Area`, `ServiceCategory`, `Business` (hours, closures, policies, photos, optional rating), `Service` (fixed / from / range / quote price), `StaffMember`, `ShopSummary`, `ShopDetails`, `Booking` (price snapshot, policy version, proposal, response deadline), `BookingEvent` audit entries                                                                                                                                                                                                                                                                                                   | `src/types/{common,catalog,business,booking}.ts`                      |
| Booking state machine   | Doc §7.2 transitions per actor (customer, merchant, admin, system), `transition()` with a typed error, available actions, tab grouping (plan C11), status labels and tones that never present pending as confirmed, response-deadline rule                                                                                                                                                                                                                                                                                                                                                       | `src/lib/booking-status.ts`                                           |
| Time and hours          | Asia/Manila calendar helpers independent of the device time zone; open status ("Open · Closes 9:00 PM", "Opens tomorrow 10:00 AM") incl. overnight hours, `24:00` and closures; weekly schedule; request-mode preferred start times derived from opening hours only (plan C1/C2)                                                                                                                                                                                                                                                                                                                 | `src/lib/datetime.ts`, `src/lib/opening-hours.ts`                     |
| Formatters              | `₱1,200`, "From ₱1,200", "₱800–₱1,500", "Price on consultation", "1 hr 30 mins", Manila times and dates, distances                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `src/lib/format.ts`, `src/lib/geo.ts`                                 |
| Zod schemas             | Booking request (policy acknowledgement, notes ≤ 500, PH mobile), propose time, reason; service (price union, 5–480 min in 5-min steps); business hours (no overlaps), closures, policies, profile; message (1–2,000); moderation (reason required)                                                                                                                                                                                                                                                                                                                                              | `src/schemas/{booking,service,business,message,moderation,common}.ts` |
| Mock database           | `localStorage`-backed, versioned, seeded relative to now: 8 Davao City areas, 9 categories + 19 subcategories, 12 fictional shops (11 approved, 1 pending review), 43 services, 5 staff, 14 bookings in every state, built by replaying the state machine                                                                                                                                                                                                                                                                                                                                        | `src/services/mock/db.ts`, `src/services/mock/seed/*`                 |
| Services (HTTP + mock)  | `catalog` (categories, areas); `shops` (search by keyword / category / sub-category / area / max price / open now / sort / page, featured, profile, services, staff; approved listings only); `bookings` (customer create / list / get / cancel / accept or decline alternative; merchant list / get / accept / decline / propose; outcomes). The mock enforces the session, role and ownership scoping (404 for other people's bookings), state transitions (409), opening hours and lead time (422), idempotency keys, duplicate requests, expiry and the audit trail. HTTP halves follow §7.3 | `src/services/{catalog,shops,bookings}.service.ts`                    |
| Home (design 3)         | Search (phones), "Find Your Style" banner (CTA "Explore services" per C4, brand art per Q6), 9 category tiles + More (Gowns & Dresses marked "Soon", C7), featured shops row, list-your-business band                                                                                                                                                                                                                                                                                                                                                                                            | `routes/HomePage.tsx`, `features/discovery/*`                         |
| Category (design 10)    | Back + title + search action, sub-category chips in the URL (`?type=`), large shop cards, empty / coming-soon / unknown states                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `routes/CategoryPage.tsx`                                             |
| Explore (list view)     | Keyword search, category chips, area / price / open-now / sort filters (inline on desktop, bottom sheet on phones), result count, pagination, empty state with reset; all filters in the URL                                                                                                                                                                                                                                                                                                                                                                                                     | `routes/ExplorePage.tsx`, `features/discovery/explore-params.ts`      |
| Shop details (design 5) | Cover with back and share, name, categories, verified badge, rating line ("No reviews yet"), area, live open status; Overview / Services / Staff tabs (`?tab=`); featured services with Book; request-to-book explanation (BKG-05); weekly hours with today and upcoming closures; address + directions link; policies (BKG-06); desktop booking card; "not available" state for unlisted shops                                                                                                                                                                                                  | `routes/ShopPage.tsx`, `features/shops/*`                             |
| Service detail          | Price, duration, description, requirements, staff who offer it, policies, booking bar (sticky on phones)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `routes/ServicePage.tsx`                                              |
| Shared components       | `ScreenHeader` (replaces the planned `MobilePageHeader`), `ChipNav`, `HorizontalScroller`, `ImageWithFallback`, `SiteSearchForm` (extracted from the header), `Breadcrumbs labels`, `useNow`, `useBackNavigation`; `plum` colour token for the banner                                                                                                                                                                                                                                                                                                                                            | `components/shared/*`, `hooks/*`, `globals.css`                       |
| Tests                   | State machine (every documented move, actor rules, tabs, deadlines), opening hours and dates, formatters, schemas, mock bookings service (round trips, scoping, idempotency, expiry), shop search and seed integrity, 8 new discovery route tests, 2 new e2e journeys                                                                                                                                                                                                                                                                                                                            | `src/**/*.test.ts(x)`, `e2e/app.spec.ts`                              |

**Temporary mock data:** everything under `src/services/mock/` (accounts, notifications, seed, database). Shops, addresses and customers are fictional; seed shops have no phone numbers, photos or ratings. The footer keeps the "mock data" notice. Delete the `glamspot-mock-db` key in `localStorage` to reset the demo.

**Verification (21 Oct 2026):**

- `npm run check`: typecheck, lint, Prettier, Vitest **14 files / 159 tests passed**. The date, opening-hours and service suites also pass with `TZ=America/Los_Angeles` and `TZ=Pacific/Kiritimati`.
- `npm run build`: passed; each discovery page is its own chunk.
- `npm run test:e2e` with `PW_BROWSER_CHANNEL=chrome`: **18/18 passed** (desktop + Pixel 7), including "a guest browses a category, opens a shop, picks a service and is asked to sign in to book" (doc §18.1 #1), with no horizontal overflow on any discovery page.
- Visual check: production screenshots of home, category, explore, shop and service pages at 390×844 and 1440×900, light and dark, compared with design screens 3, 5 and 10. Fixed after the review: banner art overlapping the text on phones, open-status wrapping, a truncated search placeholder.

**Accepted deviations from the design (Phase 3):**

- No photos (Q6 default): image slots show branded placeholders with the category icon. Screens 3, 5 and 10 will only match the design once licensed imagery exists.
- Ratings show "No reviews yet" instead of ★ 4.8 (120) (C3). Distances are not shown; cards show the area (C14).
- Hearts (favourites, P1) and the Reviews tab (P1) are hidden. The Staff tab appears only for shops with staff records (C15).
- "Popular Near You" and "Popular Services" became "Featured shops" and "Featured services": the data holds admin-featured listings and merchant-highlighted services, not popularity or location.
- The banner button is "Explore services", not "Try AI Look" (C4).
- Explore is list-only until the map provider is chosen (step 10); its category chips and filter button follow screen 4.
- Added beyond the design: open status on cards and results, "From ₱…" prices, verified badge, request-to-book notice, hours, closures, policies, a directions link (Google Maps URL, no embed or key), share button, a list-your-business band on the home page.

**Assumptions introduced (all in `src/config/booking.ts`):** a request expires 24 h after it is sent or 1 h before the requested start, whichever comes first (§11.2 #5); preferred times start at least 60 min from now, in 30-min steps, up to 30 days ahead; a customer who declines a proposed time returns the original request to the merchant (doc §7.2 allows Alternative proposed → Pending); merchants can cancel only confirmed bookings. Policies stay free text (§11.2 #6).

### 13.3 Customer marketplace — booking journey (complete, 21 Oct 2026)

Requested scope: homepage, category browsing, search and filters, service and rental listings, listing details, merchant profiles, booking date and time, booking summary and price breakdown, confirmation and booking history. Homepage through merchant profile were delivered in §13.2 and re-verified here; this phase adds plan step 6.

| Area                                     | Done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Where                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Book appointment (design 6)              | Customer-only route; service picker when none is chosen; service card with "Change"; staff picker ("Any available" + staff who offer the service, C15); 30-day date strip (closed days disabled); preferred-time grid from opening hours with "the shop confirms" hint (C1/C2); optional PH mobile and notes; cancellation and no-show policy with a required acknowledgement (BKG-06); validation errors per field; server errors shown above the button; idempotency key per form | `routes/BookPage.tsx`, `features/booking/components/BookingRequestForm.tsx`, `BookingPickers.tsx`, `components/shared/ChoiceGroup.tsx` |
| Booking summary and price                | Shop, date, time, duration, staff, area; listed service price, "Booking fee: Free" (doc §8.1), total (or "Estimated total" for from / range / quote prices), the shop's deposit text only if it has one, "No payment is taken in the app"                                                                                                                                                                                                                                           | `BookingSummary.tsx`                                                                                                                   |
| Request sent (design 7, pending variant) | "Request sent!" with a clock icon, pending badge, response deadline, reference, directions, View booking; the confirmed variant ("Booking confirmed!" + Add to calendar) appears only for bookings that really are confirmed                                                                                                                                                                                                                                                        | `routes/BookingSubmittedPage.tsx`                                                                                                      |
| My Bookings (design 11)                  | Upcoming / Past / Cancelled tabs with counts (`?tab=`), cards with shop, service and staff, date and time, area, status badge, "Review new time" for proposals, "Add to calendar" for confirmed upcoming bookings, empty states per tab                                                                                                                                                                                                                                             | `routes/MyBookingsPage.tsx`, `BookingCard.tsx`                                                                                         |
| Booking detail                           | Status with explanation and response deadline; proposed-time panel with Accept / Keep my original time (BKG-03); appointment facts, notes, directions, Book again for closed bookings; cancel dialog that shows the policy first and records an optional reason; price; current policy with a note if it changed since booking; status history (BKG-08)                                                                                                                             | `routes/BookingDetailPage.tsx`, `BookingActions.tsx`, `BookingTimeline.tsx`                                                            |
| Data layer                               | TanStack Query hooks for list, detail, create, cancel, accept and decline alternative, writing the server's copy back to the cache; services unchanged from §13.2 (mock and HTTP kept separate)                                                                                                                                                                                                                                                                                     | `features/booking/api/queries.ts`                                                                                                      |
| Simulation labelling                     | `MockNotice` ("Prototype · simulated") on the booking form, request-sent page, My Bookings and booking detail, shown only when `VITE_USE_MOCKS` is on. Copy never says a shop received or confirmed a mock request                                                                                                                                                                                                                                                                  | `components/shared/MockNotice.tsx`                                                                                                     |
| Utilities                                | `.ics` export for confirmed bookings (no server endpoint needed), idempotency keys, weekday and month-day formatters, a shared directions link                                                                                                                                                                                                                                                                                                                                      | `lib/calendar.ts`, `lib/ids.ts`, `lib/format.ts`, `features/shops/links.ts`                                                            |
| Tests                                    | Booking flow (service picker, validation, pending result, history), My Bookings tabs, accept-proposal → confirmed, cancel shows policy and records reason, other customers' bookings hidden, `.ics` output; e2e: guest → category → shop → service → sign in → request → pending, and accept proposal → confirmed                                                                                                                                                                   | `src/app/booking-flow.test.tsx`, `src/lib/calendar.test.ts`, `e2e/app.spec.ts`                                                         |

**Not built, by design:**

- **Rental listings** (design 9): P2 in the documentation (§5.3, §2.4 non-goals), with inventory, sizing, deposit, pickup / return and damage rules undefined (§13.4). The Gowns & Dresses tile and `/rentals` stay "coming soon". Building them would mean inventing those rules.
- **Customer reschedule** (design 11 "Reschedule"): BKG-06 asks for it, but the state model (doc §7.2) has no customer reschedule transition and no deadline rule. Customers can cancel and book again; merchants can propose another time. Needs a product decision.
- **Message shop** (designs 7, 11): messaging is plan step 8; no button links to an unbuilt screen.
- **Share** on the confirmation screen: not in the documentation.

**Verification (21 Oct 2026):**

- `npm run check`: typecheck, lint, Prettier, Vitest **16 files / 166 tests passed**.
- `npm run build`: passed.
- `npm run test:e2e` with `PW_BROWSER_CHANNEL=chrome`: **20/20 passed** (desktop + Pixel 7), with no horizontal overflow on the booking form, request-sent page and My Bookings.
- Visual check: production screenshots of the booking form (empty and with validation errors), request sent, My Bookings (light and dark) and a booking with a proposed time, at 390×844 and 1440×900, compared with design screens 6, 7 and 11. Fixed after the review: the summary now shows the chosen date before a time is picked.

**Accepted deviations from the design (this phase):**

- Screen 6's "Confirm Booking" is "Send booking request"; screen 7's "Booking Confirmed!" is "Request sent!" with a clock instead of a check and no confetti (C1, doc §7.3).
- Times are a grid of preferred times from opening hours, labelled as such (C2). Dates scroll across 30 days.
- Staff show initials instead of photos (Q6). Booking cards use a shop placeholder image.
- My Bookings' "Reschedule" and "Message" buttons are not shown (see above); "View details" / "Review new time" lead to the detail page where cancel lives, so the policy is always shown first.
- Added: booking summary panel (sticky on desktop), price breakdown, response deadline, booking reference, status history, simulation notices.

**Rules still missing (listed for the product owner):** customer reschedule flow (BKG-06); whether a cancellation deadline is enforced or only displayed (§11.2 #6, currently display only); request expiry (§11.2 #5, assumption in `config/booking.ts`); rental inventory and deposit rules (P2).

### 13.4 Remaining work

| Next        | Scope (from §9)                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Steps 7–12  | Merchant core, messaging, notifications, admin console, map, legal pages, MVP hardening (see §9) |
| Steps 13–15 | P1 features, AI Style Studio, rentals                                                            |

Shared components still to build (§5): `RatingStars` (P1, with reviews), `FavoriteButton` (P1), `MapView` (step 10), `StatCard`, `DateRangePicker`, `Stepper`, `ImageUploader`, `SuccessHero`, and all domain components.

### 13.5 Blockers and open items

| Item                                                        | Impact                                                                                                                                        | Needed by                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Q1–Q8 unanswered (defaults in use)                          | Q2/Q7 shape the booking and dashboard screens; Q3 adds a map dependency                                                                       | Q2, Q7 before steps 6–7; Q3 before step 10 |
| ~~No git repository~~                                       | Resolved 27 Oct 2026: `git init` + baseline commits, pushed to GitHub                                                                         | —                                          |
| No backend/API contract (Q4)                                | All services stay mock; HTTP halves follow §7.3 and are unverified                                                                            | Before pilot                               |
| Licensed imagery (Q6)                                       | Screens 1, 2, 3, 5, 8–10 are photo-led. Brand, shop cover and staff photos are in (§13.9); service photos still show placeholders             | Before visual sign-off                     |
| §11.2 #5–7 (response deadline, policy structure, area list) | Booking rules and the location list; currently assumptions in `config/booking.ts`                                                             | Before pilot                               |
| Customer reschedule rule (BKG-06 vs doc §7.2)               | No reschedule action for customers; cancel + rebook is the workaround                                                                         | Before pilot                               |
| Auth provider (§11.2 #2)                                    | Decides the reset-password screen, link vs code verification, resend, phone/OTP; none built beyond the request screens                        | Before pilot                               |
| Account rules (step 5)                                      | Whether unverified accounts may book (prototype: yes); what deletion removes or keeps, incl. upcoming bookings (doc §11.1); email change flow | Before pilot                               |
| Legal texts (step 11)                                       | Sign-up records consent to draft document versions (`config/legal.ts`)                                                                        | Before pilot                               |
| Old brand in storage keys                                   | `localStorage` keys keep the `glamspot-` prefix so existing sessions and tweaks survive; rename before launch (§13.9)                         |
| Design tweaks panel (temporary)                             | Dev-only tool for deciding tokens; must be removed after design sign-off (README, "Design tweaks panel")                                      | Design sign-off                            |
| Playwright Chromium not installed locally                   | `npm run test:e2e` needs `npm run test:e2e:install` or `PW_BROWSER_CHANNEL=chrome`                                                            | CI setup                                   |

### 13.6 Phase 4 — UI fidelity and quality audit (complete, 21 Oct 2026)

Full report: [`docs/ui-audit.md`](ui-audit.md). Every built screen was checked at 390 and 1440 px against the design, with a crawl for console errors, overflow, headings, names and broken links (128 links, 0 broken).

- **Fixed (16):**
  - The notification badge covered the bell.
  - Form controls are now a uniform 40px on the card colour.
  - One responsive section-heading token.
  - Mock notifications match the seeded bookings and link to them.
  - The open-status line wraps cleanly.
  - "Shop not found" and access denied get a page `<h1>`.
  - Date-strip scroll buttons on desktop.
  - My bookings actions stay right-aligned when they wrap.
  - Account pills show on section pages only on phones.
  - Price comes before History on phones.
  - Explore search is a landmark.
  - The footer theme toggle shows on phones only.
  - New `type-micro` and `card-surface` tokens replace arbitrary sizes and 14 copies of card classes.
  - Underline-tab styling moved into the `Tabs` line variant.
- **Accepted (2):** two search fields on Explore (desktop); dark-theme hero text colour.
- **Open (1):** notifications still read mock data from the layout until plan step 9 adds a service.
- **Verification:** `npm run check` (Vitest 16 files / 167 tests), `npm run build` and e2e 20/20 with `PW_BROWSER_CHANNEL=chrome` all pass.

### 13.7 Step 5 — onboarding, auth and account pages (complete, 21 Oct 2026)

Exit criterion met: a guest who starts booking can sign up and returns to the booking form (route test and e2e).

| Area                                | Done                                                                                                                                                                                                                                                                              | Where                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Welcome (design 1)                  | Full-bleed brand gradient with mark, wordmark, tagline, "Look Good / Feel Good / Do More", Get Started and Sign In. Same in both themes (scoped to the light palette)                                                                                                             | `routes/WelcomePage.tsx`, `components/layouts/WelcomeLayout.tsx`                       |
| Get started (design 2)              | Back, Skip (back to browsing, CUS-01), "How will you use GlamSpot?", customer and business-owner cards (icons stand in for photos, Q6); keeps `next`                                                                                                                              | `routes/GetStartedPage.tsx`, `features/auth/components/AccountTypeCard.tsx`            |
| Customer sign-up                    | Name, email, optional PH mobile, password with show/hide, acceptance of terms + privacy notice (recorded with document versions); taken email shown on the field; continues to verification with `next`                                                                           | `routes/SignUpPage.tsx`, `features/auth/components/SignUpForms.tsx`, `schemas/auth.ts` |
| Business sign-up (MER-01, doc §7.4) | Owner name, business name, email, mobile (required, ASSUMPTION: for business verification), password, terms + merchant policy + privacy notice; continues to verification, then `/business/onboarding` (step 7)                                                                   | `routes/BusinessSignUpPage.tsx`                                                        |
| Email verification                  | "Check your email" with Continue (verification isn't required to continue, see §13.5); token links confirm once and show success or "This link didn’t work"; in mock mode a labelled button opens the link the email would contain                                                | `routes/VerifyEmailPage.tsx`, `features/auth/components/MockVerificationLink.tsx`      |
| Forgot password                     | Same answer whether or not the account exists (no account discovery); the reset screen itself waits for the auth provider                                                                                                                                                         | `routes/ForgotPasswordPage.tsx`                                                        |
| Profile (CUS-06)                    | Name and mobile with Save / Reset; email with verified status and "Verify now"; reset password; sign out                                                                                                                                                                          | `routes/ProfilePage.tsx`, `features/account/components/ProfileForm.tsx`                |
| Privacy & data (CUS-06, doc §13.2)  | Accepted documents with version and date; privacy notice, correction and copy-of-data via support; account deletion as a confirmed request, not an instant delete                                                                                                                 | `routes/PrivacyPage.tsx`, `features/account/components/`                               |
| Data layer                          | `authService.signUp / verifyEmail / requestPasswordReset` and `profileService` (profile, consents, deletion request), HTTP halves on §7.3 endpoints only; mock accounts in their own store (`glamspot-mock-accounts`), passwords kept as a non-secure fingerprint, never as typed | `services/auth.service.ts`, `services/profile.service.ts`, `services/mock/accounts.ts` |
| Shared                              | `PasswordInput`, `Panel` (now also used by booking detail), `AuthPageHeader`                                                                                                                                                                                                      | `components/forms`, `components/shared`, `features/auth/components`                    |

**Not built, by design:** reset-password screen, resend verification and email change (depend on the auth provider and have no endpoint in §7.3); notification and marketing preferences (not in the doc's customer account list, §9.1).

**Open:** nothing links to `/welcome` yet. Guests land on Home and can browse without an account (CUS-01); whether first-time visitors should see the splash is a product decision.

**Verification:** `npm run check` (Vitest 18 files / 189 tests), `npm run build`, e2e 22/22 with `PW_BROWSER_CHANNEL=chrome`. Screenshots of every new screen at 390 and 1440 px, light and dark, including validation errors, check-your-email, verified, invalid link, reset sent, profile and the deletion dialog and requested state: no console errors and no horizontal overflow. Fixed during review: the Welcome splash in dark mode, and the active account pill now scrolls into view on phones.

### 13.8 Design tweaks panel (temporary, 21 Oct 2026)

Requested to speed up the open design decisions (palette, dark theme, radius, display font).

- **What it is:** a floating panel (`src/features/design-tweaks/`) that overrides design tokens live:
  - brand hue, primary strength and lightness;
  - background tint and lightness, per theme;
  - `--radius`;
  - the display font (installed fonts only).
- **Where values come from:** it reads the current values from `globals.css` at runtime, so nothing is duplicated, and never changes component styles.
- **Contrast:** six text/background pairs are checked against WCAG AA, with a summary next to the colour controls.
- **Keeping a choice:** **Copy CSS** exports the changed tokens ready to paste into `globals.css`, with a fallback text box where the clipboard isn't available. Tweaks persist per browser.
- **Availability:** on in `npm run dev`; in a build only with `VITE_DESIGN_TWEAKS=true`. The condition is inline in `App.tsx`, so production builds contain none of its code (checked: no `DesignTweaks` chunk in `dist/`).
- **Tests:** OKLCH parsing and contrast, token rules, CSS output, and the panel (live update, contrast warning, copy, reset, Escape and focus return).
- **Verification:** `npm run check` (20 files / 199 tests), build, e2e 22/22. Screenshots of a flagged build at 1440 and 390 px, light and dark, with tweaks applied and persisted across a reload.
- **Removal:** see README, "Design tweaks panel".

### 13.9 Brand name: Dapita (21 Oct 2026)

Answers Q5 and C12. The product owner chose **Dapita**: a local identity for a marketplace starting in Davao, warm and approachable, with the tagline **"Find your place. Book your service."**

- **Name:** `VITE_APP_NAME` now defaults to `Dapita` (`lib/env.ts`, `.env.example`), so the wordmark, document titles, footer, "How will you use Dapita?" and sign-in copy follow. `index.html` title, favicon comment, iCalendar `PRODID`/`UID` and code comments updated.
- **Tagline:** `config/brand.ts`. It replaces "Beauty • Grooming • Wellness • Lifestyle Near You" under the wordmark on the welcome screen (design 1) and the auth brand panel.
- **Booking references:** prefix `GS-` → `DP-` (generator and seed). `MOCK_DB_VERSION` bumped to 2, so browsers reseed the mock bookings once; requests made in the prototype before the change are dropped.
- **Unchanged:** the butterfly mark, palette and Playfair wordmark (no new identity assets were supplied); `localStorage` keys (`glamspot-*`), so sessions, mock accounts and design tweaks survive. Rename them before launch.
- The design reference still shows "GlamSpot"; the name is the only intended difference.

**Colour theme (same day):** the brand board's recommended **"Natural & Modern"** palette replaces the rose palette (`globals.css`, both themes):

- **Light theme values:**
  - `primary`: green #1B5E3F;
  - `secondary`/`accent`: peach #F7D5C6, with rose `secondary-foreground` for icons and initials on peach;
  - `background`: #FAF7F4;
  - `foreground`: #2D2D2D.
- **New tokens:**
  - `brand-accent`: pink #F1718D, used for the logo mark and the sidebar's active item;
  - `brand-deep`: replaces `plum`, the end colour of the banner gradients.
- **Logo:** at first a pink mark with a green wordmark, then replaced by the supplied artwork (below). The `onDark` option on `Logo` is for the sidebar. The `theme-color` is green.
- **Accessibility:** white text on the pink is 2.8:1, so the board's pink "Accent Button" with white text is not used. Actions stay green: white on green is 7.5:1. Every text pair passes WCAG AA in both themes.
- **Dark theme:** derived from the palette (green-tinted surfaces, light green primary). It is not in the brand board.
- **Not applied yet:** Poppins typography from the board, pending a decision.
- **Category circles:** plain white with a hairline border (card colour in dark mode) instead of peach, at the product owner's request.

**Logo artwork (same day):** the product owner supplied the logo (wordmark with a pink map pin and leaves). It replaces the butterfly mark and the Playfair wordmark.

- **Source:** `docs/brand/dapita-logo-source.png`, unchanged. `src/assets/brand/dapita-logo.png` is the same artwork, trimmed and scaled to 720 px wide.
- **On-dark copy:** `dapita-logo-on-dark.png` swaps the dark green for cream (#FAF7F4). It is used on green and dark surfaces: the welcome screen, the auth brand panel, the merchant sidebar and dark mode.
- **`Logo`:** shows the artwork, with the name as screen-reader text from `VITE_APP_NAME`. The artwork itself is fixed, so a rename now also needs new artwork.
- **`LogoMark`:** the pin redrawn as SVG for small sizes (the phone header, the collapsed sidebar) and the favicon. The redraw is approximate; replace it with a vector file from the designer when one exists, and also ask for the wordmark as SVG.

**Brand photos (22 Oct 2026):** answers Q6. The product owner generates the photos with AI from the prompts in `docs/image-prompts.md` and supplies them. The people and salons are fictional; real merchants will upload their own photos.

- **Set A is in:** five photos, as WebP at two widths each (`src/assets/brand/photos/`, listed in `config/brand-photos.ts`, drawn by `BrandPhoto` with `srcset`). The originals stay with the product owner.
- **Welcome (design 1):** the portrait fills the screen on phones, with a dark green fade at the top and bottom for the logo and white text. From `md` up, the page splits: text on green on the left, the photo on the right.
- **Auth brand panel:** the second portrait with the same top and bottom fade.
- **Home banner:** the wide salon photo with a green wash behind the text; the decorative circles and pin watermark are gone.
- **Get started (design 2):** the customer and business-owner cards show photos instead of icons; the `icon` prop became `photo`.
- **Dark mode:** these surfaces keep the light palette (`light` class), so text on photos stays white.
- **Set B is in (shop covers):** twelve photos, cropped to 16:9 around the subject so the 4:3 cards keep the people in frame, as one 1280 px WebP each (60–110 KB) in `public/images/shops/`. The mock seed sets each shop's `cover` photo with alt text; `MOCK_DB_VERSION` went to 3 so stored demo data reseeds. `BusinessPhoto` still has a single `url`: resized variants are for the real image service to provide.
- **Set C is in (staff):** five portraits, cropped to head and shoulders as 256 px square WebP (about 10 KB each) in `public/images/staff/`, set as each seeded staff member's `avatarUrl`. They show in the shop's staff list and the booking "Choose a professional" picker; the initials stay as the fallback. `MOCK_DB_VERSION` went to 4.
- **Set D, in progress (services):** The Good Cut Barbershop's six services are in, as 720 px square WebP (about 40 KB each) in `public/images/services/`. The seed's `servicesWithPhotos` list sets `photoUrl` for them; the service rows, service page and booking form already read it. `MOCK_DB_VERSION` went to 5.
- **Still to come:** the other shops' service photos and shop galleries (rest of Set D, Set E) keep the green placeholder until supplied.
