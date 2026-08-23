# Deployment Guide

This app runs on Railway and deploys automatically from the `main` branch on GitHub.

## CRITICAL: Database schema changes

Whenever a pull request changes `prisma/schema.prisma` (adding, renaming, or removing a
field or model), the production database MUST be updated in the SAME deploy. The code
is built with a Prisma client that expects the new schema, so if the database is not
migrated, EVERY query that touches the changed model throws a 500 error.

After merging a schema change and before/right after the deploy goes live, run against
the production database:

```bash
npx prisma db push
```

(or `npx prisma migrate deploy` if you use migration files).

### Why this matters (real incident, Aug 2026)

PR #48 added an `unsubscribed` field to the `Customer` model. The code deployed but the
database was not migrated. Result: the admin Customers page showed "0 customers", the
calendar showed no orders, dashboard totals read $0.00, and inventory count read 0 —
because every Customer/Order query failed with "column does not exist". Products were
unaffected (they do not touch the Customer model). No data was lost. Running
`npx prisma db push` restored everything immediately.

## Standard deploy checklist

1. Merge the PR into `main`.
2. If `prisma/schema.prisma` changed: run `npx prisma db push` against production.
3. Confirm the Railway build finishes (deploy lag is ~2-3 minutes).
4. Smoke-test the admin: Home (calendar + totals), Customers, and one order.

## Tip: catching this earlier

A quick health check after any deploy: load `/admin/customers`. If it shows
"0 customers" when you know there are customers, a schema/database mismatch is the
most likely cause — run the migration.
