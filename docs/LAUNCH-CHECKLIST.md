# Downstate Launch Checklist

## Completed

- [x] Separate GitHub repository: `customerservice-prog/fpr-nyc`
- [x] Separate Railway project/service
- [x] Production health endpoint
- [x] Riverdale / Bronx / Lower Westchester positioning
- [x] 24+ local/category/package/legal pages generated
- [x] Rental catalog
- [x] Package page and starting package pricing
- [x] $1,500 Downstate complete-event qualification floor
- [x] Site-readiness guide
- [x] FAQ
- [x] Privacy notice
- [x] Website / quote-request terms
- [x] Mobile call + quote action bar
- [x] Branded favicon
- [x] Quote form collects exact event address
- [x] Quote form collects property / venue type
- [x] Quote form collects setup surface and approximate dimensions
- [x] Quote form collects access / site notes
- [x] Minimum-order acknowledgment required
- [x] Phone and email validation
- [x] Honeypot spam trap
- [x] Server-side rate limiting
- [x] Security response headers
- [x] Server-to-server relay into Friendly's existing inquiry database
- [x] Downstate badge/filter in Friendly admin
- [x] Downstate office email subject
- [x] Generic UTM / referrer attribution
- [x] GA4 lead event
- [x] Temporary Railway URL set to noindex/nofollow
- [x] Google Ads-specific code removed
- [x] Google Ads launch-plan file removed
- [x] Google Ads work deferred by owner request
- [x] Custom-domain/DNS work deferred by owner request

## Final checks before public launch

- [ ] Submit one real owner/staff test inquiry using a real deliverable email and phone.
- [ ] Confirm it appears under **Admin → Planning inquiries → Downstate**.
- [ ] Confirm office notification email is received.
- [ ] Confirm customer acknowledgment email is received.
- [ ] Mark the test inquiry reviewed or remove it from the workflow as appropriate.
- [ ] Review package prices against actual Downstate labor/route costs one final time.
- [ ] Verify current insurance coverage for the Downstate work being accepted.
- [ ] Verify municipal/venue requirements for each real tent/inflatable job rather than assuming one rule applies everywhere.
- [ ] Train office staff on `docs/DOWNSTATE-STAFF-PLAYBOOK.md`.

## Deferred until owner says to do it

- [ ] Final branded domain / DNS.
- [ ] Set final `PUBLIC_BASE_URL`.
- [ ] Set `PUBLIC_INDEXABLE=true` only after the final domain is live and correct.
- [ ] Replace temporary Railway canonical URLs with the final domain.
- [ ] Google Ads or other paid advertising.

## Warehouse decision gate

Do **not** open a Downstate warehouse merely because inquiries arrive.

Only revisit local storage/warehouse when real booked work shows that Syracuse travel/staging is the primary constraint on otherwise profitable demand.
