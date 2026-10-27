# UI fidelity and quality audit

**Date:** 21 Oct 2026 · **Build audited:** production build (`npm run build` + `vite preview`) with mock data · **Reference:** the 12-screen design showcase and the project documentation (business rules win over images, plan §1).

## Scope and method

| What                 | How                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screens              | Every built screen: home, explore (results, empty, filter sheet), category (list, coming soon, not found), shop (profile, not found), service, sign-in, book (service picker, form), request sent, My bookings (3 tabs), booking detail (proposal, confirmed), 404, access denied, merchant and admin shells, planned placeholders |
| Viewports and themes | 390×844 (touch) and 1440×900; light everywhere, dark for home, shop, booking form, booking detail, sign-in and merchant shell                                                                                                                                                                                                      |
| Visual comparison    | Screenshots side by side with design screens 3, 5, 6, 7, 10, 11 and 12                                                                                                                                                                                                                                                             |
| Automated crawl      | 35 routes × 2 viewports as guest, customer, merchant and admin: console warnings and errors, failed requests, horizontal overflow, `<h1>` count, controls without an accessible name, duplicate ids, images without `alt`, targets under 24px; then every internal link found (128) opened and checked for the 404 or error page   |
| Interaction          | Dialogs (cancel booking), dropdowns (account menu, theme, notifications, explore selects), the filter sheet, mobile merchant sidebar, tabs, booking form validation, accept a proposed time                                                                                                                                        |
| Code                 | Hard-coded colours, arbitrary values, duplicated styling, unused modules, broken routes; `npm run check`, `npm run build`, Playwright e2e                                                                                                                                                                                          |

Severity: **High**: visibly broken or blocks a task. **Medium**: inconsistent, confusing or an accessibility gap. **Low**: polish or maintainability.

## Results at a glance

| Check                                       | Before                                           | After                        |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| TypeScript, ESLint, Prettier                | Pass                                             | Pass                         |
| Unit and route tests (Vitest)               | 166 passed                                       | 167 passed                   |
| E2E (Playwright, desktop + Pixel 7)         | 20 passed                                        | 20 passed                    |
| Production build                            | Pass                                             | Pass                         |
| Console errors or warnings, failed requests | 0                                                | 0                            |
| Horizontal overflow                         | 0 pages                                          | 0 pages                      |
| Broken internal links                       | 0 of 128                                         | 0 of 128                     |
| Pages without exactly one `<h1>`            | 3 (shop not found, unlisted shop, access denied) | 0                            |
| Unused modules / broken routes              | 0 / 0                                            | 0 / 0                        |
| Findings                                    | 1 High, 7 Medium, 11 Low                         | 16 fixed, 2 accepted, 1 open |
| Browser pass findings (B-01 to B-05)        | 1 Medium, 4 Low                                  | 5 fixed                      |

## Findings

### Whole application

| ID   | Where                                      | Severity | Issue                                                                                                                                                                                                                                                                                | Fix                                                                                                                                                                      | Status |
| ---- | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| G-01 | Header bell (marketplace, merchant, admin) | High     | The unread-count badge sat on top of the bell and hid it.                                                                                                                                                                                                                            | Badge moved to the button corner with a background-coloured ring (`NotificationsMenu`).                                                                                  | Fixed  |
| G-02 | All forms and filters                      | Medium   | Inputs, textareas and selects were 32px tall on a transparent background, while search fields were 40px on white. The Explore filter row was misaligned, and the booking and sign-in fields were small for touch.                                                                    | `Input`, `Textarea`, `InputGroup` and the default `SelectTrigger` are now 40px on the card colour; per-page overrides removed.                                           | Fixed  |
| G-03 | Section headings                           | Medium   | Two heading styles: 20px `type-heading` (home) and 18px `text-lg font-semibold` written by hand in 11 places, so "Featured shops" and "Featured services" differed.                                                                                                                  | `type-heading` is now 18px on phones (as in the design) up to 20px on desktop and is used for every section `<h2>`; form sub-sections and legends use `type-subheading`. | Fixed  |
| G-04 | Notifications menu                         | Medium   | The mock notifications contradicted the mock data: a "Men's Haircut" request the customer doesn't have, a "New message" although messaging isn't built, Serenity "awaiting review" although it's live. Fixed dates were going stale, and opening a notification only marked it read. | Notifications now describe seeded bookings, use times relative to now, and link to the booking or page they're about.                                                    | Fixed  |
| G-05 | Tab bar, "Soon" badges, logo, counter      | Low      | Arbitrary font sizes (`text-[10px]`, `text-[0.625rem]`, `text-[0.6875rem]`) in 5 components.                                                                                                                                                                                         | New `type-micro` token.                                                                                                                                                  | Fixed  |
| G-06 | Cards and panels                           | Low      | The card surface (`bg-card shadow-sm ring-1 ring-foreground/5`) was repeated in 14 places.                                                                                                                                                                                           | New `card-surface` utility in `globals.css`.                                                                                                                             | Fixed  |
| G-07 | Shop and My bookings tabs                  | Low      | The brand underline-tab styling was copied into both pages.                                                                                                                                                                                                                          | Moved into the `Tabs` line variant.                                                                                                                                      | Fixed  |
| G-08 | Footer                                     | Low      | Two theme toggles on desktop (header and footer).                                                                                                                                                                                                                                    | The footer toggle shows only below `sm`, where the header has none.                                                                                                      | Fixed  |
| G-09 | `NotificationsMenu`                        | Low      | A layout component reads `services/mock/notifications` directly, so there is no production service to swap in.                                                                                                                                                                       | Add a notifications service and query when notifications are built (plan step 9).                                                                                        | Open   |

