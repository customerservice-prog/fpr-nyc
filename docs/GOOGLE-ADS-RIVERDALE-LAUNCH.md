# Google Ads Launch Plan — Riverdale + Lower Westchester

_Last updated: 2026-09-26_

## Goal

Validate whether Friendly Party Rental can acquire **qualified, profitable Downstate event-rental leads** before committing to a local warehouse or dedicated Downstate fleet.

This is a controlled market test, not a broad NYC awareness campaign.

### Qualified lead

Count a lead as qualified when it is reasonably likely to meet all of these:

- event is inside the accepted Downstate service area;
- requested rentals can plausibly reach the Downstate complete-event minimum;
- event date is serviceable;
- property/site conditions look workable;
- customer supplied usable phone, email, date, location, and requested equipment.

Do not optimize to raw form submissions alone. Track qualified leads and booked revenue.

---

## Launch gate

**Keep Google Ads paused until all three are true:**

1. `nyc.friendlypartyrental.com` resolves with valid HTTPS.
2. A real owner/staff test form submission reaches Friendly's Planning Inquiries admin successfully.
3. GA4 records the Downstate `generate_lead`/lead-success event.

Do not use the Railway hostname as the long-term paid-search destination.

---

## Recommended 30-day pilot budget

**Maximum planned pilot: $1,500 total**

Suggested starting allocation:

| Campaign | Avg. daily budget | 30-day planning amount |
|---|---:|---:|
| Riverdale / North Bronx — Search | $25/day | ~$750 |
| Lower Westchester — Search | $25/day | ~$750 |

Google Ads can spend above an average daily budget on higher-traffic days. Watch actual account spend and campaign spending limits rather than assuming the daily number is a strict per-day cap.

### Spend guardrails

- No automatic budget increases.
- Do not add Performance Max during the validation phase.
- Do not enable broad-match-only / AI Max expansion during the initial controlled test.
- Review search terms frequently during the first two weeks.
- Add clearly irrelevant searches as negatives immediately.
- Review a keyword/theme after **$75 spent without one qualified lead**.
- Pause and diagnose a campaign after **$250 spent without one qualified lead**.
- Do not scale until leads are being judged by quality and likely order value, not just volume.

These are internal operating guardrails, not performance guarantees.

---

# Campaign 1 — Riverdale / North Bronx — Search

## Geography

Primary service intent:

- Riverdale
- Fieldston
- Kingsbridge
- nearby accepted northwest Bronx locations

### Location targeting rule

Use Google's **Presence** option:

> People in or regularly in the targeted locations.

Do **not** use the default "Presence or Interest" option for this local delivery test.

If Riverdale/Fieldston/Kingsbridge are not individually available as targetable locations in Google Ads, resolve the smallest supported combination of local postal codes or a carefully bounded radius in the Google Ads UI. Do not silently broaden to all of New York City.

Explicitly avoid Manhattan traffic during the initial test.

## Ad groups

### 1. Riverdale Tent Rentals

Landing page:

`https://nyc.friendlypartyrental.com/riverdale/tent-rentals/`

Phrase keywords:

```
"tent rentals riverdale"
"tent rental riverdale"
"party tent rental riverdale"
"backyard tent rental riverdale"
"wedding tent rental riverdale"
"tent rentals bronx"
"party tent rental bronx"
```

Exact keywords:

```
[tent rentals riverdale]
[tent rental riverdale]
[party tent rental riverdale]
[backyard tent rental riverdale]
[wedding tent rental riverdale]
[tent rentals bronx]
[party tent rental bronx]
```

### 2. Riverdale Party Rentals

Landing page:

`https://nyc.friendlypartyrental.com/riverdale/`

Phrase keywords:

```
"party rentals riverdale"
"event rentals riverdale"
"party rental riverdale"
"backyard party rentals riverdale"
"graduation party rentals riverdale"
"party rentals bronx"
"event rentals bronx"
```

Exact keywords:

```
[party rentals riverdale]
[event rentals riverdale]
[party rental riverdale]
[backyard party rentals riverdale]
[graduation party rentals riverdale]
[party rentals bronx]
[event rentals bronx]
```

### 3. Riverdale Wedding Rentals

Landing page:

`https://nyc.friendlypartyrental.com/rentals/weddings/`

Phrase keywords:

```
"wedding rentals riverdale"
"wedding tent rental riverdale"
"wedding chair rentals riverdale"
"wedding rentals bronx"
"wedding tent rentals bronx"
"backyard wedding rentals bronx"
```

Exact keywords:

```
[wedding rentals riverdale]
[wedding tent rental riverdale]
[wedding chair rentals riverdale]
[wedding rentals bronx]
[wedding tent rentals bronx]
[backyard wedding rentals bronx]
```

