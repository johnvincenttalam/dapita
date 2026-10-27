# Merchant booking requests: design

Date: 25 Oct 2026 · Status: draft for approval · Priority: P0 (MER-04, BKG-02, BKG-03)

## Intent

A shop owner can't answer booking requests yet: `/business/bookings` and `/business/bookings/:bookingId` are `planned(...)` placeholders. Answering requests is the core of the request-to-confirm model, which is how a customer's request becomes a confirmed appointment (PRODUCT.md, "Request-to-confirm by default"). The customer side already handles every outcome: Confirmed, Declined, and New time proposed with Accept / Keep my original time. This work builds the merchant half, so the full round trip works in mock mode. That round trip is the acceptance test in `docs/implementation-plan.md` §15 step 7: "Full request → accept → customer sees Confirmed round-trip".

## Goals

- The owner sees every booking for their shop on one Bookings page, with the requests that need an answer first.
- From that page the owner can **Accept**, **Decline** (optional reason) or **Propose time** for a pending request.
- The answer reaches the customer's screens through the existing mock service and state machine, with no customer-side changes.
- The page works at desktop width (the main use, per PRODUCT.md) and at 390px.

## Non-goals

- The Dashboard overview / "Needs your answer" panel (mockup option C). This is a separate piece of work.
- Complete and no-show (`recordOutcome`, P1).
- The Calendar view, staff accounts, and a business switcher. MVP owners have one business: use `user.memberships[0]`, as `MerchantLayout` does.
- Merchant-initiated cancellation of a confirmed booking. The state machine allows it, but it isn't part of this request.
- Real notifications (the notifications service is still a placeholder).

## Anti-goals (a failure even if it works)

- Showing an "alternative proposed" booking as confirmed, or listing it under Upcoming as if it were agreed. PRODUCT.md principle 1.
- Inventing data: no fake customer phone numbers, ratings or counts. A missing phone means the row is left out.
- Letting the owner propose a time when the shop is closed, or the same time that was requested.
- A request that silently disappears after an answer, with no confirmation of what happened.

## What the user decided

- **Layout B, list + detail** (mockup in `.superpowers/brainstorm/…/requests-layout.html`). On desktop, a list on the left and the selected booking's details and actions on the right. On phones, the list and detail are separate screens.
- **Propose time is in the first version.**
- **Show a clash warning** when accepting or proposing would overlap another booking (see "Clash warning").
- Proceed with the description played back in chat, including the calls marked as guesses there. These are listed below.

## Calls I made (marked as such; easy to change)

1. **Decline reason is optional**, 300 characters max (`bookingRules.reasonMaxLength`). The customer sees it. The user didn't answer this question.
2. **Tabs:** _Requests_, _Upcoming_, _Past_.
   - _Requests_ = `pending` plus `alternative_proposed` whose time hasn't passed. It lists pending first, sorted by `respondBy` with the soonest first, then proposed ones in a quieter style labelled "New time proposed · waiting for customer".
   - _Upcoming_ = `confirmed` with `end` in the future, soonest first.
   - _Past_ = everything else (declined, expired, cancelled, completed, no-show, past confirmed), most recent first.

   This is a merchant-specific grouping. Don't reuse `getBookingTab`, which is the customer's.

