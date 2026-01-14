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

Email (required for OTP + registration confirmation emails):

- `EMAIL_USER=...`
- `EMAIL_PASS=...`
- `EMAIL_FROM=...` (optional; defaults to `EMAIL_USER`)

Optional custom SMTP (instead of Gmail service):

- `SMTP_HOST=...`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`

## CORS

CORS is configured in `server/server.js` and should allow:

- `https://admin.iedclbscek.in`
- `https://iedclbscek.in`
- `https://portal.iedclbscek.in`
- `https://makerspace.iedclbscek.in`

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

## Public API endpoints

All routes are prefixed with `/api/public`.

### Member lookup (legacy-compatible)

- `GET /member?id=IEDC24IT029`
  - Query: `id` (or `membershipId`)
  - Response:
    - `{ "success": true, "data": { firstName, lastName, admissionNo, department, yearOfJoining, membershipId, userType, organization } }`
  - Notes:
    - Works for student IDs and staff/guest IDs.
    - For staff/guest: `admissionNo` is an empty string, and `organization` is set when available.

### Makerspace OTP

Two equivalent path styles are supported:

- **Short**: `/send-otp` and `/verify-otp`
- **Namespaced**: `/makerspace/send-otp` and `/makerspace/verify-otp`

Send OTP:

- `POST /send-otp`
  - Body (either):
    - `{ "email": "user@example.com" }`
    - `{ "membershipId": "IEDC24IT029" }`
  - Response: `{ "success": true, "sent": true|false }`
  - Notes: OTP is never returned to the client; expires in ~5 minutes.

Verify OTP:

- `POST /verify-otp`
  - Body: `{ "email": "user@example.com", "otp": "123456" }` (or `{ "membershipId": "...", "otp": "123456" }`)
  - Response: `{ "success": true, "message": "OTP verified", "otpToken": "..." }`
  - Notes: OTP is one-time use (deleted after successful verification).

### Makerspace registration (Staff/Guest)

Verify whether an ID is already registered:

- `GET /verify-member?id=IEDC26ST001`
  - Query: `id` (or `membershipId`)
  - Response (examples):
    - Registered: `{ "success": true, "isRegistered": true, "userType": "student"|"staff"|"guest" }`
    - Not registered but staff/guest pattern matches: `{ "success": true, "isRegistered": false, "userType": "staff"|"guest" }`
    - Not registered: `{ "success": true, "isRegistered": false }`

Register staff/guest (final submit):

- `POST /register-staff-guest`
  - Body:
    - Required: `{ "email": "user@example.com", "otpToken": "...", "userType": "staff"|"guest", "firstName": "...", "lastName": "..." }`
    - Optional: `{ "department": "..." }`
    - Guest only (required): `{ "organization": "Company/Institution" }`
    - Staff: `organization` defaults to `LBS College of Engineering Kasaragod` (any provided value is ignored).
    - Legacy fallback (still supported): send `otp` instead of `otpToken`.
  - Response: `{ "success": true, "membershipId": "IEDC26ST005", "accessCode": "IEDC26ST005", "userType": "staff" }`
  - Notes:
    - otpToken (preferred) is verified server-side right before saving.
    - Staff/Guest registrations are stored in a separate collection (`staff_guest_registrations`) to avoid student-only constraints like unique `admissionNo`.
    - `membershipId` is generated as `IEDC<YY><ST|GT><NNN>`.
    - `accessCode` is set equal to `membershipId`.
    - A confirmation email is sent.

### Makerspace check-in

Two equivalent path styles are supported:

- **Short**: `/check-in`
- **Namespaced**: `/makerspace/check-in`

- `POST /check-in`
  - Body: `{ "membershipId": "IEDC24IT029" }`
  - (Also accepts query: `?id=...` or `?membershipId=...`)
  - Response: `{ "success": true, "checkInId": "...", "membershipId": "...", "userType": "...", "checkedInAt": "..." }`
  - Notes: Any ID present in `Registration` can check in (student/staff/guest).