---

# Campaign 2 — Lower Westchester — Search

## Geography

Start with accepted service territory around:

- Yonkers
- Mount Vernon
- New Rochelle
- lower Westchester communities that fit route economics

Use **Presence** targeting.

## Ad groups

### 1. Westchester Tent Rentals

Best landing pages:

- Yonkers: `https://nyc.friendlypartyrental.com/yonkers/tent-rentals/`
- broader Westchester: `https://nyc.friendlypartyrental.com/lower-westchester/`

Phrase keywords:

```
"tent rentals yonkers"
"tent rental yonkers"
"party tent rental yonkers"
"tent rentals westchester"
"party tent rentals westchester"
"backyard tent rental westchester"
"tent rentals mount vernon ny"
"tent rentals new rochelle"
```

Exact keywords:

```
[tent rentals yonkers]
[tent rental yonkers]
[party tent rental yonkers]
[tent rentals westchester]
[party tent rentals westchester]
[backyard tent rental westchester]
[tent rentals mount vernon ny]
[tent rentals new rochelle]
```

### 2. Westchester Party Rentals

Landing page:

`https://nyc.friendlypartyrental.com/lower-westchester/`

Phrase keywords:

```
"party rentals yonkers"
"event rentals yonkers"
"party rentals westchester"
"event rentals westchester"
"party rentals mount vernon ny"
"party rentals new rochelle"
"graduation party rentals westchester"
"backyard party rentals westchester"
```

Exact keywords:

```
[party rentals yonkers]
[event rentals yonkers]
[party rentals westchester]
[event rentals westchester]
[party rentals mount vernon ny]
[party rentals new rochelle]
[graduation party rentals westchester]
[backyard party rentals westchester]
```

### 3. Westchester Wedding Rentals

Landing page:

`https://nyc.friendlypartyrental.com/rentals/weddings/`

Phrase keywords:

```
"wedding rentals westchester"
"wedding tent rentals westchester"
"backyard wedding rentals westchester"
"wedding rentals yonkers"
"wedding tent rental yonkers"
"wedding chair rentals westchester"
"chiavari chair rental westchester"
```

Exact keywords:

```
[wedding rentals westchester]
[wedding tent rentals westchester]
[backyard wedding rentals westchester]
[wedding rentals yonkers]
[wedding tent rental yonkers]
[wedding chair rentals westchester]
[chiavari chair rental westchester]
```

---

# Do not buy bounce-house clicks first

The site has strong inflatable pages, but the first paid-search dollars should favor tents, complete party rentals, and weddings because they align better with the Downstate minimum-order strategy.

Inflatables can be introduced as a separate controlled campaign after the core campaign produces qualified demand, or when the query clearly indicates a complete party package.

Organic pages remain live:

- `/riverdale/bounce-house-rentals/`
- `/yonkers/bounce-house-rentals/`
- `/bronx/bounce-house-rentals/`

---

# Starting negative keyword list

Use phrase/broad negatives as appropriate in Google Ads. Review search terms before expanding this list.

```
free
for sale
buy
used
amazon
walmart
wholesale
manufacturer
parts
repair
instructions
diy
how to
jobs
job
employment
salary
careers
training
certification
tent camping
camping tent
canopy for sale
party city store
indoor playground
birthday venue
venue rental only
```

Do **not** automatically negative terms such as "cheap," "chairs," "tables," or "bounce house." They may still belong to a profitable complete-event inquiry.

---

# Responsive Search Ad copy

Google responsive Search ad headlines support up to 30 characters and descriptions up to 90 characters. The copy below was written inside those limits.

## Tent Rentals RSA

### Headlines

```
Riverdale Tent Rentals
Bronx Tent Rentals
Yonkers Tent Rentals
Westchester Tent Rentals
Tents, Tables & Chairs
Complete Tent Packages
Backyard Tent Rentals
Wedding Tent Rentals
Professional Setup Included
Check Your Event Date
Friendly Party Rental
Tent Rentals Near You
Tables & Chairs Available
Lighting & Linens Available
Get A Fast Event Quote
```

### Descriptions

```
Tent packages with tables, chairs, lighting and setup for Downstate New York events.
Riverdale, Yonkers and Lower Westchester service. Tell us your date and property.
Complete-event deliveries generally start around $1,500. Request a site-fit quote.
Grass or paved site? We confirm the right tent, access, setup and final pricing.
```

## Complete Party Rentals RSA

### Headlines

```
Riverdale Party Rentals
Yonkers Party Rentals
Westchester Party Rentals
Complete Event Packages
Tents, Tables & Chairs
Backyard Party Rentals
Professional Setup Included
Check Your Event Date
Friendly Party Rental
Graduation Party Rentals
Birthday Party Packages
Event Rentals Near You
One Coordinated Rental
Party Tents & Seating
Get A Fast Event Quote
```