### Home, explore and category

| ID   | Where                               | Severity | Issue                                                                                                         | Fix                                                                                | Status   |
| ---- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| P-01 | Shop cards and rows (narrow widths) | Medium   | The open status wrapped with the separator starting the second line ("Closed" / "· Opens tomorrow 10:00 AM"). | The separator stays with the label, so it wraps as "Closed ·" / "Opens tomorrow…". | Fixed    |
| P-02 | Explore                             | Low      | The page's search form was not a search landmark (the header one was).                                        | `role="search"` added.                                                             | Fixed    |
| P-03 | Explore, desktop                    | Low      | Two search fields: the header's and the page's.                                                               | Kept: the header search is global and both lead to the same results.               | Accepted |
| P-04 | Home, dark theme                    | Low      | The hero text turns dark on pink in dark mode (white on raspberry in light).                                  | Kept: the dark theme isn't in the design and the contrast passes.                  | Accepted |

### Shop, service and access states

| ID   | Where                                          | Severity | Issue                                                                              | Fix                                                                     | Status |
| ---- | ---------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| P-05 | Shop not found or not listed                   | Medium   | No `<h1>` and no back header, unlike "Service not found" and "Category not found". | `ScreenHeader` "Shop not found" with Back added.                        | Fixed  |
| P-06 | Access denied (e.g. a customer at `/business`) | Medium   | No `<h1>`; the title was 14px text.                                                | `EmptyState` gained `pageTitle`, which renders the title as the `<h1>`. | Fixed  |

### Booking journey

| ID   | Where                                  | Severity | Issue                                                                                                                           | Fix                                                                                             | Status |
| ---- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| P-07 | Book appointment, desktop              | Medium   | The 30-day date strip is cut off at the right, with no way to scroll it using a mouse.                                          | "Earlier dates" / "Later dates" buttons from `md` up, with scroll snapping. Phones still swipe. | Fixed  |
| P-08 | My bookings, phone                     | Low      | When a card's actions wrapped (confirmed bookings), the buttons jumped to the left edge.                                        | Actions stay right-aligned when they wrap.                                                      | Fixed  |
| P-09 | Booking detail and request sent, phone | Low      | The account pill row (My bookings, Inbox, Favorites…) repeated above the back header, pushing content down; design 11 has none. | The pills show on account section pages only; nested pages keep their back header.              | Fixed  |
| P-10 | Booking detail, phone                  | Low      | History comes before Price, because the side column stacks under the main one.                                                  | History now follows Price and the policy on phones; on desktop it stays under the appointment.  | Fixed  |

### Browser pass, 21 Oct 2026 (dev server, Chrome)

A second look at every main customer page, at desktop width and at 390px, in light and dark. Design-tweak overrides were switched off so the real tokens were reviewed. Afterwards `npm run check` reported 199 passed and e2e 22 passed.

| ID   | Page / component                                                          | Severity | Issue                                                                                                                                                     | Fix                                                                                                                                             | Status |
| ---- | ------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| B-01 | Date strip (book), Featured shops row (home), account pills, filter chips | Medium   | Scrolling rows snapped or scrolled their first or active item to the screen edge, losing the 16px gutter (the date strip loaded with "Today" flush left). | `scroll-px-4` / `sm:scroll-px-6`, matching each row's padding, so snapping and `scrollIntoView` respect the gutter.                             | Fixed  |
| B-02 | Book appointment, desktop (Windows)                                       | Low      | The date strip showed a grey native scrollbar under the dates, repeating the ‹ › buttons.                                                                 | Scrollbar hidden, as in `HorizontalScroller`. Phones swipe; mouse users have the buttons.                                                       | Fixed  |
| B-03 | `ShopCard` (home, phone)                                                  | Low      | "No reviews yet" and "From ₱…" were on one line or two depending on the price's digits, so cards next to each other didn't match.                         | The row stacks based on the card's width (container query), not on how long the text is.                                                        | Fixed  |
| B-04 | `ShopCard`, `ShopListItem`                                                | Low      | The verified tick could wrap onto a line of its own ("The Good Cut Barbershop" in Explore on a phone).                                                    | New `ShopNameLink` keeps the tick with the last word; the link's name is still just the shop name, with "Verified business" for screen readers. | Fixed  |
| B-05 | Design tweaks tab (temporary, dev only)                                   | Low      | On phones the vertical tab covered page content: the Barber category, the "Any available" staff option, footer links.                                     | Icon only below `sm`; its accessible name is unchanged.                                                                                         | Fixed  |

