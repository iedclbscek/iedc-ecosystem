# IEDC LBSCEK Website (Main Site)

Public-facing website built with React + Vite + Tailwind.

## Tech stack

* React + Vite
* Tailwind CSS (v4)
* React Router
* Axios

## Prerequisites

* Node.js `>= 18`
* pnpm (recommended; this repo uses `pnpm-workspace.yaml`)

## Setup

From the repo root:

1. Install dependencies:

    `pnpm install`

2. Create `apps/main-site/.env`:

    `VITE_API_URL=http://localhost:5000`

3. Start the dev server:

    `pnpm -C apps/main-site dev`

The app usually runs at `http://localhost:5173` (Vite may choose another port if busy).

## Scripts

From `apps/main-site`:

* Dev: `pnpm dev`
* Build: `pnpm build`
* Preview: `pnpm preview`

## API integration notes

* API base URL is `VITE_API_URL`.
* Registration uses OTP endpoints (`/api/public/send-otp`, `/api/public/verify-otp`) and then submits to `/api/registrations`.
