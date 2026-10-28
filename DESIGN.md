---
name: Dapita
description: "Find your place. Book your service." A local beauty, grooming and wellness booking marketplace for Davao City.
colors:
  monstera-green: "oklch(0.431 0.085 159)"
  monstera-ink: "oklch(0.38 0.08 159)"
  on-monstera: "oklch(0.99 0.005 159)"
  focus-green: "oklch(0.55 0.1 159)"
  blush-clay: "oklch(0.898 0.043 45)"
  blush-wash: "oklch(0.94 0.025 45)"
  clay-rose: "oklch(0.5 0.15 8)"
  pin-pink: "oklch(0.707 0.159 8)"
  rainforest-deep: "oklch(0.3 0.06 162)"
  linen: "oklch(0.978 0.005 68)"
  card-cream: "oklch(0.995 0.003 68)"
  oat-muted: "oklch(0.955 0.008 60)"
  charcoal: "oklch(0.297 0 0)"
  driftwood: "oklch(0.5 0.01 70)"
  sand-border: "oklch(0.91 0.012 60)"
  sand-input: "oklch(0.87 0.014 60)"
  sidebar-charcoal: "oklch(0.25 0.02 165)"
  success: "oklch(0.53 0.14 155)"
  success-emphasis: "oklch(0.42 0.11 155)"
  warning: "oklch(0.76 0.16 75)"
  warning-emphasis: "oklch(0.47 0.11 60)"
  info: "oklch(0.53 0.15 245)"
  info-emphasis: "oklch(0.42 0.13 248)"
  destructive: "oklch(0.55 0.22 27)"
  rating-amber: "oklch(0.77 0.168 67)"
typography:
  display:
    fontFamily: "Playfair Display Variable, ui-serif, Georgia, serif"
    fontSize: "clamp(1.875rem, 1.4rem + 2.2vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3rem + 0.9vw, 2rem)"
    fontWeight: 620
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.05rem + 0.25vw, 1.25rem)"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  subheading:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  meta:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "'tnum'"
  micro:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "7.2px"
  md: "9.6px"
  lg: "12px"
  xl: "16.8px"
  2xl: "21.6px"
  3xl: "26.4px"
  full: "9999px"
spacing:
  unit: "4px"
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  page: "clamp(1.5rem, 1rem + 2vw, 2.5rem)"
  section: "clamp(3rem, 2rem + 4vw, 6rem)"
  header: "64px"
  tabbar: "64px"
components:
  button-primary:
    backgroundColor: "{colors.monstera-green}"
    textColor: "{colors.on-monstera}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "44px"
    padding: "0 20px"
  button-primary-compact:
    backgroundColor: "{colors.monstera-green}"
    textColor: "{colors.on-monstera}"
    rounded: "{rounded.full}"
    height: "28px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.blush-clay}"
    textColor: "{colors.clay-rose}"
    rounded: "{rounded.full}"
    height: "28px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.linen}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 10px"
  input:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 12px"
  search-field:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.full}"
    height: "40px"
  chip-filter:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  chip-filter-selected:
    backgroundColor: "{colors.monstera-green}"
    textColor: "{colors.on-monstera}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  nav-link-active:
    backgroundColor: "{colors.blush-clay}"
    textColor: "{colors.clay-rose}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  card-list:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.2xl}"
    padding: "12px"
  card-panel:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  sidebar-item-active:
    backgroundColor: "{colors.pin-pink}"
    textColor: "{colors.sidebar-charcoal}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 12px"
---

# Design System: Dapita

## Overview

**Creative North Star: "The Neighbourhood Salon"**

Dapita should feel like walking into a favourite local shop on a sunny Davao morning. The walls are warm cream, there are plants in the windows, staff greet you by name, and the price list is pinned up where you can read it. Every screen is a calm, sunlit space where nothing is hidden or oversold. The base is linen-cream surfaces. Deep Monstera Green carries every action, and Blush Clay peach greets you in the selected states. Pin Pink, from the logo's map pin, is the small mark that says "this is the place".

