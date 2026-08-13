<div align="center">

<img src="apps/main-site/public/img/logo/IEDCLBSLogoColor.webp" alt="IEDC LBSCEK Logo" width="180" />

# IEDC LBSCEK Ecosystem

**Innovation & Entrepreneurship Development Cell**
*LBS College of Engineering, Kasaragod, Kerala*

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-Powered-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![pnpm](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

---

**[🌐 Main Site](https://iedclbscek.in)** · **[🔧 Admin Portal](https://admin.iedclbscek.in)** · **[📡 API](https://api.iedclbscek.in/api)** · **[📖 Swagger Docs](https://api.iedclbscek.in/api-docs)**

</div>

---

## 📌 Overview

The **IEDC LBSCEK Ecosystem** is a full-stack monorepo powering the digital infrastructure of the Innovation & Entrepreneurship Development Cell at LBS College of Engineering, Kasaragod. It consists of three tightly integrated packages:

| Package | Description | Production URL |
|---|---|---|
| `apps/main-site` | Public-facing React website | [iedclbscek.in](https://iedclbscek.in) |
| `apps/admin-portal` | Internal admin dashboard | [admin.iedclbscek.in](https://admin.iedclbscek.in) |
| `server` | REST API + Database backend | [api.iedclbscek.in](https://api.iedclbscek.in) |

---

> **Note on version numbers:** Package versions, team details, and community counts listed in this README reflect the state at time of writing and may drift as the project evolves. Architecture diagrams and API route groups change infrequently and are the most reliable reference.

---

## 🏗️ Architecture

```
iedc-ecosystem/                     ← pnpm Workspace Root
├── apps/
│   ├── main-site/                  ← Public Website (React 19 + Vite 6)
│   │   └── src/
│   │       ├── pages/              ← 9 route-level page components
│   │       ├── components/         ← Reusable UI, layout & home sections
│   │       ├── data/               ← Static team & community data
│   │       ├── services/           ← Axios API service layer
│   │       └── utils/              ← Utility helpers
│   │
│   └── admin-portal/               ← Admin Dashboard (React 19 + Vite 7)
│       └── src/
│           ├── pages/              ← 11 admin pages
│           ├── components/         ← Auth guards, Execom manager
│           ├── layouts/            ← AdminLayout shell (sidebar + header)
│           ├── api/                ← Axios API service layer
│           └── context/            ← View mode context (Execom ↔ Club)
│
└── server/                         ← Express REST API (Node.js + MongoDB)
    ├── controllers/                ← Business logic (9 controllers)
    ├── models/                     ← Mongoose schemas (14 models)
    ├── routes/                     ← Express route definitions (6 routers)
    ├── middleware/                 ← Auth middleware (JWT)
    ├── config/                     ← DB connection, Swagger spec
    └── utils/                      ← Mailer, Cloudinary, seeders, helpers
```

---

## ⚙️ Tech Stack

### Backend — `server/`

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | >=18.0.0 | JavaScript runtime |
| **Express.js** | ^4.18 | HTTP server & routing framework |
| **MongoDB** | Atlas (Cloud) | Primary database (NoSQL) |
| **Mongoose** | ^7.0 | MongoDB ODM — schemas & models |
| **JSON Web Token** | ^9.0 | Stateless auth via HTTP-only cookies |
| **bcryptjs** | ^2.4 | Password hashing |
| **Nodemailer** | ^7.0 | SMTP email delivery (OTP, confirmations) |
| **Cloudinary** | ^2.10 | Cloud image storage & transformation |
| **swagger-jsdoc** | ^6.2 | Auto-generate OpenAPI 3.0 spec from JSDoc |
| **nodemon** | ^3.0 | Dev auto-restart on file changes |
| **dotenv** | ^16.0 | Environment variable management |

### Main Site — `apps/main-site/`

| Technology | Version | Purpose |
|---|---|---|
| **React** | ^19.1 | UI component framework |
| **Vite** | ^6.3 | Build tool & dev server |
| **TailwindCSS** | ^4.1 | Utility-first CSS framework |
| **Framer Motion** | ^12.18 | Declarative animations & transitions |
| **React Router DOM** | ^6.30 | Client-side routing (SPA) |
| **Axios** | ^1.10 | HTTP client for API calls |
| **react-hot-toast** | ^2.5 | Toast notification system |
| **lucide-react** | ^0.525 | Icon library |
| **react-icons** | ^5.5 | Extended icon sets (FA, etc.) |

### Admin Portal — `apps/admin-portal/`

| Technology | Version | Purpose |
|---|---|---|
| **React** | ^19.2 | UI component framework |
| **Vite** | ^7.2 | Build tool & dev server |
| **TailwindCSS** | ^4.1 | Utility-first CSS framework |
| **@tanstack/react-query** | ^5.90 | Server state management & caching |
| **React Router DOM** | ^7.11 | Client-side routing |
| **Axios** | ^1.13 | HTTP client for API calls |
| **@dnd-kit** | ^6.x / ^10.x | Drag-and-drop team entry ordering |
| **xlsx** | ^0.18 | Excel file export |
| **papaparse** | ^5.5 | CSV parsing & export |
| **react-image-crop** | ^11.0 | In-browser image cropping |
| **react-hot-toast** | ^2.6 | Toast notification system |
| **lucide-react** | ^0.562 | Icon library |

### Infrastructure & DevOps

| Technology | Purpose |
|---|---|
| **pnpm Workspaces** | Monorepo dependency management |
| **Vercel** | Frontend deployment (both apps) |
| **MongoDB Atlas** | Managed cloud database |
| **Cloudinary** | Media CDN & image storage |
| **Google Fonts (Inter)** | Typography |

---

## 🌐 Main Site — Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | `HomePage` | Landing page with animated sections |
| `/about` | `AboutPage` | IEDC history, vision & mission |
| `/events` | `EventsPage` | All events listing (API-driven) |
| `/events/:id` | `EventPage` | Single event detail & registration |
| `/team` | `TeamPage` | Execom team — 2024 & 2025 editions |
| `/nexus` | `CommunitiesPage` | All 13 student clubs/communities |
| `/nexus/:id` | `CommunityPage` | Individual community detail page |
| `/register` | `RegistrationPage` | 3-step OTP-verified member registration |

### Home Sections
`HeroSection` · `AboutSection` · `WhatWeDoSection` · `CommunitiesSection` · `EventsSection` · `ImpactSection` · `TeamPreviewSection`

---

## 🔐 Admin Portal — Pages & Features

| Route | Page | Permission Required |
|---|---|---|
| `/login` | `Login` | — |
| `/set-password` | `SetPassword` | — |
| `/` | `Dashboard` | `dashboard` |
| `/registrations` | `Registrations` | `registrations` |
| `/events` | `Events` | `events` |
| `/users` | `Users` | `users` |
| `/makerspace` | `Makerspace` | `makerspace` |
| `/mailer` | `Mailer` | `mailer` |
| `/settings` | `Settings` | `settings` |
| `/team-entry/update` | `TeamEntryUpdate` | Token-based |

### Key Admin Features
- **Dual View Mode** — Switch between full *Execom View* and *Club-scoped View*
- **Granular RBAC** — Role (`admin`) + permission array + `isClubLead` flag
- **Drag & Drop Execom** — Reorder team entries with `@dnd-kit`
- **Excel/CSV Export** — Export registrations via `xlsx` + `papaparse`
- **Image Crop & Upload** — Cloudinary-backed image management
- **Email Campaign Center** — Send templated emails to member groups
- **QR Check-In** — Attendance management for events

---

## 📡 API Reference

**Base URL:** `https://api.iedclbscek.in/api`
**Swagger UI:** `https://api.iedclbscek.in/api-docs`
**OpenAPI JSON:** `https://api.iedclbscek.in/api-docs.json`

### Route Groups

| Prefix | Router File | Scope |
|---|---|---|
| `GET /api/health` | inline | Health check |
| `/api/admin/*` | `adminRoutes.js` | Protected admin operations |
| `/api/public/*` | `publicRoutes.js` | Public read endpoints |
| `/api/users/*` | `usersPublicRoutes.js` | Public user endpoints |
| `/api/registrations/*` | `registrationRoutes.js` | Event registration flow |
| `/api/checkin/*` | `checkinRoutes.js` | QR check-in system |
| `/api/events/*` | `eventsPublicRoutes.js` | Public event listing |

### Auth Flow
- Admin login issues an **HTTP-only JWT cookie** named `token`
- Cookie is shared cross-subdomain via `COOKIE_DOMAIN=.iedclbscek.in`
- All `/api/admin/*` routes require `requireAuth` middleware
- OTP-based **email verification** is used for member registration

---

## 🗄️ Database Models

| Model | Description |
|---|---|
| `User` | Admin/staff accounts with roles & permissions |
| `UserStatus` | Per-user status flags |
| `Registration` | Event registration records with admission numbers |
| `RegistrationCounter` | Auto-incrementing admission number sequences |
| `Event` | Event schema (title, date, capacity, images) |
| `Club` | Community club schema |
| `ClubMembership` | User ↔ Club membership mapping |
| `WebsiteTeamEntry` | Execom entries displayed on the public team page |
| `CheckIn` | Check-in session schema |
| `CheckInLog` | Individual attendance records |
| `OTP` | Time-limited OTP tokens for email verification |
| `EmailTemplate` | DB-stored, editable email templates |
| `StaffGuestRegistration` | Staff/guest event registrations |
| `BannedMembershipId` | Blocklist for membership IDs |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 18.0.0`
- **pnpm** `>= 8.x` — Install: `npm install -g pnpm`
- **MongoDB** URI (Atlas or local)

### 1. Clone the Repository

```bash
# Upstream (IEDC official)
git clone https://github.com/iedclbscek/iedc-ecosystem.git

# Or your fork
git clone https://github.com/sanjay-sanju-03/iedc-ecosystem.git
cd iedc-ecosystem
```

### 2. Install All Dependencies

```bash
# Installs dependencies for all workspaces at once
pnpm install
```

### 3. Configure Environment Variables

Create `server/.env`:

```env
# ── Database ──────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/IEDC

# ── Auth ──────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_here

# ── Seeded Admin Account ──────────────────────
ADMIN_MEMBERSHIP_ID=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourStrongPassword123

# ── Cookie Domain ─────────────────────────────
COOKIE_DOMAIN=.yourdomain.com
ADMIN_PORTAL_URL=http://localhost:5174

# ── Email (SMTP / Gmail App Password) ─────────
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Your Name <no-reply@example.com>

# ── Cloudinary (Image Uploads) ────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Server ────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── CORS ──────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 4. Run in Development

```bash
# Terminal 1 — Backend API (port 5000)
cd server && pnpm dev

# Terminal 2 — Main Site (port 5173)
cd apps/main-site && pnpm dev

# Terminal 3 — Admin Portal (port 5174)
cd apps/admin-portal && pnpm dev
```

| Service | URL |
|---|---|
| 🌐 Main Site | http://localhost:5173 |
| 🔧 Admin Portal | http://localhost:5174 |
| 📡 API Server | http://localhost:5000 |
| 📖 Swagger Docs | http://localhost:5000/api-docs |
| ❤️ Health Check | http://localhost:5000/api/health |

> **Note:** On first boot, the server auto-seeds the admin user and email templates from `ADMIN_*` env vars.

---

## 🏗️ Building for Production

```bash
# Build main site
cd apps/main-site && pnpm build

# Build admin portal
cd apps/admin-portal && pnpm build

# Start server in production
cd server && NODE_ENV=production pnpm start
```

---

## 🎨 Design System

The main site uses a custom TailwindCSS v4 theme defined in `apps/main-site/src/index.css`:

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#F5F5DC` | Beige/cream primary background |
| `--color-accent` | `#FF6B6B` | Coral red — CTAs & highlights |
| `--color-text-dark` | `#2E2E2E` | Primary text |
| `--color-text-light` | `#6E6E6E` | Secondary text |
| `--color-bg-main` | `#FAFAFA` | Page background |
| `--color-cta` | `#A8D5BA` | Mint green — secondary CTAs |

**Typography:** Inter (Google Fonts) — weights 300–800

---

## 🌐 The Nexus — Student Communities

The `/nexus` section showcases 13 student communities under IEDC LBSCEK:

| Community | Focus |
|---|---|
| 🎓 Mulearn | Peer learning & skill development |
| 💡 TinkerHub | Innovation & maker culture |
| 🛡️ Cyber Community | Cybersecurity & ethical hacking |
| 💻 FOSS Club | Free & Open Source Software |
| 🖥️ MLSA | Microsoft Learn Student Ambassadors |
| 🧑‍💻 Coders Club | Programming & competitive coding |
| 🚀 Galaxia LBSCEK | Space science & astronomy |
| 🌐 GDG on Campus | Google Developer Groups |
| ⚡ YIP Club | Young Innovators Programme (K-DISC) |
| 🔌 Women Tech Makers | Google WTM program |
| 🔗 KBA Chapter | Kerala Blockchain Academy |
| ✨ WOW Club | Women of Wonders |
| ☁️ AWS Club | Amazon Web Services community |

---

## 🔒 Security

> ⚠️ Never commit your `.env` file — it is gitignored by default.

### Implemented
- JWT tokens stored in **HTTP-only cookies** (not localStorage) — XSS safe
- Admin routes require both **authentication** and **per-route permission checks**
- OTP-based email verification required for all member registrations
- CORS restricted to known production and local origins
- Passwords hashed with **bcryptjs** — never stored in plaintext
- `portalAccessEnabled` flag allows instant account lockout

### Operational Controls Required Before Production
- `NODE_ENV=production` must be set — disables debug logging of cookies/headers
- Rate limiting on `/login`, `/send-otp`, and `/register` endpoints (not yet implemented)
- Cloudinary unsigned uploads must be disabled in the Cloudinary dashboard
- Secrets (MongoDB URI, JWT secret, email password) should be rotated periodically and stored in a secrets manager, not shared over unencrypted channels
- Personal student email addresses in `communitiesData.jsx` should be replaced with club-owned addresses to prevent harvesting

---

## 🤝 Contributing

This project uses a **fork-based contribution workflow**. The canonical repository is [`iedclbscek/iedc-ecosystem`](https://github.com/iedclbscek/iedc-ecosystem). Contributors work on forks and submit PRs targeting `upstream/main`.

1. Fork [`iedclbscek/iedc-ecosystem`](https://github.com/iedclbscek/iedc-ecosystem)
2. Add upstream remote: `git remote add upstream https://github.com/iedclbscek/iedc-ecosystem.git`
3. Create a feature branch off `upstream/main`: `git checkout -b feature/your-feature-name`
4. Commit your changes: `git commit -m "feat: add your feature"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request from your fork's branch → `iedclbscek/iedc-ecosystem:main`

### Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation update
style:    Code style/formatting
refactor: Code refactor
chore:    Build process or auxiliary tools
```

---

## 👥 Core Team (2025)

| Role | Name |
|---|---|
| Lead & CIO | Yadumitra U N |
| Operation Lead & COO | Fathima Rifda |
| Technology Lead & CTO | Umar Al Mukhtar Ibrahimkutty |
| Creative Lead & CCO | Adhish R |
| Finance Lead & CFO | Anagha A |
| Community Lead | Thanseeha Nasrin P M |
| Nodal Officers | Dr. Sarith Divakar M · Dr. Arathi T |

---

## 📄 License

This project is the property of **IEDC LBSCEK** — LBS College of Engineering, Kasaragod, Kerala.
All rights reserved © 2025 IEDC LBSCEK.

---

<div align="center">

Made with ❤️ by the **IEDC LBSCEK Tech Team**

[iedclbscek.in](https://iedclbscek.in) · [Instagram](https://instagram.com/iedc_lbscek) · [LinkedIn](https://linkedin.com/company/iedc-lbscek)

</div>
