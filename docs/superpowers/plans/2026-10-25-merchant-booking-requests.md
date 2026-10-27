# Merchant Booking Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a shop owner see their bookings on `/business/bookings` and accept, decline or propose another time for a pending request, with a clash warning. The customer side then shows the result.

**Architecture:** Pure helpers in `src/lib/merchant-bookings.ts` handle tab grouping, sorting, deadlines and clashes. The mock service gains two proposal rules. Merchant TanStack Query hooks sit beside the customer hooks. A single page component serves `/business/bookings` and `/business/bookings/:bookingId`:

- **lg and up:** list and detail side by side, with the route param choosing the detail.
- **Below lg:** CSS shows only the list on the index route and only the detail on the `:bookingId` route.

The dialogs receive data and an `onSubmit` callback from the detail component, so they can be tested without a query client.

**Tech Stack:** React 19, TypeScript (strict), React Router (lazy routes), TanStack Query 5, React Hook Form and Zod, shadcn/ui (Radix), Tailwind 4, sonner, Vitest and Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-merchant-booking-requests-design.md`. Read it before each task, especially "Calls I made", "Clash warning" and "Behaviour".

**Repo note:** `D:\Workspace\TEMPLATE` is **not a git repository**. Wherever a task would commit, run `npm run check` instead and report the result. Don't run `git init` unless the user asks.

## Global Constraints

- Follow the DESIGN.md rules:
  - `card-surface` for every card, and no nested cards;
  - pill buttons (`shape="pill"`), with green as the only primary action colour;
  - no white text on the pink;
  - **Status Means State:** status tones only on `BookingStatusBadge`, never for urgency or clashes;
  - the `type-*` text scale.
- Two-column task layout `lg:grid-cols-[minmax(0,1fr)_22rem]` is the incumbent pattern. Here the detail is the wide column: use `lg:grid-cols-[22rem_minmax(0,1fr)]` with the list first and the detail sticky at `lg:top-24`.
- WCAG 2.2 AA. One `<h1>` per page. Every control has an accessible name. Dialogs trap focus (Radix does this).
- Use the existing formatters only (`formatTime`, `formatDay`, `formatAppointment`, `formatPrice`, `formatDuration` from `@/lib/format`; `formatTimeOfDay` from `@/lib/opening-hours`). The locale is `en-PH` and the time zone `Asia/Manila`, via `market`.
- Decline reason and proposal message: optional, `maxLength={bookingRules.reasonMaxLength}` (300), trimmed, with an empty value sent as `undefined`.
- Proposal lead time: `bookingRules.minLeadTimeMinutes + bookingRules.responseCutoffMinutes` (120 min).
- Copy, exact:
  - subtitle "Answer requests before they expire.";
  - tabs "Requests", "Upcoming", "Past";
  - empty states "No requests waiting. New requests from customers will appear here." / "No upcoming appointments." / "No past bookings yet.";
  - proposed label "New time proposed · waiting for customer";
  - clash footnote "Only bookings made on Dapita are checked.";
  - toasts "Booking confirmed. {name} can see it now." / "New time sent to {name}." / "Request declined.";
  - decline dialog title "Decline this request?", body "{name} will see that you declined, plus your reason if you give one.", buttons "Keep request" / "Decline request";
  - propose submit button "Send new time".
- `npm run check` (typecheck, lint, Prettier, Vitest) must pass at the end of every task.

## Review Focus

1. **A request expires while the owner is looking at it.** Accept returns a 409. Expected: the server message as a toast, the list and detail refetch, and the booking shows Expired with no buttons. Test: Task 5, "shows the server error and refetches on 409".
2. **"Any staff" requests.** `staffId: null` must clash with every overlapping booking, and the note must say the shop is busy rather than name a person. Test: Task 2, `findClashes` "any staff" case, plus `describeClash` wording.
3. **Back-to-back bookings.** A booking ending at 2:00 PM next to one starting at 2:00 PM is not a clash. Test: Task 2, "touching times are not clashes".
4. **Proposed-and-waiting bookings with a past time.** These must leave the Requests tab, so the tab doesn't fill with stale rows. Test: Task 2, `getMerchantTab` puts `alternative_proposed` in `past` once the **proposal's** end (`proposal.end`, not the original `end`) is ≤ now. (Corrected after the final review.)
5. **The deep link `/business/bookings/:id` for a booking of another shop, or one that doesn't exist.** Expected: an inline "We couldn’t find that booking." error state with a link back to the list, not a crash. Test: Task 6, "unknown booking id shows the not-found state".

---

### Task 1: Proposal rules in the mock service

**Files:**

- Modify: `src/lib/booking-status.ts` (add a constant next to `computeRespondBy`)
- Modify: `src/services/bookings.service.ts:355-377` (`respondToBooking`, propose branch)
- Test: `src/services/bookings.service.test.ts` (inside `describe('merchant responses (mock service)')`)

**Interfaces:**

- Produces: `export const proposalLeadMinutes: number` from `@/lib/booking-status`, equal to `bookingRules.minLeadTimeMinutes + bookingRules.responseCutoffMinutes`, with a doc comment explaining why: a sooner proposal would expire before the customer could answer.

- [ ] **Step 1: Write the failing tests.** Use `NOW` = Wed 21 Oct 2026, 11:00 Manila. The Good Cut is open 10:00–21:00. `bk_gc_carlos` is pending, `svc_cut_styling`.

```ts
it('rejects a proposed time when the shop is closed', async () => {
  signInAs('merchant')
  await expect(
    bookingsService.respondToBooking('bk_gc_carlos', {
      action: 'propose_alternative',
      start: zonedDateTime('2026-10-23', '22:00').toISOString(),
    }),
  ).rejects.toMatchObject({
    status: 422,
    message: 'The shop isn’t open for this service at that time. Choose another time.',
  })
})