Density is moderate and phone-first. Customer screens are built for a thumb on a mobile connection: large tap targets, one clear next step and generous breathing room around grouped content. On desktop the same pieces spread into two columns, with the task on the left and a sticky summary or booking card on the right, instead of growing new chrome. The merchant and admin tools switch to a dark green-charcoal sidebar, the working back room behind the shopfront, but keep the same cards, fields and buttons.

Components are **tactile and confident**: pill-shaped actions with solid fills, generously rounded cream cards that lift slightly off the page, and crisp hairline edges. Two looks are explicitly ruled out:

- **generic SaaS:** cold blue-grey dashboards, stock gradients, icon-card grids;
- **loud discount:** coupon badges, urgency banners, countdowns, slashed red prices.

The warmth comes from real photos of people and places, not from decoration.

**Key Characteristics:**

- Warm linen surfaces with soft charcoal text. Pure black is never used. Pure white is kept for popovers and the category circles.
- One action colour: Monstera Green, for every primary button, selected chip and active control.
- Pill shapes for everything you press; rounded rectangles for everything you read.
- Soft, warm-tinted shadows, plus a hairline edge on every card.
- Photo-led: shop covers, staff portraits and brand photography. A flat green-tint placeholder with the category icon stands in when a photo is missing, never a stock image.
- A serif display voice (Playfair Display) only for the wordmark-adjacent hero headlines; everything else is Geist.

## Colors

A warm, botanical palette: deep forest green on linen, with peach and pin pink as the friendly accents.

### Primary

- **Monstera Green** (`monstera-green`): the only action colour. It covers primary buttons, selected filter chips, the active tab underline and label, the bottom tab bar's active item, focusable links, the open-now status and the category circles' hover fill. White text on it passes AA comfortably (7.5:1).
- **Monstera Ink** (`monstera-ink`): the darker green used as text on peach washes (`accent-foreground`).
- **Focus Green** (`focus-green`): focus rings. It shows as a 3px ring at 50% opacity around the focused control.

### Secondary

- **Blush Clay** (`blush-clay`): the welcoming peach. It fills the active header nav pill, secondary buttons, avatar initials and the home hero's CTA. Its text is always **Clay Rose** (`clay-rose`), a deep rose that passes AA on the peach.
- **Blush Wash** (`blush-wash`): a lighter peach for accent hovers and soft highlighted rows.

### Tertiary

- **Pin Pink** (`pin-pink`): the logo's map pin. It marks the brand (logo mark, favicon), the merchant sidebar's active item (with dark text) and small highlights. White text never sits on it (2.8:1).
- **Rainforest Deep** (`rainforest-deep`): the very deep green behind the welcome screen, the auth brand panel and the home hero. It is the end colour that photo washes fade into.

### Neutral

- **Linen** (`linen`): the page background on every customer screen.
- **Card Cream** (`card-cream`): cards, inputs, chips and list items. It is barely lighter than Linen; the shadow and hairline do the separating.
- **Oat Muted** (`oat-muted`): skeletons, image placeholders behind photos, muted fills and ghost-button hovers.
- **Charcoal** (`charcoal`): all body and heading text. It is a soft near-black, never pure black.
- **Driftwood** (`driftwood`): secondary text such as meta lines, descriptions, captions and inactive tabs. It passes 4.5:1 on Linen.
- **Sand Border** (`sand-border`) and **Sand Input** (`sand-input`): dividers and card hairlines; field strokes.
- **Sidebar Charcoal** (`sidebar-charcoal`): the merchant and admin sidebar, in both themes.

### Status

- **Success, Warning, Info and Destructive** each have a fill tone and an `-emphasis` text tone. Status badges are a 12–15% tint of the fill with emphasis-coloured text. The tones map to the booking states: Confirmed is success, Pending is warning, New time proposed is info, Declined or Cancelled is destructive.
- **Rating Amber** (`rating-amber`): star ratings only, and only when real reviews exist.

### Named Rules

