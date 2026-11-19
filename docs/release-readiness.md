# Deployment readiness

Prepared 19 November 2026 on `codex-club-nexus-editor`. Source is prepared locally. No commit, push, deployment, production environment change or production migration was performed.

## Final checks

| Check | Result |
| --- | --- |
| Clean source copy, with no original node_modules or environment files | Frozen-lockfile install passed with pnpm 12.11.2 |
| Full admin lint | Passed |
| Full main-site lint | Passed |
| Unit/database integration suite | 86 passed, 0 failed, 0 skipped |
| Real HTTP role and Nexus round trip | 45 assertions passed; disposable database removed |
| Actual production server.js smoke on Node 24.22.3 | 20 assertions passed: startup/readiness, health, docs, secure cookies, auth, CORS, public API, event create and duplicate-organisation rejection |
| Admin production build | Passed on Node 24 |
| Public production build | Passed on Node 22 (also tested on Node 24) |
| Browser checks against production-built assets with local API configuration | 58 page/viewport combinations, desktop 1440px and mobile 390px; no page errors or horizontal overflow |
| Nexus builder | Binding, standard/custom widgets, DB team, pointer ordering, save/reload, publication to public page, unsaved-change navigation |
| Delegated member socials | Real lead and member accounts; edit/save, lead publication, member without publish capability, persisted DB-source overrides |
| Event flow | Organisation and GDG drafts, validation, custom date picker, preview, edit, discard, mocked upload failure/retry, publication and public registration link |
| Member access dialog | Permission persistence, legacy-data preservation, error/retry, mobile layout, Escape and roster navigation |
| Mailer | Department/year intersections, recipient previews/pagination, error recovery and delivery to a local capture server using isolated invalid-address fixtures |
| Whitespace/source syntax | Passed |

Browser automation ran inside `munim-virtual`. Temporary application fixtures were removed. Browser production-build checks use the real local data snapshot plus temporary fixtures; they do not establish hosted functionality. The separate production-mode server smoke uses its own disposable database and secure-cookie headers over loopback HTTP.

## Release fixes

- Kept the workspace dependency lockfile eligible for source control and pinned the package manager. Install permissions explicitly allow esbuild and skip optional Scarf telemetry.
- Removed local agent state from release inputs. The email seed module was already tracked; its stale ignore rule was removed.
- Fixed existing main-site lint failures without removing animations. Moved the loader's constant messages outside its component to make its effect dependency stable.
- Made the admin production API fallback use the real HTTPS API address.
- Corrected Cloudinary upload options so event posters retain the editor-selected aspect ratio; profile photos retain the existing square crop. Unit tests cover both paths. External Cloudinary uploads remain untested.
- Fixed the mobile Operations heading that the full-page smoke found extending beyond the homepage viewport.
- Added an explicit ESM scope for shared modules, frozen-install Vercel app configuration, frontend environment examples and repeatable release/migration commands.

## Verified project targets

Read-only Vercel connector checks identified the existing account/team and domain mappings below. Do not deploy to similarly named old projects.

| Application | Vercel project | Production domain | Expected root | Runtime currently configured |
| --- | --- | --- | --- | --- |
| API | iedc-server | api.iedclbscek.in | server | Node 24.x |
| Admin | iedc-admin | admin.iedclbscek.in | apps/admin-portal | Node 24.x |
| Public site | iedc-website | iedclbscek.in and www.iedclbscek.in | apps/main-site | Node 22.x |

Team ID: `team_v1yOlj0P2SVmN08bL1JJhC89`. The separate project named `main-site` has no custom production domain and is not the public-site release target.

The connector exposed framework, runtime, domain and environment-key metadata; it did not expose full root-directory build settings. Confirm the expected roots above before launching the actual deployment. Shared source lives outside each app root, so keep Vercel's [outside-root source inclusion](https://vercel.com/docs/monorepos/monorepo-faq) enabled. No hosted build of this candidate has been created yet.

API startup is compatible with Vercel's documented [Express port-listener entry point](https://vercel.com/docs/frameworks/backend/express). Each app has local vercel.json configuration for the intended framework and frozen dependency installation.

## Production environment

The read-only Vercel inventory confirmed production-target entries for API Mongo, JWT, cookie, mail, admin bootstrap and Cloudinary configuration. Values were not copied into source or artifacts. Inventory presence does not validate external credentials.

Required frontend public values:

- Admin VITE_API_URL: `https://api.iedclbscek.in/api`
- Admin optional VITE_MAIN_SITE_URL: `https://iedclbscek.in`
- Public site VITE_API_URL: `https://api.iedclbscek.in`

Current hosted bundles contain the expected API hostname; this is evidence about the existing release, not this candidate. Ensure COOKIE_DOMAIN is `.iedclbscek.in`, ADMIN_PORTAL_URL is `https://admin.iedclbscek.in`, NODE_ENV is production, and JWT_SECRET/MONGO_URI/mail/Cloudinary secrets remain in Vercel. Optional SWAGGER_SERVER_URL should be `https://api.iedclbscek.in`; otherwise Swagger can use its serving origin.

## Migration and deployment order

1. Keep the verified private backup from the local merge outside the source repository. It describes the local snapshot, not a backup of current production.
2. Before changing production data, set MONGO_URI securely for the intended production database and run `node server/scripts/mergeIedcOrganisation.mjs` without --apply. Review the reported database, club ID and counts. This is read-only.
3. In a maintenance window with application writers stopped, create a fresh production backup and apply the confirmed migration:

   ```bash
   node server/scripts/mergeIedcOrganisation.mjs --apply --club-id <confirmed-id> --backup-file /private/backups/iedc-organisation.json
   ```

   The helper requires a new verified private backup before writes. It preserves event IDs/coordinators and account roles, migrates event access to the organisation Events capability, then removes the duplicate club. It stops before mutation if a Nexus binding or unreviewed club-only account roles require a decision. It does not use a transaction on standalone Mongo. Do not run this operation inside a serverless request.

4. Deploy the API candidate first, confirm /api/ready and /docs, then deploy admin and public projects from the same source candidate. Ensure all new shared modules, controllers and source assets are included; the current work includes untracked new files that a plain push of existing commits would omit.
5. Verify hosted sign-in/cookie round trip, all-club superadmin selection, club member restrictions, event publication, existing team QR URLs, Nexus draft/public separation and /docs. Test one controlled media upload and one controlled mail/verification delivery only when authorized for those external side effects.

The production IEDC merge is not automatic on server startup. The local snapshot is already merged. Production remains unchanged until the migration and release are explicitly run.

## Rollback and limits

Keep the current production deployment IDs before promoting the candidate. Reverting code alone does not reverse the organisation data migration. Preserve the fresh production EJSON backup and inspect any subsequent edits before restoring individual records. Original event IDs and public team profile URLs remain stable.

Live Cloudinary upload, real email/OTP delivery, Vercel packaging/cold starts, Safari physical-device behavior and post-deployment performance were not claimed as tested. Custom widgets are sandboxed; browser sandboxing does not impose a CPU/memory quota.

The prepared source archive excludes node_modules, built test variants, .git, real environment files, agent state and private backups. It includes the workspace lockfile and all new source files; its SHA-256 manifest identifies the source candidate.