3. **Urgency without colour.** DESIGN.md's Status Means State rule forbids using status colours for urgency, so the deadline never takes the warning tone. Every deadline is muted text with relative-day wording ("Answer by today, 1:00 PM", "Answer by tomorrow, 9:30 AM", "Answer by Thu, 4:00 PM"). When `respondBy` is within 60 minutes, the text switches to the foreground colour at medium weight, adds a clock icon, and reads "Answer within 45 min". (The mockup's amber deadlines are superseded.)
4. **Sidebar count:** the Bookings nav item shows a badge with the number of `pending` requests. `AppSidebar` already renders `SidebarMenuBadge`, so check how it's fed. `NavItem` has no count field, so the builder decides how to supply one.
5. **After an answer:** show a success toast, move the booking to its new place, and select the next pending request in the list. If there is none, show the empty state. On phones, return to the list.
6. **The proposal check in the mock:** `respondToBooking` for `propose_alternative` currently checks only lead time and the 30-day window. Add the same opening-hours check as `createBooking` (`isPreferredStartTime(business.hours, business.closures, start, durationMinutes, now)`). Reject with 422 "The shop isn't open for this service at that time. Choose another time." The existing "same time" check stays.
7. **History in the detail panel:** show the booking's audit trail with the existing `BookingTimeline` component, with merchant wording where the labels differ. Entries read "You proposed another time", plus the message if there was one. Events don't store the proposed start, and that won't change here. The current proposal's time is shown in the proposal panel.
8. **Earliest proposable time.** A proposal's deadline is clamped to 60 minutes before the proposed start (`computeRespondBy`). Without a check, a proposal for one hour from now would expire immediately. So proposals must start at least `responseCutoffMinutes + minLeadTimeMinutes` (120 min) from now, which gives the customer about an hour to answer. The grid filters with `leadMinutes: 120`. The mock rejects anything sooner with 422 "That's too soon for the customer to answer. Choose a later time." and has a test for it. This works as config, not a new constant. The same edge exists for a customer's request made exactly 60 minutes ahead; it isn't fixed here and has been noted for the product owner.

## Behaviour

### Bookings page (`/business/bookings`)

- Page header: "Bookings", with the subtitle "Answer requests before they expire."
- Tabs show counts, for example "Requests (3)". The selected tab is stored in the URL (`?tab=`) so it survives a refresh.
- **Desktop (lg and up):** a two-column task layout as in DESIGN.md (`lg:grid-cols-[…]`). The detail pane is sticky. The selected booking id is in the URL (`?booking=` or the nested route; the builder decides) so it can be linked and survives a refresh. With nothing selected, the first row is selected.
- **Below lg:** the list only. Tapping a row goes to `/business/bookings/:bookingId`, which shows the same detail component full width with a back link to the list (keep the tab).
- **List row:** customer name, service, requested day and time, the deadline (pending) or status badge (others), and the staff name or "Any staff". Use the existing `BookingStatusBadge` for status.
- **Empty states**, honest and specific:
  - Requests: "No requests waiting. New requests from customers will appear here."
  - Upcoming: "No upcoming appointments."
  - Past: "No past bookings yet."
- **Loading:** skeleton rows. **Error:** an inline retry, following existing patterns.

### Detail (shared by the pane and the phone page)

- Customer name and status badge; reference code (`booking.reference`).
- A facts list:
  - service and duration, requested date and time, and staff;
  - price, formatted the way the customer side formats `ServicePrice`;
  - the customer's mobile and email from `contact`; leave out any that are missing.
- The customer's note, if there is one.
- When a time is proposed: a panel with the proposed time, the message, and "Waiting for the customer to accept your proposed time." (`bookingStatusMeta.alternative_proposed.merchantDescription`), plus the respond-by deadline.
- History (call 7).
- **Actions**, shown only when `availableActions(status, 'merchant')` includes them:
  - **Accept** (primary green pill): no dialog, because it's reversible enough for a request-to-confirm flow. Toast: "Booking confirmed. {customer} can see it now."
  - **Propose time** (outline pill): opens the Propose time dialog.
  - **Decline** (destructive-ghost): opens the Decline dialog.
- Buttons are disabled while a request is in flight. A 409 (for example the booking expired, or the customer cancelled in the meantime) shows the server message and refetches.

### Clash warning (user decision)

The user asked for a warning when an answer would double-book. It is a **warning, not a block**: the owner knows their shop, for example a spare chair or a second barber. Nothing changes on the server.

- **What counts as a clash:** another booking for the same business in `confirmed` or `alternative_proposed` (counting its proposed time) whose time overlaps the time in question. Overlap means `start < otherEnd && otherStart < end`.
  - If the booking has a staff member, only that staff member's bookings count.
  - If it's "Any staff" (`staffId: null`), every booking counts, but the wording says the shop is busy, not a named person (_my call_).