### Polish pass, 25 Oct 2026 (dev server, Chrome)

Fourteen screens checked at 1440px and 390px as a guest, customer and merchant. Afterwards `npm run check` reported 199 passed.

| ID   | Page / component                 | Severity | Issue                                                                                                                 | Fix                                                                                                                                                           | Status |
| ---- | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| U-01 | Book appointment, service picker | Medium   | On desktop the menu ran the full 1,200px width with Book buttons far from the service; phones didn't show which shop. | The menu sits in a card using the booking form's columns, with a sticky shop card (photo, area, open status, booking method). Phones show a compact shop row. | Fixed  |
| U-02 | `BookingCard` (My bookings)      | Medium   | Every card showed the same store-icon placeholder, although every seeded shop has a cover photo.                      | `BookingDetails.business.coverPhotoUrl` is set from the shop's cover photo and shown on the card.                                                             | Fixed  |
| U-03 | Profile, desktop                 | Low      | The name and mobile fields stretched about 900px wide.                                                                | Fields are capped at `max-w-lg`; Reset and Save sit in a separate footer row.                                                                                 | Fixed  |
| U-04 | Get started, desktop             | Low      | The choice hugged the top of the screen, with no logo, leaving the lower half empty.                                  | Vertically centred from `md` up, with the logo between Back and Skip.                                                                                         | Fixed  |
| U-05 | Welcome, desktop                 | Low      | A centred logo over a left-aligned headline.                                                                          | From `md` up the logo and tagline are left-aligned with the headline. Phones are unchanged (design screen 1).                                                 | Fixed  |
| U-06 | Shop location map, desktop       | Low      | The 16:9 map was about 480px tall, pushing policies down.                                                             | 21:9 from `lg` up.                                                                                                                                            | Fixed  |

## Checked and working

- **Navigation:** header, bottom tab bar (active state per section), breadcrumbs, footer, account nav, merchant and admin sidebars (sheet on phones), back buttons; all 128 internal links resolve.
- **Forms:** booking form validation (time and policy required, aria-invalid, messages per field), sign-in validation, cancel-booking reason.
- **Search and filtering:** header search → Explore with `?q=`; chips, area, price, open-now and sort kept in the URL; filter sheet on phones with result count; empty result with "Clear filters".
- **Dialogs and dropdowns:** cancel dialog shows the policy first; account menu, theme submenu, notifications popover, selects.
- **States:** loading skeletons (home, explore, shop), empty (explore, My bookings tabs), not found (category, shop, service, booking, 404), error states with retry (covered by tests), success (request sent, accepted proposal).
- **Controls that do nothing:** none found. Planned routes say "Screen planned" with priority and design reference; the header's "Davao City" is plain text, not a fake dropdown.

## Crawler results that are not issues

- Radix checkboxes add a hidden `aria-hidden` input with no name; the visible checkbox is labelled.
- The skip link is 1px until focused.
- Card titles and breadcrumbs are inline text links; card titles also stretch over the whole card.
- The 16px policy checkbox and the 32×18 "Open now" switch are under 24px but have clickable labels and enough spacing (WCAG 2.5.8 spacing exception).

## Remaining limitations

- **Photos:** there are no licensed photos (plan Q6), so covers, avatars and service images use the category icon on a blush gradient. This is the largest visual difference from the design.
- **Not built yet:** design screens 1, 2 (onboarding), 4 (map), 8 (AI try-on), 9 (rentals) are not built yet (screen 12, the merchant dashboard, was built on 25 Oct 2026 with P0-safe content only) (plan §13.4); their routes show placeholders.
- **Deliberate differences from the design:** the earlier phases record these in plan §13.2–13.3. For example, "Send booking request" / "Request sent!" replace "Confirm Booking" / "Booking Confirmed!", and Reschedule, Message and Share are not built.
- **Dark theme:** it is derived, not designed, so it needs a design review.
- **Mobile merchant sidebar:** it closes on Esc or a tap outside but has no visible close button (shadcn default).

## Merchant bookings, 25 Oct 2026

Screens checked as Business owner, at 1440×900 and 390×844, light theme: `/business/bookings` (Requests and Past tabs), `/business/bookings/bk_andrea_pending`, the Propose time dialog and the Decline dialog. No console errors and no horizontal scroll.

- **Fixed in the pass:** the Propose time dialog was wider than its frame because the 30-day date strip stretched the dialog's grid item (`min-w-0` on the form, `sm:p-6` to match the strip's gutters). On phones, the list no longer marks a row as open when no booking is shown, and the booking screen hides the tabs in favour of the "All bookings" back link.
- **Design rules held:** green is the only filled action (Accept); deadlines and clashes use wording, weight and an icon, never status colours; rows sit in their own column, not inside the detail card.
- **Remaining:** dark theme not checked; on phones the Propose time dialog scrolls to reach "Send new time".
