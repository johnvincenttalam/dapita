# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Responsive web only, with no native apps. Customer screens must work from 320px phones up to desktop. The merchant dashboard and admin console are used mainly on desktop.

## Users

- **Customers (primary).** People in Davao City who want a barber, salon, nail, spa, makeup, skin, brows/lashes or wellness appointment. They browse and book mostly on their phones, often on the go. Their job: find a trusted nearby provider, compare services and prices, and request a time without phoning or messaging around. Guests can browse everything; booking, messaging and saving need an account.
- **Merchant owners (secondary).** Owners of small local shops. They manage their listing, services, hours, policies, booking requests and messages from a web dashboard. Staff accounts with restricted access come in P1.
- **Administrators and support operators (internal).** They approve merchants, manage the category list, handle reports and support cases, and check notification failures. Support operators get least-privilege access.

When customer and merchant needs conflict, the customer experience wins.

## Product Purpose

Dapita is a local discovery and booking marketplace for beauty, grooming and lifestyle services, starting in Davao City, Philippines. Customers find nearby providers, compare services and prices, message shops and request appointments. Shops get a free listing and one place to handle requests.

The current phase is a pilot prototype. It runs on in-browser mock data and is meant to validate the booking journey with real shops before launch. Success means customers complete booking requests they trust, and shops confirm requests without needing to keep a calendar up to date.

## Positioning

- **Local to Davao.** Built for Davao City's areas (Poblacion, Lanang, Buhangin, Bajada, Matina and others), with PHP prices, the `en-PH` locale and `Asia/Manila` time. It covers local shops that aren't on global booking apps.
- **Honest listings.** Dapita never shows invented ratings, review counts, verification badges, availability, prices or distances. Missing data is labelled as missing: "No reviews yet", "Opening hours not provided".
- **Request-to-confirm by default.** The customer picks a preferred time and the shop confirms it. A pending request is never presented as a confirmed appointment. Live slot booking (`bookingMethod: 'instant'`) is P1, only for shops that keep a live calendar.
- **Free for customers.** There is no booking fee and no in-app payment. Customers pay at the shop.

## Operating Context

- **Booking lifecycle:** request → pending → confirmed, alternative proposed, declined or expired → completed, cancelled or no-show. Every state has its own label, and every change is recorded in an audit trail.
- **Shop policies:** each shop sets its own cancellation, no-show and optional deposit text. These are shown before anyone books. Deposits are never computed or collected in the app.
- **Areas:** shops are located by area within Davao City. Distance appears only when the customer grants location permission; otherwise only the area name is shown.
- **Prices:** a service price is fixed, "from", a range or "price on consultation". Variable prices stay estimates until the shop confirms.
- **Priorities:** labels follow the business documentation. P0 is the MVP pilot, P1 comes after core booking is proven, P2 is later.
- **Sources:** business rules come from the project documentation (v1.0, 21 Oct 2026). Visual reference is the 12-screen design showcase. On business rules the documentation wins; on visuals the image wins. See `docs/implementation-plan.md` §11.

## Capabilities and Constraints

- **Built:**
  - Home, Explore (search, filters, chips), category, shop and service pages.
  - The booking request flow, the request-sent page, My bookings and booking detail (including accepting a proposed time).
  - Welcome, Get started, sign-in, sign-up (customer and business), email verification and forgot password.
  - Profile, and Privacy & data (consents, account deletion request).
  - The merchant and admin shells.
- **Planned (placeholders today):** merchant dashboard content, inbox and messaging, notifications service, map view, legal pages, admin console content, favourites and reviews (P1), AI Style Studio (P1), gown/dress rentals (P2).
- **AI Style Studio (P1):** hairstyle and hair-colour preview only. It must link previews to real local services and must explain consent, deletion and retention before any upload.
- **Rentals (P2):** must not launch until partner inventory can be kept accurate.
- **Data:** there is no backend yet. Every service has a mock (localStorage) implementation and an unverified HTTP implementation. All authorization is enforced server-side; the frontend only routes and hides.
- **Language:** English only for the MVP.
- **Open decisions:**
  - auth provider, and whether phone/OTP sign-in is needed;
  - the booking response deadline;
  - whether policies become structured;
  - the final area list and the categories live at launch;
  - the customer reschedule rule;
  - whether one account can be both customer and merchant (assumed yes);
  - the merchant dashboard KPIs ("Total Revenue" and "+ Add Booking" are hidden in P0);
  - SEO pre-rendering before the marketing launch.

## Brand Commitments

- **Name:** Dapita (from `VITE_APP_NAME`). It was formerly "GlamSpot"; the design reference still shows the old name.
- **Tagline:** "Find your place. Book your service."
- **Personality:** a local identity for Davao: warm, approachable and plain-spoken.
- **Logo artwork:** supplied by the product owner, a wordmark with a pink map pin and leaves (`docs/brand/dapita-logo-source.png`). There is a cream on-dark copy for green and dark surfaces. The SVG `LogoMark` is an approximate redraw until the designer supplies vectors.
- **Colours:** the brand board's "Natural & Modern" palette is the approved colour basis. White text is never placed on the brand pink (2.8:1); actions use the green.
- **Voice:** sentence case and plain words. Controls say exactly what happens ("Send booking request", not "Confirm booking"). The copy is honest about the request-to-confirm model and about prototype limits.

## Evidence on Hand

- **Brand photos:** AI-generated by the product owner from `docs/image-prompts.md`. The people and salons are fictional.
  - welcome, auth, home and get-started photos: `src/assets/brand/photos/`;
  - 12 shop covers: `public/images/shops/`;
  - 5 staff portraits: `public/images/staff/`;
  - The Good Cut Barbershop's service photos: `public/images/services/`.
  - Other shops' service photos and the shop galleries are still to come.
- **Shops:** 12 fictional seeded shops (`src/services/mock/seed/`).
- **Nothing real yet.** There are no real merchants, reviews, ratings, testimonials, customer counts, press or usage metrics. Future work must not invent any of them or present the fictional shops as real.

## Product Principles

1. **Booking clarity over conversion tricks.** The customer always knows whether something is requested, proposed or confirmed, and what happens next.
2. **Never fabricate.** Show only data that exists, and label gaps honestly. Trust is the product's main asset in a new local market.
3. **Customer on a phone first.** Design for a Davao customer on a mobile connection, then expand to desktop. Merchant and admin tools stay efficient and desktop-friendly.
4. **Low effort for shops.** Request-to-confirm, free listings and simple policies keep small merchants willing to take part.
5. **Privacy by design.** Location is optional. Consent, deletion and retention are explained before data is collected.

## Accessibility & Inclusion

The target is WCAG 2.2 AA across all roles. Every text and colour pair already passes AA in both themes. Touch targets are at least 24px, with the WCAG spacing exception documented in `docs/ui-audit.md`. Each page has exactly one `<h1>`, every control has an accessible name, and the OS reduced-motion setting is respected throughout.
