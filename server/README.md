# IEDC Server (API)

Express + MongoDB API for the IEDC ecosystem.

## Production

* API base URL: `https://api.iedclbscek.in/api`
* Swagger UI: `https://api.iedclbscek.in/api-docs`
* OpenAPI JSON: `https://api.iedclbscek.in/api-docs.json`

## Route prefixes

* Admin: `/api/admin/*`
* Public: `/api/public/*`
* Registrations: `/api/registrations/*`

## Local development

From this folder:

1) Install deps: `pnpm install`
2) Create `server/.env`
3) Run: `pnpm dev`

The server defaults to `http://localhost:5000` (unless `PORT` is set).

## Environment variables

Create `server/.env`.

### Required

* `MONGO_URI=...` (or whatever `config/db.js` expects)
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

* Production should allow the known deployment origins.
* Local development also allows any `http://localhost:<port>` origin (so Vite can run on 5173+).

## API documentation

The API reference lives in Swagger:

* UI: `GET /api-docs`
* JSON: `GET /api-docs.json`

## Email Template Center

Student registration confirmation uses template key: `student_registration_confirmation`.
