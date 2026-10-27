# Dapita API (AdonisJS)

The backend for the Dapita SPA in the parent folder. It serves the endpoints the frontend's HTTP services already call (`src/services/*.service.ts`, plan §7.3) under `/api`, keeps one shared database for every device, and pushes live updates over Server-Sent Events, so a booking made on a phone appears on the owner's desktop at once.

**Stack:** AdonisJS 7, Lucid ORM on PostgreSQL, session-cookie auth, VineJS validation, Transmit (Server-Sent Events), Japa tests.

## Run it with the frontend

You need a PostgreSQL server (version 14 or later) with two UTF-8 databases: `dapita` for the app and `dapita_test` for the tests. Prices use the peso sign, which a database in a Windows code page such as WIN1252 can't store.

```sh
createdb -U postgres -E UTF8 -T template0 dapita
createdb -U postgres -E UTF8 -T template0 dapita_test
```

Put the connection details in `server/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`; see `.env.example`). The tests use the same server with `DB_DATABASE` from `.env.test`.

```sh
cd server
npm install
npm run db:reset          # create the tables and load the demo data
npm run dev               # API on http://localhost:3333
```

Then, in the project root, run the SPA against it instead of the in-browser mock:

```sh
# .env.local in the project root
VITE_USE_MOCKS=false
```

```sh
npm run dev               # this computer only: http://localhost:5173
npm run dev:lan           # also reachable from a phone on the same Wi-Fi
```

Vite proxies `/api` to port 3333, so the browser only ever talks to the Vite address. That keeps the session cookie and the live stream same-origin.

### Test on a phone and a desktop at once

1. Start both servers as above, with `npm run dev:lan`. Vite prints a `Network:` address such as `http://192.168.1.20:5173`.
2. On the phone (same Wi-Fi), open that address and sign in as the customer.
3. On the desktop, open `http://localhost:5173` and sign in as the shop owner. Each device has its own session.
4. Request a booking on the phone: it appears on the owner's **Bookings** page within a second, with no reload. Accept it on the desktop, and the phone's booking flips to **Confirmed**. Messages update the same way.

If the phone can't connect, allow Node.js through the Windows firewall for private networks.

### Demo accounts

All use the password `password123`.

| Account                              | Who                                       |
| ------------------------------------ | ----------------------------------------- |
| `customer@example.com`               | Andrea Reyes, customer                    |
| `owner@example.com`                  | Owner of The Good Cut Barbershop          |
| `admin@example.com`                  | Administrator (admin screens not served yet) |
| `owner.<shop-slug>@example.com`      | Owner of any other demo shop, e.g. `owner.kulot-studio@example.com` |
| `john@example.com`, `mark@example.com`, `alyssa@example.com`, `carlos@example.com`, `bea@example.com` | Other customers in the demo bookings |

`npm run db:reset` re-exports the demo data from the SPA's mock seed (`scripts/export-mock-seed.mjs`), so both modes show the same shops, and reloads the database. Seed dates are relative to today, so reset when the demo looks stale.

## What's served

| Area | Endpoints |
| --- | --- |
| Auth | `GET /auth/session`, `POST /auth/sign-in`, `/sign-out`, `/sign-up`, `/verify`, `/forgot-password` |
| Discovery | `GET /categories`, `/areas`, `/shops`, `/shops/featured`, `/shops/:slug`, `/shops/:slug/services`, `/shops/:slug/staff` |
| Customer bookings | `POST /bookings`, `GET /me/bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`, `/accept-alternative`, `/decline-alternative` |
| Merchant listing | `GET/PUT /merchant/businesses/:id`, `PUT /merchant/businesses/:id/hours`, `/policies`, `POST /merchant/businesses/:id/closures`, `DELETE /merchant/businesses/:id/closures/:closureId`, `POST /merchant/businesses/:id/submit`, `GET/PUT /merchant/businesses/:id/notification-settings` |
| Merchant services | `GET/POST /merchant/businesses/:id/services`, `PUT/DELETE /merchant/businesses/:id/services/:serviceId`, `POST /merchant/businesses/:id/services/:serviceId/move` |
| Merchant bookings | `GET /merchant/businesses/:id/bookings`, `/merchant/businesses/:id/conversations`, `GET /merchant/bookings/:id`, `POST /merchant/bookings/:id/accept`, `/decline`, `/propose`, `/complete`, `/no-show` |
| Messaging | `GET/POST /conversations`, `GET /conversations/:id`, `POST /conversations/:id/messages`, `/read`, `/report` |
| Realtime | `/__transmit/events`, `/__transmit/subscribe`, `/__transmit/unsubscribe` |

Everything else under `/api` (admin console, customer profile and account) answers **501 `not_implemented`** for now, and those screens show an error in server mode. They still work in mock mode.

Listing, hours, closures, policies and service input is checked with the SPA's own form schemas (`src/schemas`, through `validateWith` in `app/helpers/validate.ts`), so a rule or message changes in one place. Those endpoints read the JSON body as sent (`formBody`), because the body parser turns empty strings into null and the schemas expect blank optional text as `''`.

Emails aren't sent yet. The sign-up verification link is written to the server log.

## How it fits together

- **Same rules as the SPA.** The booking state machine, opening-hours checks, response deadlines and domain types are imported from the frontend's `src/` (through `app/shared/domain.ts` and the `@/` alias registered in `bin/shared_alias.ts`), so the browser and the server can't drift apart. Only pure modules may be shared that way.
- **Ported mock behaviour.** `app/services/bookings.ts`, `shops.ts` and `conversations.ts` follow the mock services line by line: the same checks, the same error messages, 404 for other people's records, an audit trail for every booking change.
- **Realtime.** After each committed change, `app/services/realtime.ts` broadcasts `{ type: 'booking.changed' | 'conversation.changed', id }` to `users/<customerId>` and `businesses/<businessId>`. `start/transmit.ts` allows each user only their own channel and their businesses' channels. The SPA (`src/features/realtime`) refetches the affected queries; events never carry the data itself. A one-minute timer (`start/scheduler.ts`) expires overdue requests so both sides hear about it live.
- **Errors** leave as `{ message, code?, details? }` (`app/exceptions/handler.ts`), the shape the SPA's API client reads.

## Commands

```sh
npm run dev        # dev server with hot reload
npm test           # Japa functional tests (separate dapita_test database, port 3334)
npm run lint
npm run typecheck
npm run db:reset   # re-export demo data, drop and recreate the tables, reseed
```

## Before a real deployment

- Use a managed PostgreSQL with backups, and replace `db:reset` with plain `node ace migration:run`: `db:reset` drops every table. If the provider requires SSL, add `ssl` to the `pg` connection in `config/database.ts`.
- The `@/` shared-code alias works when the server runs TypeScript directly (as `npm run dev` does). For a compiled `node ace build`, move the shared modules into a workspace package first.
- Set `APP_KEY`, `NODE_ENV=production`, the CORS allowlist and HTTPS (secure cookies switch on in production).
- With more than one server instance, give Transmit a Redis transport (`config/transmit.ts`) so events reach clients on every instance.
- Choose an email provider for verification and password-reset links.
