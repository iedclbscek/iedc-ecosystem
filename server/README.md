# IEDC Server (API)

Express + MongoDB API for the IEDC ecosystem.

## Production

* API base URL: `https://api.iedclbscek.in/api`
* Swagger UI: `https://api.iedclbscek.in/docs`
* OpenAPI JSON: `https://api.iedclbscek.in/api-docs.json`

## Route prefixes

* Admin: `/api/admin/*`
* Public: `/api/public/*`
* Registrations: `/api/registrations/*`

## Local development

From the repository root, install dependencies with `pnpm install --frozen-lockfile` and copy `server/.env.example` to `server/.env`. Configure the copied file, then run `pnpm --dir server dev`.

See the root [development guide](../README.md#local-development) for coordinated setup of the API and both frontends.

The server defaults to `http://localhost:5000` (unless `PORT` is set).

## Environment variables

Create `server/.env`.

### Required

* `MONGO_URI=...`
* `JWT_SECRET=...`

### Recommended (production)

* `NODE_ENV=production`
* `COOKIE_DOMAIN=.iedclbscek.in` (leading dot enables sharing across subdomains)
* `ADMIN_PORTAL_URL=https://admin.iedclbscek.in` (password setup link)
* `PUBLIC_SERVER_URL=https://api.iedclbscek.in` (used by Swagger server list)

### Email (required for OTP + confirmation emails)

* `EMAIL_USER=...`
* `EMAIL_PASS=...`
* `EMAIL_FROM=...` (optional; defaults to `EMAIL_USER`)

### Optional (custom SMTP instead of Gmail service)

* `SMTP_HOST=...`
* `SMTP_PORT=587`
* `SMTP_SECURE=false`

## Auth notes

Admin auth uses an HTTP-only cookie named `token`.

For cross-subdomain usage (admin portal on `admin.iedclbscek.in`), production must be HTTPS and `COOKIE_DOMAIN` must be configured.

## CORS

CORS is configured in `server/server.js`.

* Production accepts HTTPS on the configured base domain and its `www`, `admin`, and `api` hosts. Add each additional trusted origin, including any Vercel preview that needs credentialed access, to the comma-separated `ALLOWED_ORIGINS` setting.
* Local development also allows any `http://localhost:<port>` origin (so Vite can run on 5173+).

## API documentation

The API reference lives in Swagger:

* UI: `GET /docs`
* JSON: `GET /api-docs.json`

## Email Template Center

Student registration confirmation uses template key: `student_registration_confirmation`.

## Club Nexus pages

Administrators explicitly connect a club to a stable public slug with
`PATCH /api/admin/clubs/:clubId/public-binding` and `{ "slug": "gdg", "draft": { ... } }`.
The draft may be omitted for a new empty page. Superadmins can correct a connection by sending a new slug, its draft and the current expectedRevision. The previous snapshot is retained privately in club_page_binding_backups before the revision-checked update. The old slug is released; any original static page is available again. The target starts as an unpublished draft. Occupied slugs and stale revisions return 409. Same-slug requests do not replace content. A failed concurrent change may leave an additional safety backup, without changing the active connection.
The portal imports the existing content when connecting an existing Nexus page.

Club leads receive page editing and publishing capabilities for their own clubs. They can grant
`club_page_edit` and `club_page_publish` independently through the existing portal-member endpoints,
using `pagePermissions: []` to revoke both. The legacy `permissions` array continues to update event
grants only. Concurrent requests preserve the other namespace.

- `GET /api/admin/clubs/:clubId/page` returns `{ page, access }`, including `pageEdit` and `pagePublish`.
- `PUT /api/admin/clubs/:clubId/page/draft` accepts `{ expectedRevision, draft }`.
- `POST /api/admin/clubs/:clubId/page/publish` and `/unpublish` accept only `{ expectedRevision }`.
- `GET` and `PUT /api/admin/nexus/order` read/save `{ order: ["gdg", "tinkerhub"] }` for administrators.
- `GET /api/public/nexus` returns published cards, explicit withdrawn slugs and directory order.
- `GET /api/public/nexus/:slug` returns published content only. A 404 with `legacy: true` allows the
  frontend's static fallback; `withdrawn: true` explicitly forbids that fallback.

Save/publish increment the revision atomically. A stale revision returns 409 without replacing the
saved content. Publish copies the persisted draft, so a publisher cannot inject an unsaved body.
Deleting a club withdraws its public page while retaining a slug tombstone.

Page limits and supported fields are defined in [the shared schema](../shared/clubPageSchema.js). Image URLs
require HTTP(S) or a site-relative path and image widgets require alternative text. Custom code runs
in an opaque-origin iframe with only scripts allowed, restrictive CSP, no parent data bridge, and no
API connections. This sandbox limits authority, not CPU or memory usage. Review code before publishing.
Normal text does not execute HTML. Page uploads use `purpose: "club_page"` and the owning `clubId`.

Run the disposable HTTP verification against a local Mongo endpoint:

```sh
TEST_MONGO_URI=mongodb://127.0.0.1:28473 node server/scripts/clubNexusRoundTrip.mjs
```

It starts the real Express routers on an ephemeral loopback port, creates bcrypt fixture accounts in
a unique database, signs in with cookies, verifies grants/revisions/publication/revocation/withdrawal,
and drops and checks the disposable database in `finally`. It never writes the existing preview or
production database and never sends email or performs a Cloudinary upload.

The Team members widget can use `source: "club"` for the owning club's live team or
`source: "custom"` for its saved display list. Customizing the list changes only the page widget;
it does not change membership or account roles. Legacy team widgets retain their custom lists.
The live source includes club-associated users who already opted into public website visibility
or have a visible linked team profile, excluding inactive club memberships. It returns only
a public team projection, including display details and social links, without private email addresses or membership IDs.
`GET /api/public/nexus/:slug/team` requires a published page; editors can preview the same safe data
before publication through `GET /api/admin/clubs/:clubId/page/team`.

## Second-year representative applications

The public API is `/api/second-year-representatives/*`; review, settings, and CSV routes are under `/api/admin/second-year-reps` and require `secondYearReps` permission.

Codes use the separate `second_year_rep_otps` collection. Startup waits for its unique email and TTL indexes and the applications' unique membership index. Eligibility is defined in [the representative controller](controllers/secondYearRepController.js); semester does not override its cohort restriction. Records missing an admission number must be corrected before applying.

OTP request limits are process-local. Multiple API workers need a shared limit store; deployments behind a proxy need correctly scoped Express `trust proxy` configuration for client IP limits. Forwarded headers are not trusted by default.

Run `pnpm test` here for regression checks using stubbed database queries and mail transport. These checks do not verify live MongoDB indexes, SMTP delivery, or deployment behavior.