it('rejects a proposed time the customer couldn’t answer in time', async () => {
  signInAs('merchant')
  await expect(
    bookingsService.respondToBooking('bk_gc_carlos', {
      action: 'propose_alternative',
      start: zonedDateTime('2026-10-21', '12:30').toISOString(), // 90 min from NOW
    }),
  ).rejects.toMatchObject({ status: 422, message: 'That’s too soon for the customer to answer. Choose a later time.' })
  const ok = await bookingsService.respondToBooking('bk_gc_carlos', {
    action: 'propose_alternative',
    start: zonedDateTime('2026-10-21', '13:00').toISOString(), // exactly 120 min
  })
  expect(ok.status).toBe('alternative_proposed')
})
```

- [ ] **Step 2: Run the tests and check they fail.** Run `npx vitest run src/services/bookings.service.test.ts`. Expected: the two new tests FAIL, and the existing ones still pass.

- [ ] **Step 3: Implement.** In the propose branch, after `validateFutureStart`:
  - if `start < addMinutes(now, proposalLeadMinutes)`, throw 422 with the "too soon for the customer" message;
  - load the business (`db.businesses.find((b) => b.id === booking.businessId)`) and throw the closed-shop 422 unless `isPreferredStartTime(business.hours, business.closures, start, booking.service.durationMinutes, now)` is true;
  - keep the existing "different time" check after these.

  Note: the 90-minute case passes `validateFutureStart` (60-min lead) and must hit the new check.

- [ ] **Step 4: Run the tests and check they pass.** Run `npx vitest run src/services/bookings.service.test.ts`. Expected: all PASS. If the existing "request → proposed time → customer accepts" test now fails because 16:00 on 23 Oct is inside the hours and more than 120 min away, the code is wrong. Fix the code, not the test.

- [ ] **Step 5: Checkpoint.** Run `npm run check` and make sure it passes.

---

### Task 2: Merchant booking helpers

**Files:**

- Create: `src/lib/merchant-bookings.ts`
- Test: `src/lib/merchant-bookings.test.ts`

**Interfaces:**

- Consumes: `Booking`, `BookingDetails`, `BookingStatus` from `@/types/booking`; `formatTime`, `formatWeekday` from `@/lib/format`; `toDateKey`, `addDays` from `@/lib/datetime`; `bookingRules`.
- Produces:
  - `export type MerchantTab = 'requests' | 'upcoming' | 'past'`
  - `export function getMerchantTab(booking: Pick<Booking, 'status' | 'end'>, now: Date): MerchantTab`
    - `pending` goes to `requests`.
    - `alternative_proposed` goes to `requests` while `end > now`, otherwise to `past`.
    - `confirmed` goes to `upcoming` while `end > now`, otherwise to `past`.
    - Everything else goes to `past`.
  - `export function groupMerchantBookings(bookings: BookingDetails[], now: Date): Record<MerchantTab, BookingDetails[]>`
    - `requests`: pending first, by `respondBy` ascending (missing `respondBy` last), then `alternative_proposed` by `start` ascending.
    - `upcoming`: by `start` ascending.
    - `past`: by `start` descending.
  - `export function nextPendingId(grouped: Record<MerchantTab, BookingDetails[]>, afterId: string): string | undefined`. Returns the first `pending` request in `grouped.requests` whose id isn't `afterId`.
  - `export interface Clash { booking: BookingDetails; start: string; end: string }`
  - `export function findClashes(target: Pick<Booking, 'id' | 'staffId'>, start: string, end: string, bookings: BookingDetails[]): Clash[]`
    - Candidates: every booking with `id !== target.id` whose status is `confirmed` (its `start`/`end`) or `alternative_proposed` (its `proposal.start`/`proposal.end`).
    - When `target.staffId` is set, keep only candidates with the same `staffId`.
    - Overlap means `start < otherEnd && otherStart < end`.
    - Sort by start.
  - `export function describeClash(clashes: Clash[], staffName: string | undefined): string | undefined`
    - Undefined for none.
    - One clash with staff: `"Ken already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz)."`
    - One clash without staff: `"The shop already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz)."`
    - A proposed clash says "a proposed time" instead of "a confirmed booking".
    - Two are joined with " and ". More than two: the first two, then `" +N more."`.
    - The time range uses `formatTime` on both ends. The first `formatTime` result drops its trailing " AM"/" PM" only when both ends share it.
  - `export function formatAnswerBy(respondBy: string, now: Date): { text: string; urgent: boolean }`
    - Urgent when `respondBy - now ≤ bookingRules.responseCutoffMinutes` minutes. Text: `"Answer within N min"`, with N = `Math.max(1, Math.ceil(minutes))`.
    - Otherwise `"Answer by today, 1:00 PM"`, `"Answer by tomorrow, 9:30 AM"` or `"Answer by Thu, 4:00 PM"`, comparing `toDateKey` of `respondBy` against today and `addDays(today, 1)`.

- [ ] **Step 1: Write the failing tests.** Build fixtures with a small `make(overrides)` function that returns a `BookingDetails` (spread a base object, cast as needed). Use `NOW = new Date('2026-10-21T03:00:00Z')` (11:00 Manila) and `zonedDateTime` for times. Tests:
  - `getMerchantTab`: one case per status. `alternative_proposed` and `confirmed` with past `end` go to `past`.
  - `groupMerchantBookings`:
    - requests are ordered pending by `respondBy`, then proposed;
    - past is newest first.
  - `nextPendingId`:
    - skips `afterId`;
    - skips proposed rows;
    - returns `undefined` when none are left.
  - `findClashes`:
    - same staff overlapping → 1;
    - other staff → 0;
    - `staffId: null` → clashes with other staff's booking;
    - **"touching times are not clashes"** (14:00–15:00 vs 15:00–16:00 → 0);
    - cancelled / declined / pending candidates are ignored;
    - a proposed candidate uses `proposal` times;
    - the target itself is excluded.
  - `describeClash`:
    - the exact strings above for staff, any staff, proposed, and 3 clashes (`" +1 more."`);
    - `undefined` for `[]`.
  - `formatAnswerBy`:
    - 45 min ahead → `{ text: 'Answer within 45 min', urgent: true }`;
    - same day 13:00 when NOW is 11:00 → `'Answer by today, 1:00 PM'`, not urgent;
    - next day → `'Answer by tomorrow, …'`;
    - two days → weekday form.

- [ ] **Step 2: Run the tests and check they fail.** Run `npx vitest run src/lib/merchant-bookings.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement the helpers** listed in Interfaces.

