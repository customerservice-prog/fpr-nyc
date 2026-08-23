# Railway persistent storage + image migration runbook

This document describes the one-time production setup that enables uploaded
images to be stored on a persistent Railway volume and served over a public
URL, then migrates existing base64/data-URL images onto that volume.

> These are production infrastructure steps. They must be performed by a human
> operator with access to the Railway dashboard. Do not automate credential or
> dashboard actions.

## Prerequisites

- Owner/admin access to the Railway project for this app.
- The app service is already deployed and healthy.
- The image-upload code (upload API + volume-aware uploaders) is merged to main.

## Step 1 — Attach a persistent volume

1. Open the Railway project, then the app service.
2. Go to the service Settings, find the Volumes section.
3. Create a new volume and set its mount path to:

   ```
   /data
   ```

4. Save. Railway will restart the service with the volume mounted.

## Step 2 — Set environment variables

In the service Variables tab, add the following (do NOT commit these to git):

| Variable | Value | Notes |
| --- | --- | --- |
| `STORAGE_DIR` | `/data/uploads` | Must be a subdirectory of the volume mount. The app creates it on first write. |
| `PUBLIC_BASE_URL` | the production site origin | No trailing slash. Used to build absolute image URLs. |

For `PUBLIC_BASE_URL`, use the canonical production origin (the https www host
for the site) with no trailing slash. Confirm the exact host in the Railway
domain settings rather than copying it from here.

After saving variables, trigger a redeploy so the new values take effect.

## Step 3 — Verify the upload path

1. Log into the admin panel.
2. Open any item editor and upload a small test image.
3. Confirm the saved image URL points at the public origin under the uploads
   path (not a giant base64/data URL).
4. Confirm the image still loads after a service restart (proves persistence).

## Step 4 — Migrate existing images

Once Steps 1-3 are verified, run the one-time migration endpoint. It reads rows
that still hold inline base64 images, writes each to the volume, and rewrites
the stored value to the public URL.

- Endpoint: `POST /api/admin/migrate-item-images`
- Auth: must be called while authenticated as an admin.

Recommended: run it from an authenticated admin browser session, or via an
authenticated request tool. Watch the response for a per-record success count.

### Safety notes

- Take a database backup/snapshot before running the migration.
- The migration rewrites stored image fields; it is effectively one-way.
- Run it once. Re-running is intended to be a no-op for already-migrated rows,
  but confirm counts on the first run before assuming so.

## Rollback

- If uploads misbehave, unset `STORAGE_DIR` to fall back to the previous inline
  base64 behavior (the uploaders keep a base64 fallback path).
- Detaching the volume does not delete already-migrated DB URLs, so keep the
  volume attached once migration has run.
