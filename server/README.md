# IEDC Server (API)

Base URL (production): `https://api.iedclbscek.in/api`

This server exposes admin endpoints under:

- `https://api.iedclbscek.in/api/admin/*`

Auth uses an HTTP-only cookie (`token`). For cross-subdomain usage (admin portal on `admin.iedclbscek.in`), production must be HTTPS and the cookie domain must be configured.

## Required environment variables

Create `server/.env`:

- `MONGO_URI=...` (or whatever your `config/db.js` expects)
- `JWT_SECRET=...`
- `NODE_ENV=production`
- `COOKIE_DOMAIN=.iedclbscek.in` (leading dot enables sharing across subdomains)
- `ADMIN_PORTAL_URL=https://admin.iedclbscek.in` (used for password setup link)

## CORS

CORS is configured in `server/server.js` and should allow:

- `https://admin.iedclbscek.in`
- `https://iedclbscek.in`
- `https://portal.iedclbscek.in`

## Admin API endpoints

All routes are prefixed with `/api/admin`.

### Auth

- `POST /auth/login`
  - Body: `{ "membershipId": "...", "password": "..." }`
  - Sets cookie: `token`
- `POST /auth/logout`
  - Clears cookie: `token`
- `GET /auth/me`
  - Returns current user from cookie
- `POST /auth/set-password`
  - Body: `{ "userId": "...", "token": "...", "password": "..." }`

### Registrations

- `GET /registrations`
  - Query: `page`, `limit`, `search`
- `DELETE /registrations/:id`

### Team Members (Users)

- `GET /users`
- `GET /users/search`
  - Query: `query`
- `POST /users/promote`
  - Body: `{ registrationId, role, customRole?, permissions? }`
- `PATCH /users/:id`
  - Body: `{ role, customRole?, permissions? }`
- `DELETE /users/:id`

### Email Templates

- `GET /email/templates`
- `GET /email/templates/:id`
- `POST /email/templates`
  - Body: `{ key, name, subject?, html }`
- `PATCH /email/templates/:id`
  - Body: `{ name?, subject?, html? }`
- `POST /email/templates/:id/test`
  - Body: `{ to, data }`

### Events

- `GET /events`
  - Query: `search` (matches title/location)
- `POST /events`
  - Body: `{ title, description?, location?, startAt?, endAt?, coordinatorUserId? }`
- `PATCH /events/:id`
  - Body: `{ title?, description?, location?, startAt?, endAt?, coordinatorUserId? }`
- `DELETE /events/:id`

Coordinator is stored as a reference to a `User` (`coordinatorUser`).

## Health

- `GET /api/health`
  - Returns `{ status: "ok", uptime, timestamp }`