- [ ] **Step 4: Run the tests and check they pass.** Run `npx vitest run src/lib/merchant-bookings.test.ts`. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `npm run check`.

---

### Task 3: Merchant data hooks and the sidebar request count

**Files:**

- Create: `src/features/booking/api/merchant-queries.ts`
- Modify: `src/config/navigation.ts` (`NavItem`)
- Modify: `src/components/layouts/AppSidebar.tsx:35-62`
- Modify: `src/components/layouts/MerchantLayout.tsx`
- Test: `src/components/layouts/AppSidebar.test.tsx`, or add to an existing layout test if one exists. Render `AppSidebar`'s nav group as the existing tests render components, with `MemoryRouter` and `SidebarProvider`.

**Interfaces:**

- Consumes: `bookingsService.listBusinessBookings`, `getBusinessBooking`, `respondToBooking`, `MerchantResponse`; `bookingKeys` from `./queries`; `useSession` from `@/features/auth/api/queries`.
- Produces:
  - `export const merchantBookingKeys = { business: (businessId: string) => [...bookingKeys.all, 'business', businessId] as const, detail: (id: string) => [...bookingKeys.all, 'merchant-detail', id] as const }`
  - `export function useCurrentBusinessId(): string | undefined`, returning `user?.memberships[0]?.businessId` (MVP: one business, the same as `MerchantLayout`).
  - `export function useBusinessBookingsQuery(businessId: string | undefined)` (`enabled: !!businessId`).
  - `export function useBusinessBookingQuery(id: string | undefined)` (`enabled: !!id`).
  - `export function useRespondToBookingMutation()`, with `mutationFn: ({ id, response }: { id: string; response: MerchantResponse }) => …` and `meta: { showErrorToast: true }` (the default). Success toasts are left to the caller, because they include the customer's name. `onSuccess` writes the result into `merchantBookingKeys.detail(id)` and invalidates `bookingKeys.all`. That prefix covers the merchant list and any customer views.
  - `NavItem.count?: number`. When it is greater than 0 and the item isn't upcoming, `AppSidebar` renders a `SidebarMenuBadge` with the number (classes like the "Soon" badge, but `bg-sidebar-primary text-sidebar-primary-foreground tabular-nums`) and adds `<span className="sr-only">, {count} waiting</span>` inside the link label.
  - `MerchantLayout` maps `merchantNav` to set `count` on the `/business/bookings` item. The count is the number of `pending` bookings from `useBusinessBookingsQuery(useCurrentBusinessId())`.