**The One Green Rule.** Every action a person can take is Monstera Green or a quieter variant of it. Peach and pink never become a competing primary button colour.

**The No White on Pink Rule.** Pin Pink carries dark text or no text. White on Pink is 2.8:1, which fails AA.

**The Status Means State Rule.** Success, warning, info and destructive colours describe a booking's real state. They are never used to decorate, rank or create urgency.

## Typography

**Display Font:** Playfair Display Variable (with ui-serif, Georgia)
**Body Font:** Geist Variable (with ui-sans-serif, system-ui)
**Mono:** Geist Mono Variable, only for booking references and codes.

**Character:** a warm, editorial serif for brand moments, paired with a clean, slightly humanist sans for everything functional. Geist's `cv11` and `ss01` alternates are on everywhere for friendlier forms.

### Hierarchy

- **Display** (Playfair 600, 30px→48px, line-height 1.25): hero headlines only, such as "Find Your Style", "Look Good / Feel Good / Do More" and the auth brand panel. Always on a green or photo surface.
- **Title** (Geist 620, 24px→32px, line-height 1.2, -0.025em): the page `<h1>` on desktop: "Explore", "My bookings", "Book appointment". On phones it drops to an 18px centred title next to the back button.
- **Headline** (Geist 600, 18px→20px, line-height 1.35, -0.015em): every section `<h2>`: "Featured shops", "Opening hours", "Booking summary".
- **Subheading** (Geist 600, 16px): form sub-sections, fieldset legends, card titles inside panels.
- **Body** (Geist 400, 14–15px, line-height 1.5–1.6): descriptions, policies, paragraphs. Long text stays within 68ch (`--container-prose`).
- **Label** (Geist 500, 14px, line-height 1.25): form labels, nav links, button text.
- **Meta** (Geist 400, 12px, tabular numbers): dates, times and counts on cards.
- **Micro** (Geist 500, 11px): tab bar labels, "Soon" badges, counters. This is the floor; nothing goes smaller.

### Named Rules

**The Serif Is a Signature Rule.** Playfair appears only in hero headlines next to the brand. It is never used for UI labels, prices, buttons or section titles.

**The Named Scale Rule.** Text sizes come from the `type-*` utilities. Hand-written arbitrary sizes like `text-[10px]` are drift; promote the value to a token or use an existing step.

## Layout

- **Container:** centred, 1280px max (`max-w-7xl`). Gutters are 16px on phones, 24px from 640px and 32px from 1024px. Pages pad vertically by the fluid `page` step (24–40px).
- **Mobile-first:** below 768px the header shrinks to the logo mark, "Davao City" and account actions. A fixed 64px bottom tab bar (Home, Explore, Bookings, Inbox, Profile) takes over primary navigation, and page content reserves that height at the bottom. Detail screens get a back-button title bar instead of breadcrumbs.
- **Desktop:** a sticky 64px translucent header carries the logo, pill nav links, a global search field and account actions. Breadcrumbs sit above the page title.
- **Two-column task pattern:** booking, shop and booking-detail pages use `minmax(0, 1fr) 22rem` from 1024px. The task is on the left; a sticky summary or action card sits on the right, 96px from the top. On phones the side card stacks after the main content, or before it when it gives context.
- **Account area:** a 240px left rail (profile card plus nav) beside the content on desktop. On phones it becomes a horizontally scrolling pill row.
- **Horizontal rows:** filter chips, the date strip and featured-shop rows scroll edge to edge on phones but keep the gutter through `scroll-padding`, so snapping never hides an item under the screen edge.
- **Rhythm:** tight groups (4–12px inside a card) and generous separation between sections (32–40px; `section` up to 96px on marketing-like surfaces). There is always more space above a heading than below it.

## Elevation & Depth

Depth is a **soft lift**. Cards sit on the linen page with a warm-tinted, short shadow and a 1px hairline (5% foreground). The shadow tells you this is a separate thing you can read or tap. It is never decoration, and there are no coloured glows. Shadows are tinted toward warm brown (`oklch(0.3 0.02 60)`) instead of grey, so they disappear into the cream rather than dirtying it.

