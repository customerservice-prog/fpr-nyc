# Friendly Party Rental — Downstate New York Market Test

A separate Riverdale + Lower Westchester market-test site for Friendly Party Rental.

## Purpose

Validate real Downstate demand **before** opening a warehouse, adding a dedicated truck, or taking on permanent Downstate overhead.

Initial territory:
- Riverdale
- Fieldston
- Kingsbridge
- The Bronx (selected locations)
- Yonkers
- Mount Vernon
- New Rochelle
- Lower Westchester

Initial product fit:
- Pole tents on suitable grass sites
- Frame-style / paved-site tenting where appropriate
- Tables and chairs
- Chiavari seating
- Linens and cocktail tables
- Bounce houses and water slides on suitable sites
- Bistro lighting and fans
- Dance floors
- Photo booth / concessions / games / event extras

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

The site is generated into `dist/` with no third-party runtime dependencies.

## Lead delivery

The quote form posts to `/api/lead`.

Configure **one** of these in the deployment environment:

### Option A — webhook
- `LEAD_WEBHOOK_URL`

### Option B — Resend email
- `RESEND_API_KEY`
- `LEAD_TO_EMAIL`
- optional `LEAD_FROM_EMAIL`

Do not launch paid traffic until the form is tested end-to-end.

## Before launch

Update `config/site.json`:
- `publicBaseUrl`
- phone number, once the Downstate routing number is selected
- minimum-order public wording if desired

Then verify:
1. quote form delivery
2. mobile layout
3. analytics/conversion tracking
4. correct service areas
5. final delivery/minimum-order policy
6. insurance/permitting requirements for the equipment/site type

## Important operating rule

This repo is separate from Friendly Party Rental's Syracuse and South Carolina sites. The first 90 days are for evidence gathering. Do not make a warehouse commitment solely because traffic increases.


## Downstate pricing strategy

The public site now uses a complete-event strategy rather than copying Syracuse item pricing.

- Internal delivered-order floor: about **$1,500** before tax, adjusted by zone/date/site.
- Public package cards start at **$1,795**.
- Single-item Downstate drops are not the primary offer.
- Package prices are starting points; access, surface, tent anchoring/weights, exact timing, long carries, and special venue rules can change the quote.

## Domain plan

Preferred branded subdomain: **nyc.friendlypartyrental.com**

Standalone fallback checked on September 26, 2026: **friendlypartyrentalnyc.com** was available at the time of the check. Domain availability can change until registered.

## Conversion events

The browser now emits `dataLayer` events and `fpr:conversion` CustomEvents for quote CTAs, rental-category clicks, package quote clicks, phone clicks, email clicks, and lead submit outcomes. UTM source, medium, campaign, landing page, and referrer are carried with quote submissions.


## Lead relay

Downstate quote forms relay server-to-server into Friendly Party Rental's existing production `/api/event-planning` intake. That production endpoint persists the inquiry to the main database and attempts the normal office notification email.

Optional override:
- `LEAD_RELAY_URL` — defaults to `https://www.friendlypartyrental.com/api/event-planning`

The Downstate server translates local event-type wording into the production planning inquiry categories and tags the saved message with `[DOWNSTATE RENTAL QUOTE]`, the original event type, surface, requested rentals, and UTM/referrer context.


## Analytics

Downstate uses the same production Google tags as Friendly Party Rental:
- GA4 measurement ID: `G-NV8CF7GT5C`
- Google Ads tag ID: `AW-18374628389`

Custom Downstate events are sent through `gtag('event', ...)` and mirrored to `dataLayer` / `fpr:conversion`.
