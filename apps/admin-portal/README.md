# IEDC Admin Portal

Admin dashboard for IEDC. Built with React + Vite.

## Local development

From `apps/admin-portal`:

- Install: `pnpm install`
- Run: `pnpm dev`

### Environment variables

This app reads the API base URL from:

- `VITE_API_URL`

Example:

```dotenv
VITE_API_URL=https://api.iedclbscek.in/api
```

The HTTP client is configured in [src/api/axios.js](src/api/axios.js).

## Deploy (Vercel)

Target:

- Admin portal: `admin.iedclbscek.in`
- API server: `api.iedclbscek.in`

Recommended Vercel setup:

- **Root Directory**: `apps/admin-portal`
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Environment Variables**:
	- `VITE_API_URL=https://api.iedclbscek.in/api`

SPA routing is handled via [vercel.json](vercel.json) so routes like `/events` work on refresh.