### Shadow Vocabulary

- **Hairline lift** (`box-shadow: 0 1px 2px 0 oklch(0.3 0.02 60 / 0.06)`): category circles, small controls.
- **Card rest** (`box-shadow: 0 1px 3px 0 oklch(0.3 0.02 60 / 0.08), 0 1px 2px -1px oklch(0.3 0.02 60 / 0.06)`), always paired with a `ring-1` at 5% foreground. This is the `card-surface` used by every card, panel and list item.
- **Raised** (`box-shadow: 0 6px 16px -4px oklch(0.3 0.02 60 / 0.1), 0 2px 4px -2px oklch(0.3 0.02 60 / 0.06)`): the home hero, popovers and menus.
- **Overlay** (`box-shadow: 0 16px 32px -8px oklch(0.3 0.02 60 / 0.14), 0 4px 8px -4px oklch(0.3 0.02 60 / 0.08)`): dialogs and sheets.

### Named Rules

**The One Card Surface Rule.** Any card is `card-surface` (cream, card-rest shadow, 5% hairline), plus its radius and padding. Hand-assembling a different shadow and border combination is drift.

**The No Nested Cards Rule.** A card never sits inside another card. Inside a panel, separate items with dividers (`divide-border/70`) or spacing.

## Shapes

One base radius (12px) drives the whole scale, and the shape tells you what something is:

- **Pills** (fully rounded): everything you press or toggle: buttons, filter chips, header nav links, the search field, status badges, account nav pills.
- **Rounded rectangles** (12px → 26px): everything you read:
  - inputs and selects at 12px;
  - small thumbnails and service images at 16–17px;
  - list items and shop cards at 22px;
  - panels, summaries and the hero at 26px.
- **Circles:** category icons (56–64px), staff avatars and initials.
- **Photos** are clipped to their container's radius and keep fixed aspect ratios: 4:3 shop tiles, 16:9 feature cards and covers, 16:10 sidebar covers, square thumbnails. This keeps layouts from shifting.

**The Press-Is-a-Pill Rule.** If it's a primary or secondary action in customer-facing UI, it's a pill. Square-cornered buttons appear only in the dense merchant and admin tools and in icon buttons.

## Components

### Buttons

Tactile and confident: solid fills, pill shapes and a 1px press-down on click.

- **Primary:** Monstera Green fill with near-white text, as a pill.
  - Large CTAs ("Book appointment", "Send booking request", "Get Started") are 44px tall with 20px side padding and often full width.
  - Inline actions ("Book" on a service row) are 28px compact pills.
- **Secondary:** Blush Clay fill with Clay Rose text, for supporting actions next to the primary. On hover it darkens 5% toward the foreground. Never put it beside a status badge: a tinted pill next to a tinted pill reads as two badges.
- **Outline:** a linen fill with a sand hairline, for neutral actions ("Reset password", "Get directions", "Keep my original time") and for card actions that sit beside a status badge ("View details" with a trailing chevron, "Add to calendar"). These are 32px, so they read as buttons next to the 20px badges.
- **Ghost and link:** plain text, using muted hover fills or underlines ("Skip", "See all", "Sign out"). Destructive ghost actions ("Cancel request") use red text with no fill.
- **States:**
  - hover softens the fill to 80% (primary);
  - focus shows a 3px Focus Green ring at 50%;
  - disabled drops to 50% opacity;
  - loading shows an inline spinner, disables the button and sets `aria-busy`.

### Chips

- **Filter chips:** 36px pills in Card Cream with a sand ring and Charcoal label. Selected chips switch to a Monstera Green fill with white text. They wrap on desktop and scroll horizontally on phones.
- **Status badges:** 20px pills, 12px medium text, a tinted status fill with emphasis text: Pending is amber, Confirmed is green, New time proposed is blue, Cancelled is red.
- **"Soon" badges:** micro-sized outline pills marking planned features. They never link to a dead screen.

### Cards / Containers