### Descriptions

```
Tents, tables, chairs, inflatables and event extras in one coordinated rental order.
Complete-event deliveries generally start around $1,500. Check your date and location.
Serving Riverdale and Lower Westchester with professional delivery, setup and pickup.
Tell us your date, address, guest count and rentals. We’ll confirm the right package.
```

## Wedding Rentals RSA

### Headlines

```
Riverdale Wedding Rentals
Westchester Wedding Rentals
Wedding Tent Rentals
Reception Rental Packages
Chiavari Chairs & Linens
Tents, Tables & Chairs
Lighting & Dance Floors
Professional Setup Included
Check Your Wedding Date
Friendly Party Rental
Backyard Wedding Rentals
Complete Reception Setup
Wedding Rentals Near You
Cocktail Tables Available
Get A Wedding Quote
```

### Descriptions

```
Tents, Chiavari chairs, linens, lighting and reception rentals with professional setup.
Riverdale and Lower Westchester wedding rentals built around your property and layout.
Reception packages start with the tent and seating, then add lighting, linens and extras.
Check your wedding date and site. We’ll confirm availability, setup and final pricing.
```

Avoid excessive pinning initially. Pin only a location/service headline if real search-term data shows that location clarity is needed.

---

# Conversion setup

Primary lead conversion:

- successful Downstate form submission;
- GA4 event: `generate_lead` / the existing successful lead event;
- CRM reference returned from Friendly's Planning Inquiry system.

Secondary engagement signals should **not** be counted as the primary lead conversion:

- phone click;
- email click;
- package click;
- quote CTA click.

Use those for diagnostics, not as equal-value leads.

## Offline quality loop

For every Downstate inquiry, classify:

- Qualified / Not qualified
- Quote sent
- Booked / Lost
- Quoted value
- Booked revenue
- Estimated direct job contribution
- Area
- Requested service
- Lost reason

The goal is to eventually optimize toward **booked profitable events**, not cheap form fills.

---

# Search-term review cadence

## Days 1–7

Check search terms every business day.

- negative clearly irrelevant terms;
- flag requests outside the service zone;
- watch for small-order intent;
- compare Riverdale vs. Westchester lead quality;
- do not expand match types yet.

## Days 8–14

- keep exact/phrase terms producing qualified leads;
- pause or revise wasteful themes;
- improve landing-page copy when search terms reveal a recurring question;
- only consider a new keyword when it matches a service we actually want.

## Days 15–30

- judge by qualified leads, quotes, booked events and contribution potential;
- consider increasing budget only when quality justifies it;
- consider conversion-focused bidding only after conversion tracking is clean enough to trust;
- keep broad-match/AI expansion off until the business has enough real Downstate data to evaluate it.

---

# UTM convention

Use:

```
utm_source=google
utm_medium=cpc
utm_campaign=fpr_downstate_search
utm_content={adgroup-or-theme}
```

Preserve Google's auto-tagging if it is enabled. Do not strip GCLID.

Examples:

```
https://nyc.friendlypartyrental.com/riverdale/tent-rentals/?utm_source=google&utm_medium=cpc&utm_campaign=fpr_downstate_search&utm_content=riverdale_tents

https://nyc.friendlypartyrental.com/lower-westchester/?utm_source=google&utm_medium=cpc&utm_campaign=fpr_downstate_search&utm_content=westchester_party
```

---

# What not to do during the pilot

- Do not target all of NYC.
- Do not target Manhattan.
- Do not use the default Presence-or-Interest geo option.
- Do not launch Performance Max alongside the pilot.
- Do not enable broad-match-only / AI Max at launch.
- Do not optimize toward phone clicks as if they equal booked events.
- Do not hide the Downstate minimum-order expectation.
- Do not advertise inventory or setup methods that the actual site cannot support.
- Do not create a Manhattan Google Business Profile or virtual-office GBP for this test.
- Do not increase budget because impressions are low; first verify there is actual profitable demand.

---

# Current Google Ads references

Official Google Ads Help used for this plan:

- Advanced location options: https://support.google.com/google-ads/answer/1722038
- Geographic targeting: https://support.google.com/google-ads/answer/1722043
- Keyword match types: https://support.google.com/google-ads/answer/7478529
- Keyword matching: https://support.google.com/google-ads/answer/14996023
- Build keyword lists: https://support.google.com/google-ads/answer/10039665
- Responsive Search ads: https://support.google.com/google-ads/answer/7684791
- Search campaign creation: https://support.google.com/google-ads/answer/9510373
- Spending limits: https://support.google.com/google-ads/answer/10486637
