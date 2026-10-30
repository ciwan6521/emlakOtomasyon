# Instagram & Facebook autoposting

Published listings are posted automatically to Instagram and Facebook through
the Meta Graph API. Instagram does **not** allow posting with a username and
password; it requires a Business (or Creator) account connected to a Facebook
Page, a Meta developer app, and an access token. This guide walks through the
one-time setup.

## What happens in the app

- When a listing is published (`POST /properties/:id/publish`) the social
  worker creates a post with the cover photo plus up to 9 more photos (a
  carousel), a caption built from the listing (type, district, rooms, m²,
  price, features, description, reference and hashtags) and schedules reposts
  after 1 and 7 days. Price changes trigger a "new price" repost.
- Posts are visible under **Social** in the app and the published permalink is
  shown on the listing card (Instagram / Facebook links).
- Until `INTEGRATIONS_MODE=live` and the Meta variables are set, posts are
  *simulated*: they appear in the Social page as published but nothing leaves
  the server. **Settings → Integrations** shows the live/simulated state of
  each channel and the resolved account (`@handle` / Page name).

## Prerequisites

1. An **Instagram Business or Creator account**. In the Instagram app:
   *Settings → Account type and tools → Switch to professional account*.
2. A **Facebook Page** for the agency, and the Instagram account connected to
   it: Facebook Page → *Settings → Linked accounts → Instagram → Connect*.
3. Photos must be publicly reachable by Meta's servers. `S3_PUBLIC_URL`
   (e.g. `https://media.pointstepup.com`) must serve the uploaded images over
   HTTPS without authentication. JPEG is required by Instagram (PNG is
   rejected); max 8 MB; aspect ratio between 4:5 and 1.91:1.

## Step 1 — Create a Meta app

1. Go to <https://developers.facebook.com/apps> → **Create App**.
2. Use case: **Other** → type **Business**. Name it e.g. `Point REOS`.
3. In the app dashboard add the products **Instagram Graph API** and
   **Facebook Login for Business** (or just *Instagram* in the newer UI).

## Step 2 — Get a long-lived Page token

The easiest reliable path is the Graph API Explorer:

1. Open <https://developers.facebook.com/tools/explorer>, select your app.
2. Under *User or Page* choose **Get Page Access Token** and pick the agency
   Page. Grant these permissions when prompted:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`.
3. Click **Generate Access Token**. This is a *short-lived user token*.
4. Exchange it for a long-lived user token (60 days):

   ```
   https://graph.facebook.com/v19.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=APP_ID
     &client_secret=APP_SECRET
     &fb_exchange_token=SHORT_LIVED_TOKEN
   ```

5. Fetch the **Page token** that belongs to that long-lived user token. Page
   tokens derived from a long-lived user token do not expire:

   ```
   https://graph.facebook.com/v19.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN
   ```

   The response lists your Pages with `id` (→ `FB_PAGE_ID`) and
   `access_token` (→ `META_GRAPH_TOKEN`).

## Step 3 — Find the Instagram Business account id

```
https://graph.facebook.com/v19.0/FB_PAGE_ID?fields=instagram_business_account&access_token=META_GRAPH_TOKEN
```

The returned `instagram_business_account.id` is `IG_BUSINESS_ACCOUNT_ID`.

## Step 4 — Configure the server

Edit `.env.production` on the server:

```
INTEGRATIONS_MODE=live
META_GRAPH_TOKEN=EAAB...          # Page token from step 2
IG_BUSINESS_ACCOUNT_ID=1784...    # from step 3
FB_PAGE_ID=1029...                # leave empty to post to Instagram only
```

Then restart the API and worker so they pick up the variables:

```
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api worker
```

Open **Settings → Integrations**: the Instagram card should show *Live* and
the resolved `@handle`. If it shows an error, the message comes straight from
Meta (expired token, missing permission, account not linked to the Page).

## Step 5 — App review (going beyond test users)

While the Meta app is in **Development** mode only people with a role on the
app (admin/developer/tester) can publish. That is enough for a single agency
account: add the person who owns the Instagram account as an app admin. If you
later need other businesses to connect, submit `instagram_content_publish` and
`pages_manage_posts` for App Review and switch the app to **Live**.

## Limits and troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Media ID is not available` | Container not finished; the worker polls up to 60 s — usually a slow or unreachable image URL. Check `S3_PUBLIC_URL`. |
| `Only photo or video can be accepted as media type` | Image URL did not return `image/jpeg`. |
| `The aspect ratio is not supported` | Crop photos to between 4:5 and 1.91:1. |
| `(#10) Application does not have permission` | Token is missing `instagram_content_publish` or the IG account is not linked to the Page. |
| `Error validating access token` | Token expired or password changed — regenerate (step 2). |
| Post count limit | Instagram allows 50 API-published posts per 24 h per account. |

Failed posts are kept with status *Failed* in the Social page; the reason is
logged by the worker (`docker compose logs worker`).