- [ ] **Step 1: Write the failing test.** "shows a count badge for waiting requests": render a nav group with `{ title: 'Bookings', to: '/business/bookings', icon: CalendarCheckIcon, count: 3 }`. Expect `screen.getByRole('link', { name: 'Bookings, 3 waiting' })` and the visible text `3`. With `count: 0`, expect no badge text, and the link name to be `Bookings`.

- [ ] **Step 2: Run the test and check it fails.** Run `npx vitest run src/components/layouts/AppSidebar.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement** the hooks, `NavItem.count`, the badge, and the `MerchantLayout` wiring. If `AppSidebar` doesn't export the group renderer, export it or render `AppSidebar` with a `nav` prop, whichever the file allows without restructuring.

- [ ] **Step 4: Run the test and check it passes.** Same command. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `npm run check`.

---

### Task 4: Merchant wording in the timeline, and disabled and flagged time slots

**Files:**

- Modify: `src/features/booking/components/BookingTimeline.tsx`
- Modify: `src/features/booking/components/BookingPickers.tsx:140-175` (`TimeSlotGrid`)
- Possibly modify: `src/components/shared/ChoiceGroup.tsx`, only if the option label can't override the accessible name. `ChoiceOption` already has `disabled`.
- Test: `src/features/booking/components/BookingPickers.test.tsx`, `src/features/booking/components/BookingTimeline.test.tsx`

**Interfaces:**

- Produces:
  - `BookingTimeline({ events, viewer = 'customer' }: { events: BookingEvent[]; viewer?: 'customer' | 'merchant' })`. For `merchant`, the actor names are `customer: 'The customer'` and `merchant: 'You'`; admin and system are unchanged. The action text is the same for both viewers.
  - `TimeSlotGrid` gains `disabledTimes?: TimeOfDay[]` and `flaggedTimes?: TimeOfDay[]`.
    - A disabled time renders as a disabled option.
    - A flagged time keeps its visible label and adds a small dot (`aria-hidden`, `bg-foreground/60`, not a status colour). Its accessible name is `"2:00 PM, clashes with another booking"`.
    - The customer `BookingRequestForm` doesn't pass either prop and behaves as before.

- [ ] **Step 1: Write the failing tests.**
  - `TimeSlotGrid`: with `times={['14:00','14:30']}`, `disabledTimes={['14:00']}` and `flaggedTimes={['14:30']}`:
    - the radio named `2:00 PM` is disabled;
    - the radio named `2:30 PM, clashes with another booking` is enabled, and clicking it calls `onChange('14:30')`.

    Check the role ChoiceGroup actually renders (radio or button) and match it.

  - `BookingTimeline`: given a `submit` event by `customer` and a `propose_alternative` event by `merchant` with reason "Ken's free at 3", with `viewer="merchant"`:
    - the text "The customer sent the request" is present;
    - the text "You proposed another time" is present;
    - the text "“Ken's free at 3”" is present.

    Without `viewer`, the first line reads "You sent the request".

- [ ] **Step 2: Run the tests and check they fail.** Run `npx vitest run src/features/booking/components`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement** the props as listed in Interfaces.

- [ ] **Step 4: Run the tests and check they pass.** Same command. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `npm run check`.

---

### Task 5: The decline and propose dialogs, and the booking detail with actions

**Files:**

- Create: `src/features/merchant/components/DeclineReasonDialog.tsx`
- Create: `src/features/merchant/components/ProposeTimeDialog.tsx`
- Create: `src/features/merchant/components/ClashNote.tsx`
- Create: `src/features/merchant/components/MerchantBookingDetail.tsx`
- Test: `src/features/merchant/components/merchant-booking.test.tsx`

**Interfaces:**

- Consumes:
  - from Task 2: `findClashes`, `describeClash`, `formatAnswerBy`;
  - from Task 3: `useRespondToBookingMutation`;
  - from Task 4: `BookingTimeline viewer="merchant"`, `TimeSlotGrid disabledTimes/flaggedTimes`, `DayStrip`, `DayOption`;
  - `preferredStartTimes` with `{ leadMinutes: proposalLeadMinutes }`;
  - `useShopQuery(slug)` from `@/features/shops/api/queries`, which returns hours and closures;
  - `availableActions(status, 'merchant')`, `bookingStatusMeta`, `BookingStatusBadge`, `ConfirmDialog` (follow the customer cancel dialog in `BookingActions.tsx:66-120`).
- Produces:
  - `ClashNote({ text }: { text: string | undefined })`. Renders nothing for `undefined`. Otherwise it shows a neutral note (`TriangleAlertIcon aria-hidden`, `bg-muted`, `text-foreground`, `type-*` scale) with the text and the muted footnote "Only bookings made on Dapita are checked."
  - `DeclineReasonDialog({ customerName, open, onOpenChange, onSubmit }: { customerName: string; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (reason: string | undefined) => Promise<void> })`. Uses the exact copy from Global Constraints. The textarea has a visible counter `n/300`.
  - `ProposeTimeDialog({ booking, hours, closures, bookings, now, open, onOpenChange, onSubmit }: { booking: BookingDetails; hours: WeeklyHours; closures: ClosurePeriod[]; bookings: BookingDetails[]; now: Date; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (input: { start: string; message?: string }) => Promise<void> })`.
    - Uses React Hook Form with a Zod schema, `{ date: string, time: string, message: string max 300 }`.
    - Days cover `bookingRules.bookingWindowDays`. A day is disabled when it has no times, built the same way as `BookingRequestForm.tsx:70-80`.
    - `disabledTimes` contains the requested start's `TimeOfDay` when the selected date is the requested date.
    - `flaggedTimes` are the times where `findClashes(booking, start, start + duration, bookings)` isn't empty.
    - When a flagged time is selected, `ClashNote` shows under the grid.
    - A rejected `onSubmit` shows `error.message` in a `role="alert"` paragraph above the submit button, and the dialog stays open.
  - `MerchantBookingDetail({ booking, bookings, onAnswered }: { booking: BookingDetails; bookings: BookingDetails[]; onAnswered: (booking: BookingDetails) => void })`. Contains:
    - the facts list described in the spec ("Detail");
    - the note;
    - the proposal panel for `alternative_proposed`;
    - `ClashNote` for a pending booking (clashes at `booking.start`–`booking.end`);
    - the history;
    - actions: Accept (green pill), Propose time (outline pill), Decline (ghost with destructive text). They are shown only if they are in `availableActions` and are disabled while the mutation is pending.
    - On success: a `toast.success(...)` with the exact copy, then `onAnswered(result)`.
    - On error: the global error toast (from the query client) already shows. Also call `queryClient.invalidateQueries({ queryKey: bookingKeys.all })` so a 409 refetches.

- [ ] **Step 1: Write the failing tests.** Use Testing Library and userEvent, with fake `Date` at `NOW`. Use a fixture booking for Andrea: pending, `svc_cut_styling` 60 min, staff `stf_ken`, start Fri 23 Oct 14:00. Use the Good Cut hours `weekly('10:00','21:00')`; import the seed helper if it's exported, otherwise inline an all-week `WeeklyHours`. Tests:
  - "decline sends a trimmed reason or undefined": type " Fully booked ", click "Decline request", and expect `onSubmit` to be called with `'Fully booked'`. Then reopen with an empty textarea and expect `undefined`.
  - "propose disables the requested time and flags clashes": pass a second booking, confirmed, staff `stf_ken`, 23 Oct 15:00–15:30. Pick Fri 23 Oct. Then:
    - `2:00 PM` is disabled;
    - `3:00 PM, clashes with another booking` is enabled;
    - selecting it shows the text that starts "Ken already has a confirmed booking at 3:00–3:30 PM";
    - submitting calls `onSubmit({ start: zonedDateTime('2026-10-23','15:00').toISOString(), message: undefined })`.
  - "propose shows a server error inline": `onSubmit` rejects with `new Error('That’s too soon for the customer to answer. Choose a later time.')`. Expect `role="alert"` with that text, and the dialog still open.
  - "shows the server error and refetches on 409": render `MerchantBookingDetail` inside a `QueryClientProvider` with the service mocked (`vi.spyOn(bookingsService, 'respondToBooking').mockRejectedValue(new ApiError('This booking has expired.', 409))`). Click Accept, then expect `invalidateQueries` to have been called with `{ queryKey: ['bookings'] }` (spy on the client) and `onAnswered` not to have been called.

- [ ] **Step 2: Run the tests and check they fail.** Run `npx vitest run src/features/merchant`. Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** the four components as listed in Interfaces. `MerchantBookingDetail` loads the shop with `useShopQuery(booking.business.slug)` for the dialog's hours and closures. Propose time stays disabled until the shop has loaded.

- [ ] **Step 4: Run the tests and check they pass.** Same command. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `npm run check`.

---

### Task 6: The Bookings page, routes and the end-to-end round trip

**Files:**

- Create: `src/routes/MerchantBookingsPage.tsx`
- Create: `src/features/merchant/components/MerchantBookingRow.tsx`
- Create: `src/hooks/use-media-query.ts`
- Modify: `src/app/routes.tsx:298-321`. Replace both `planned(...)` entries with `lazy: page(() => import('@/routes/MerchantBookingsPage'))`. Keep the `handle` crumbs; the `:bookingId` crumb is "Booking details".
- Test: `src/routes/MerchantBookingsPage.test.tsx`, `e2e/app.spec.ts`

**Interfaces:**

- Consumes: Tasks 2, 3 and 5; `ScreenHeader`, `Tabs`, `EmptyState`, `ErrorState`, `Skeleton`, `useNow`, `useDocumentTitle`.
- Produces:
  - `useMediaQuery(query: string): boolean`, built with `useSyncExternalStore` like `src/hooks/use-mobile.ts` (server snapshot `false`).
  - `MerchantBookingRow({ booking, now, selected, to })`. A `Link` to `to` that shows:
    - name, service, `formatAppointment(start)`, and staff name or "Any staff";
    - for pending: the `formatAnswerBy` text. When urgent, it's `font-medium text-foreground` with `Clock3Icon`; otherwise `text-muted-foreground`.
    - for alternative proposed: "New time proposed · waiting for customer";
    - otherwise: `BookingStatusBadge`.

    The selected row gets `aria-current="true"` and a green ring, as in the mockup.

**Page behaviour:**

- `useDocumentTitle('Bookings')`. There's one `<h1>` from `ScreenHeader`: title "Bookings", with the spec's description.
- Tab: `?tab=requests|upcoming|past`, default `requests`. Follow `MyBookingsPage.tsx:28-56`, with the counts shown in the triggers.
- Data:
  - `businessId = useCurrentBusinessId()`;
  - `list = useBusinessBookingsQuery(businessId)`;
  - `grouped = groupMerchantBookings(list.data, now)`.
- The selected booking is `params.bookingId`, or on the index route the first row of the current tab. Detail data comes from `useBusinessBookingQuery(params.bookingId)` when there's a param; otherwise it's the list item. Rows link to `/business/bookings/{id}?tab={tab}`.
- Layout: `grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8`.
  - The list column is `hidden lg:block` when there's a `bookingId` param.
  - The detail column is `hidden lg:block` on the index route, and is sticky with `lg:sticky lg:top-24 lg:self-start`.
  - The detail sits inside a `card-surface rounded-3xl` container. Rows are not cards inside that card, because the list is a separate column.
  - On the `:bookingId` route there's a back link, `lg:hidden`: "← All bookings" to `/business/bookings?tab={tab}`.
- `onAnswered(result)`:
  - with `isLg = useMediaQuery('(min-width: 1024px)')`, compute `next = nextPendingId(grouped, result.id)`. If `isLg` and `next`, navigate to `/business/bookings/{next}?tab=requests`. Otherwise navigate to `/business/bookings?tab=requests` (`replace: true` both times).
  - Then move focus to the next row's link if there is one, otherwise to the empty-state heading (give it `tabIndex={-1}` and a ref).
- States:
  - loading: 4 `Skeleton` rows;
  - list error: `ErrorState` with retry, `list.refetch`;
  - empty tab: `EmptyState` with the exact copy;
  - detail query error with status 404: `ErrorState` titled "We couldn’t find that booking." with a link back to the list.

- [ ] **Step 1: Write the failing page tests.** Render the routes with `createMemoryRouter`, a `QueryClientProvider`, and the merchant signed in via `MOCK_SESSION_KEY` as in `bookings.service.test.ts`. Mock `delay` and use fake `Date`. Tests:
  - "lists pending requests first with their deadline": on `/business/bookings`, the Requests tab is selected and its rows include the three seeded pending requests: "Carlos Tan", "Bea Villanueva" and the prototype customer (`mockUsers.customer.name`). Each row shows text matching `/^Answer by|^Answer within/`.
  - "unknown booking id shows the not-found state": `/business/bookings/bk_nope` shows "We couldn’t find that booking." and a link to `/business/bookings`.
  - "accepting moves the booking to Upcoming": open Carlos, click Accept, then expect the toast text "Booking confirmed. Carlos Tan can see it now." (render `<Toaster />`) and Carlos listed under `?tab=upcoming`.

- [ ] **Step 2: Run the tests and check they fail.** Run `npx vitest run src/routes/MerchantBookingsPage.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement** `useMediaQuery`, `MerchantBookingRow`, `MerchantBookingsPage` and the route change.