- **The data:** comes from the merchant list query the page already loads, so no new request is needed. It goes in a pure helper with unit tests, for example `findClashes(booking, start, end, allBookings)`.
- **In the detail panel:** for a pending request whose requested time clashes, a note sits above the actions with an alert icon, in neutral styling because Status Means State: "Ken already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz)." With several clashes it lists up to two, then "+N more". Accept stays enabled.
- **In the Propose time dialog:** a clashing slot stays selectable but carries a small marker plus an accessible label ("2:00 PM, clashes with another booking"). Choosing one shows the same note under the grid.
- **Honesty:** the warning only knows about bookings made through Dapita. Walk-ins and phone bookings aren't in the data. Light helper text under the note says so once: "Only bookings made on Dapita are checked."

### Propose time dialog

- Reuses `DayStrip` and `TimeSlotGrid` from `BookingPickers.tsx`. Times come from `preferredStartTimes(hours, closures, dateKey, service.durationMinutes, now)`. The originally requested start is shown but disabled.
- `BookingDetails.business` has no hours or closures, so the builder fetches them with the existing shops service and query hooks, by `business.slug` or id.
- An optional message, with the same 300-character limit, shown to the customer.
- Submit: "Send new time". Toast: "New time sent to {customer}."
- Validation with Zod + React Hook Form, following `BookingRequestForm`. Server 422s appear inline above the submit button.

### Decline dialog

- Title: "Decline this request?". Body: "{customer} will see that you declined, plus your reason if you give one."
- An optional reason textarea with a counter (300 characters max).
- Buttons: "Keep request" and "Decline request" (destructive). Toast: "Request declined."

## Data layer

- Add merchant hooks next to the customer ones in `src/features/booking/api/queries.ts`, or in a sibling merchant file:
  - `useBusinessBookingsQuery(businessId)`;
  - `useBusinessBookingQuery(id)`;
  - `useRespondToBookingMutation()`.

  Give them their own query-key branch (for example `bookingKeys.business(businessId)` and `bookingKeys.merchantDetail(id)`). On success, write the returned booking into the merchant detail cache and invalidate the merchant list. Also invalidate `bookingKeys.all`, so a customer view open in the same browser refreshes.

- Use the existing `bookingsService.listBusinessBookings`, `getBusinessBooking` and `respondToBooking`. These already scope by membership and run the state machine. Apart from call 6, no service changes are expected.
- Expiry: the mock runs `expireOverdue` on reads, so a refetch on window focus or tab change picks up expired requests. No polling is needed.

## Constraints

- Follow DESIGN.md:
  - `card-surface` for cards and no nested cards;
  - pill buttons, and green is the only primary action colour;
  - no white text on pink;
  - status colours mean state only;
  - the `type-*` scale.
- WCAG 2.2 AA:
  - the list is keyboard-operable;
  - the selected row is exposed with `aria-current` or as a listbox with selection, whichever fits the markup;
  - dialogs trap focus;
  - after an answer, focus moves to something sensible, such as the next row or the empty state.
- One `<h1>` per page.
- English, `en-PH`, `Asia/Manila`. Use the existing datetime and price formatters, not new ones.
- Replace both `planned(...)` merchant booking routes with `lazy: page(() => import('@/routes/…'))`.
- Tests:
  - Vitest for the merchant tab grouping and sorting, the clash helper (same staff, any staff, edge-touching times aren't clashes, cancelled and declined bookings are ignored), the respond mutation's cache behaviour (or the service), and the new opening-hours rejection in `respondToBooking`;
  - extend the existing service tests where they live;
  - a Playwright flow if it fits `e2e/app.spec.ts`: sign in as the owner, accept Andrea's pending request, sign in as the customer, see Confirmed.

  `npm run check` must pass.

## Left to the builder

- The file and component names. The plan suggests `BookingRequestActions`, `ProposeTimeDialog` and `DeclineReasonDialog` (implementation-plan §8); folder `src/features/merchant/` or `src/features/booking/merchant/`.
- Whether the desktop selection uses a query param or a nested route.
- How the sidebar badge count is supplied.
- The exact skeleton and spacing details within DESIGN.md.
