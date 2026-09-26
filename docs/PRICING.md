# Pricing Test Framework

Public pricing is intentionally not finalized in this repository.

## Starting model

Use a Downstate minimum-order strategy rather than copying Syracuse delivery fees.

Internal test starting point in `config/site.json`:
- $750 delivered-order target floor

This is a **test hypothesis**, not a promise to customers.

Final minimum should be allowed to vary by:
- service zone
- event date / demand
- crew size
- tent size
- setup complexity
- pickup timing
- tolls / parking / access
- equipment utilization

## Quote calculation

For every Downstate job estimate:

`rental revenue - direct labor - vehicle cost - tolls/parking - consumables - subcontracting - payment fees - incremental insurance/permit cost = job contribution`

Track job contribution separately from revenue.

## Product strategy

Lead with complete event orders:
- tent + tables + chairs
- tent + lighting + dance floor
- wedding seating/linens/cocktail tables
- backyard party + inflatable + seating

Avoid building the market around small one-item deliveries that cannot support the route cost.