- [ ] **Step 4: Run the tests and check they pass.** Same command. Expected: PASS.

- [ ] **Step 5: Add the e2e test** to `e2e/app.spec.ts`: "a business owner accepts a request and the customer sees it confirmed". It uses the existing `signInWithPrototypeAccount`:
  - sign in as "Business owner";
  - go to `/business/bookings/bk_andrea_pending`;
  - click `getByRole('button', { name: 'Accept' })`;
  - expect the toast "Booking confirmed. Andrea Reyes can see it now.";
  - sign out the way the other specs do, or clear storage and reload;
  - sign in as "Customer";
  - go to `/bookings/bk_andrea_pending` and expect the status text "Confirmed";
  - call `expectNoHorizontalOverflow(page)` on the merchant page.

  Check how the seeded customer's name renders (`mockUsers.customer.name`) and use that exact name.

- [ ] **Step 6: Run e2e.** Run `npx playwright test e2e/app.spec.ts -g "accepts a request"`. Expected: PASS on the configured projects (desktop and mobile).

- [ ] **Step 7: Visual check.** Use `C:\Users\info\AppData\Local\Temp\claude\D--Workspace-TEMPLATE\3ccc5941-469a-44a6-9e15-8f994a32bf67\scratchpad\shots.mjs`, or Playwright directly against the running dev server on :5173. Take screenshots as Business owner of `/business/bookings`, `/business/bookings/bk_andrea_pending`, the Propose time dialog and the Decline dialog, at 1440×900 and 390×844. Check against DESIGN.md:
  - one green action;
  - no status colour used for urgency;
  - no nested cards;
  - no horizontal scroll.

  Fix everything in one batch and confirm with at most one more round.

- [ ] **Step 8: Checkpoint.** Run `npm run check`, then append a short entry to `docs/ui-audit.md` ("Merchant bookings, 25 Oct 2026") listing the screens checked.
