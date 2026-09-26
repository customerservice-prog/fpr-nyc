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
