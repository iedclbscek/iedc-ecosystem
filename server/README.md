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
- `ADMIN_PORTAL_URL=https://admin.iedclbscek.in` (used for password setup link; must be HTTPS in production)

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

### Clubs

- `GET /clubs`
  - Admin: all clubs
  - Non-admin: only clubs where they are a member/manager
- `POST /clubs`
  - Admin only
  - Body: `{ name, description?, memberUserIds?, managerUserIds? }`
- `GET /clubs/:id`
  - Admin or club member/manager
- `PATCH /clubs/:id`
  - Admin or club manager
  - Body: `{ name?, description?, memberUserIds?, managerUserIds? }`
- `DELETE /clubs/:id`
  - Admin only

### Events

Events are scoped to a club. Club members/managers can manage that club's events.

- `GET /clubs/:clubId/events`
  - Query: `search` (matches title/location)
- `POST /clubs/:clubId/events`
  - Body: `{ title, description?, location?, startAt?, endAt?, coordinatorUserIds? }`
- `PATCH /clubs/:clubId/events/:eventId`
  - Body: `{ title?, description?, location?, startAt?, endAt?, coordinatorUserIds? }`
- `DELETE /clubs/:clubId/events/:eventId`

Legacy endpoints (still present for compatibility):

- `GET /events`
- `POST /events` (requires `clubId` in body)
- `PATCH /events/:id`
- `DELETE /events/:id`

Coordinators are stored as references to `User` in `coordinatorUsers` (array). The old single `coordinatorUser` field is kept temporarily.

## Health

- `GET /api/health`
  - Returns `{ status: "ok", uptime, timestamp }`
