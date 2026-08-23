# Image Hosting Setup (Railway Persistent Volume)

This document explains how to finish setting up the image-hosting feature
added in PR #62. The code writes uploaded item images to a persistent
volume on Railway and serves them back through the app, instead of storing
base64 image data in the database.

> You (the repo owner) must do the Railway steps below. The app code is
> already in place; it just needs the volume attached and two env vars set.

## What the code expects

Two environment variables:

- STORAGE_DIR - absolute path to the mounted volume where files are written
  (for example /data/uploads).
- PUBLIC_BASE_URL - the public site origin, no trailing slash
  (for example https://www.friendlypartyrental.com).

Uploaded files are written under STORAGE_DIR and served publicly at
PUBLIC_BASE_URL/api/uploads/<filename>.

## Step 1 - Attach a Volume in Railway

1. Open the Railway dashboard and select this project and service.
2. Open the service, then go to the Settings (or Volumes) area.
3. Click "Add Volume" / "New Volume".
4. Set the Mount Path to: /data/uploads
5. Save. Railway provisions a persistent volume mounted at that path.

The mount path you choose here MUST match STORAGE_DIR in Step 2.

## Step 2 - Set environment variables in Railway

1. In the same service, open the Variables tab.
2. Add a variable:
   - Name:  STORAGE_DIR
   - Value: /data/uploads   (must equal the volume mount path from Step 1)
3. Add a variable:
   - Name:  PUBLIC_BASE_URL
   - Value: https://www.friendlypartyrental.com   (no trailing slash)
4. Save. Railway will redeploy the service.

## Step 3 - Merge and deploy

1. Merge PR #62 into the default branch.
2. Let Railway build and deploy the new code (or trigger a deploy).
3. Confirm the deploy is healthy.

## Step 4 - Migrate existing base64 images (run once)

Existing items may still have base64 image data in the database. A one-time
migration endpoint converts those to files on the volume.

1. Sign in to the admin site so you have an authenticated session.
2. Send an authenticated POST request to:
   /api/admin/migrate-item-images
3. The endpoint is idempotent (safe to re-run) and returns JSON:
   { total, migrated, failed, errors }
   - total    = items checked
   - migrated = base64 images moved to the volume
   - failed   = items that could not be migrated
   - errors   = details for any failures

## Notes and tradeoffs

- Railway is not truly free: usage is billed, and a volume plus serving
  image bytes through the app both draw down usage. A dedicated object
  store (for example Cloudflare R2) has a free tier and offloads serving,
  but you chose the all-Railway approach.
- Volume durability: files persist across deploys, but are lost if the
  volume itself is detached, deleted, or recreated. Keep a backup if the
  images matter.
- If STORAGE_DIR is unset, uploads fall back to storing base64 in the
  database (previous behavior), so the app keeps working before the volume
  is attached.