- **Corner style:** 22px for list items and shop cards; 26px for panels and summaries.
- **Background:** Card Cream on Linen.
- **Shadow strategy:** card rest plus the 5% hairline (see Elevation & Depth).
- **Internal padding:** 12px for list rows, 16px for shop cards, 20–24px for panels.
- **Shop cards** lead with the cover photo (4:3 tile, or 16:9 feature), then name with a verified tick, category, area, open status and "From ₱…". A container query re-flows the footer row according to card width.

### Inputs / Fields

- **Style:** 40px tall with a 12px radius, Card Cream fill, Sand Input stroke and Charcoal text. Placeholders use Driftwood. Global search and Explore search are 40px pills with a leading magnifier icon.
- **Focus:** the stroke shifts to Focus Green, with a 3px ring at 50%.
- **Error:** a destructive stroke and a 20% destructive ring. The message sits under the field, wired through `aria-describedby`.
- **Disabled:** 50% opacity with a muted fill.
- **Labels** sit above the field in Label type. Required fields get a red asterisk; optional fields say "Optional." in the description.

### Navigation

- **Desktop header:** sticky and translucent linen (70–85% with backdrop blur), with a hairline bottom border. Nav links are pills in Label type. Inactive links are Driftwood and gain a muted fill on hover; the active link is a Blush Clay pill with Clay Rose text.
- **Bottom tab bar (phones):** 64px, translucent cream, five icon-over-label items in Micro type. The active item is Monstera Green; the rest are Driftwood. It respects the safe-area inset.
- **Underline tabs:** 15px labels in Driftwood. The active tab gets Monstera Green text and a 2px green underline (shop tabs, My bookings tabs).
- **Merchant/admin sidebar:** Sidebar Charcoal with light text and 40px items in 12px rounded rectangles. The active item is filled Pin Pink with dark text.

### Category Circle (signature)

The home page's "Browse by category" row: 56px (64px on desktop) white circles with a hairline ring and the hairline lift, holding a 24–28px Monstera Green line icon (1.75 stroke). The label sits underneath. On hover the circle fills green and the icon turns white. A "Soon" badge perches on its top edge for categories that aren't live yet.

### Booking Summary (signature)

The sticky right-hand card on the booking form:

- shop name;
- an icon list of date, time, staff and area;
- a price breakdown that always shows "Booking fee · Free";
- an info alert explaining request-to-confirm;
- the full-width primary pill.

It is the visual promise of booking clarity, and the same shape is reused for the shop page's booking card and the booking-detail price panel.

## Do's and Don'ts

### Do:

- **Do** use `card-surface` with `rounded-2xl` (list items, shop cards) or `rounded-3xl` (panels) for every card.
- **Do** make every primary action a Monstera Green pill, and keep one primary action per view or card.
- **Do** use the `type-*` scale: `type-title` for page titles, `type-heading` for section titles, `type-micro` as the smallest text.
- **Do** show the category icon on the flat green-tint placeholder whenever a photo is missing, and keep the image's aspect ratio so nothing shifts.
- **Do** use the two-column `minmax(0,1fr) 22rem` layout, with a sticky side card, for task pages on desktop.
- **Do** pair every status colour with a text label, so a booking's state never depends on colour alone.
- **Do** keep text pairs at WCAG 2.2 AA in both themes, and keep touch targets at least 24px (40–44px for primary actions).

### Don't:

- **Don't** drift into generic SaaS: no cold blue-grey surfaces, no decorative gradients, no grids of identical icon cards as page structure.
- **Don't** use loud-discount devices: no coupon badges, urgency banners, countdowns, "only 2 left" or slashed red prices.
- **Don't** put white text on Pin Pink, or make pink or peach a competing primary button colour.
- **Don't** use Playfair Display outside the hero and brand moments.
- **Don't** nest cards, or hand-roll a new shadow, border and radius combination.
- **Don't** add new pure-white or pure-black surfaces in the light theme; use Card Cream, Linen and Charcoal. Popovers and the category circles (white at the product owner's request) are the only white surfaces.
