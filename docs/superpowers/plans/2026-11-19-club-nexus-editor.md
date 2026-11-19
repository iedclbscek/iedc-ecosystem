# Club Nexus Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let club leads and delegated members build and publish their own Nexus pages with standard and sandboxed custom-code widgets, including a database-backed club team.

**Architecture:** Store separate drafts and published snapshots per explicitly mapped club. Share a serializable page schema and renderer across the admin preview and public site. Resolve page capabilities from live club membership on every protected request.

**Tech Stack:** Existing Express, Mongoose, React, React Query, dnd-kit, Vite and node:test.

**Spec:** `docs/superpowers/specs/2026-11-19-club-nexus-editor-design.md`

## Global Constraints

- Preserve the existing dirty checkout and all thirteen public slugs. No deployment or production writes.
- Members can edit or publish only when their club lead grants those actions for that club.
- Event permissions do not imply page permissions.
- Initial limits are 40 containers, 100 widgets, 100 KB per custom widget, and 1 MB per page.
- Custom code runs with sandbox="allow-scripts", without parent authentication or a message bridge.
- Match the blue admin theme and the public site's coral-accented theme.
- Save and publish use expected revisions; conflicts retain the browser's work.

## Review Focus

- Older event-only permission clients must not remove delegated page grants (Task 1).
- A publish-only member must never inject replacement content during publication (Task 2).
- Unpublishing an adopted legacy page must not resurrect its static version (Task 4).
- Changing workspaces or navigating away with unsaved edits must not silently lose work (Task 5).
- Broken custom code must remain editable without running automatically in the editor (Task 3).

---

### Task 1: Club page authorization and delegation

**Files:** Modify `server/utils/authorization.js`, `server/utils/clubAccess.js`, `server/constants/permissions.js`, `server/controllers/authController.js`, `server/controllers/teamController.js`, `apps/admin-portal/src/utils/authorization.js`, `apps/admin-portal/src/pages/Users.jsx`. Extend `server/utils/authorization.test.js` and add `server/controllers/clubPagePermissions.test.js`.

**Interfaces:** Add `pageEdit` and `pagePublish` booleans to the existing club access response. Add scoped strings `club_page_edit` and `club_page_publish`. Preserve existing event access fields and callers. Permission mutation accepts explicit page grants separately from the legacy event replacement array.

- [x] Write tests asserting superadmins and actual managerUsers have both capabilities; active delegated members have exactly their granted capabilities; event editors, unrelated global execom, inactive members and other-club members have neither.
- [x] Run `node --test server/utils/authorization.test.js server/controllers/clubPagePermissions.test.js` and confirm new assertions fail before implementation.
- [x] Implement live capabilities and namespace-aware permission updates. Older event-array clients preserve page grants. New page controls preserve event grants. Require the target club's managePermissions access for delegation.
- [x] Run the same tests and existing `server/controllers/teamController.updateUser.test.js`; require all pass.

### Task 2: Validated page storage, revisions and API

**Files:** Create `shared/clubPageSchema.js`, `server/models/ClubPage.js`, `server/controllers/clubPageController.js`, `server/utils/clubPageValidation.js`, `server/utils/clubPageValidation.test.js`, `server/controllers/clubPageController.test.js`. Modify `server/routes/adminRoutes.js`, `server/routes/publicRoutes.js`, `server/controllers/teamController.js` and OpenAPI annotations scanned by `server/config/swagger.js`.

**Interfaces:** Page document has unique clubId and slug, schemaVersion=1, revision, draft, nullable published, adopted flag, audit actors/timestamps and directoryOrder. Content has card, hero and ordered containers; each container has stable id, title, hidden, columns (1/2/3), widgets. Each widget has stable id, type and a type-specific settings object. Export `validateClubPage(input)` returning validated data or throwing a field-specific validation error.

Authenticated routes are GET `/api/admin/clubs/:clubId/page`, PUT its `/draft`, POST its `/publish` and `/unpublish`, PATCH `/public-binding` (superadmin), GET/PUT `/api/admin/nexus/order` (superadmin). Public routes are GET `/api/public/nexus` and `/api/public/nexus/:slug`. Draft request is `{expectedRevision, draft}`; publish/unpublish accept only `{expectedRevision}`. Binding accepts a unique slug and an optional validated initial legacy draft. Existing slug rebinding requires an explicit administrator action and cannot take over another club's binding.

- [x] Test invalid IDs, duplicate slugs/IDs, unknown widget types, invalid URL protocols, array/size limits, invalid columns/heights, unauthenticated access and cross-club draft access. Assert errors include usable field messages without database internals.
- [x] Test simultaneous saves produce one success and one 409; publish copies only stored draft; body replacement is rejected; publish-only accounts cannot save; public responses exclude drafts and identities; withdrawn pages return 404.
- [x] Run new node:test files and confirm failures before implementation.
- [x] Implement schema validation, unique indexes and atomic revision-filtered updates. Validate public/card fields separately and select explicit public projections. Reject arbitrary markup in normal scalar fields. Formatted text uses structured text runs rather than trusting HTML. Apply DOMPurify at the browser rendering boundary if markup conversion is used; it currently exists only in the main-site package, not the server.
- [x] Add `club_page` upload purpose using live pageEdit for the target club; retain existing profile/event authorization and image behavior. Register all routes and document payloads, examples and 400/401/403/404/409 responses in Swagger.
- [x] Run the new tests plus existing authorization/controller tests. Build the OpenAPI document and assert every new route and security requirement is present.

### Task 3: Shared widgets and sandbox

**Files:** Create `shared/ClubPageRenderer.jsx`, `shared/club-page.css`, `shared/customWidgetDocument.js`, `shared/customWidgetDocument.test.js`.

**Interfaces:** `ClubPageRenderer({page, theme, executeCustomCode, events})` renders validated snapshots. `buildCustomWidgetDocument({html, css, javascript})` returns a child document with trusted CSP preceding supplied content. Browser preview and public renderer use the same widget types and layout.

- [x] Test closing script/style tags, embedded document tags, unsafe links, hostile messages and malformed content. Assert no allow-same-origin, external scripts, credentialed API connections, forms, top navigation, downloads or popups are enabled.
- [x] Run `node --test shared/customWidgetDocument.test.js`; confirm new tests fail before implementation.
- [x] Implement text, image/alt/caption, gallery, links/buttons, info/stat cards, achievements/lists, people, contact/social, published-club-events, approved embeds and custom code widgets. Use explicit provider URL construction for supported YouTube/Vimeo embeds. Avoid evaluating snippets in React or serving user HTML on the API origin.
- [x] Implement responsive column stacking, bounded frame heights and accessible frame titles. Custom code is off until Run in the editor; public rendering executes published code. Keep an always-accessible stop/remove/edit control outside each frame.
- [x] Run unit tests and browser isolation checks against parent DOM/storage, authenticated API fetches and postMessage. Verify both themes and mobile overflow. Document CPU/memory isolation limitations.

### Task 4: Legacy content and public delivery

**Files:** Create `apps/main-site/src/utils/legacyClubPages.js`, `apps/main-site/src/utils/legacyClubPages.test.js`, `apps/main-site/src/services/nexusService.js`, `apps/main-site/src/components/community/PublishedClubPage.jsx`. Modify `apps/main-site/src/pages/CommunityPage.jsx`, `apps/main-site/src/pages/CommunitiesPage.jsx`, `apps/main-site/src/components/home/CommunitiesSection.jsx`, `apps/main-site/src/components/community/CommunitySection.jsx`, `apps/main-site/src/utils/communityConfig.js` and API public catalogue projection in Task 2.

**Interfaces:** `legacyClubPages` produces serializable content for the thirteen existing slugs without JSX icon objects. `getNexusCatalogue()` returns published overrides, explicit withdrawn slugs and stable ordering. Public directory/home merge by slug; detail route resolves publication/withdrawal before considering legacy content. No generic static fallback after explicit withdrawal.

- [x] Test all thirteen slug conversions and nested cards/gallery data; preserve Cyber's special sections, GDG whyJoin and catalogue summaries. Test draft-only binding leaves public content unchanged; publish overrides once; withdrawal hides page/card in both directories; republish restores the same URL.
- [x] Run adapter tests before implementation and confirm failures.
- [x] Implement adapter and shared catalogue fetching with skeleton/error/retry states. Fix MuLearn object-child and YIP/WOW undefined-gallery failures through the adapter. Use ETag revalidation for API responses. On API failure show retry for adopted/unknown pages rather than serving potentially withdrawn static content.
- [x] Run tests and `npm --prefix apps/main-site run build`. Browser-check all thirteen existing URLs and matching homepage/directory ordering against local fixtures.

### Task 5: Admin builder, workspace navigation and mapping

**Files:** Create `apps/admin-portal/src/pages/ClubNexusEditor.jsx`, `apps/admin-portal/src/components/nexus/EditorCanvas.jsx`, `apps/admin-portal/src/components/nexus/WidgetInspector.jsx`, `apps/admin-portal/src/components/nexus/WidgetPicker.jsx`, `apps/admin-portal/src/pages/club-nexus.css`, `apps/admin-portal/src/utils/clubPageEditing.js`, `apps/admin-portal/src/utils/clubPageEditing.test.js`. Modify `apps/admin-portal/src/App.jsx`, `apps/admin-portal/src/layouts/AdminLayout.jsx`, `apps/admin-portal/src/context/ViewModeProvider.jsx`, `apps/admin-portal/src/components/RequirePermission.jsx`, `apps/admin-portal/src/api/adminService.js` and `apps/admin-portal/src/pages/Users.jsx`.

**Interfaces:** `/clubs/:clubId/nexus` resolves club explicitly and updates workspace context. Editor API consumes Task 2 payloads. Canvas and edit dialogs operate on one local draft state with stable IDs. Reorder helpers return new immutable draft values and preserve unknown saved fields only when schema permits them.

- [x] Test add/move/delete/hide containers, move widgets across containers, immutable updates, revision replacement only after successful save, conflict retention and discard restoration.
- [x] Run `node --test apps/admin-portal/src/utils/clubPageEditing.test.js`; confirm initial failures.
- [x] Build a direct page canvas and compact content-edit dialogs using current house fields, themed selects, PortalDialog, FormAlert and skeletons. Use installed dnd-kit with drag handles plus keyboard Move controls. Confirm deletion of nonempty containers.
- [x] Add saved/unsaved status, draft save, saved-draft publish, withdrawal confirmation, public preview link and validation summary linked to fields. Guard workspace changes, navigation and tab closing with unsaved work. Publish-only access gets saved preview and publication controls.
- [x] Keep club selection in the top-right picker with stable responsive width. Do not duplicate My clubs in the sidebar. Add direct club routing and matching live capabilities; superadmins see all clubs. Superadmin gets explicit slug binding and directory ordering controls; leads cannot affect another club's directory position. Add independently labeled edit/publish checkboxes to club delegation.
- [x] Run editing tests, admin build and targeted ESLint. Browser-check desktop/mobile, keyboard reorder, Escape/focus, reduced motion, custom Run controls, failed saves and refresh persistence.

### Task 6: Local end-to-end verification and completion

**Files:** Create `server/scripts/clubNexusRoundTrip.mjs` for isolated local fixtures and `docs/club-nexus-verification.md` for observed evidence. Update `server/README.md` with endpoints and custom-code constraints.

- [x] Run a fixture-only local round trip with two clubs, lead, edit-only, publish-only and revoked members. Save/reload/publish/withdraw/republish, verify revisions, public absence of drafts and independent grants. Cleanup fixtures in finally and record cleanup verification. Do not modify genuine club bindings or send messages.
- [x] Exercise upload authorization with a mocked media provider; label actual Cloudinary upload unverified unless explicitly tested.
- [x] Run `node --test server/utils/*.test.js server/controllers/*.test.js shared/*.test.js apps/admin-portal/src/utils/*.test.js apps/main-site/src/utils/*.test.js`, both frontend builds and lint for changed frontend files. Fix failures related to the change and record unrelated inherited failures accurately.
- [x] Run real-browser end-to-end through the virtual display at desktop/mobile widths, including role revocation during a session and unauthorized URL changes. Capture editor and published page screenshots and inspect browser errors.
- [x] Review diff against every spec section, document remaining verification limits, and report local results separately from hosted state. Leave inherited dirty work unstaged; commit only if requested or after isolating the feature changes safely.

## Final execution notes

User revisions replaced the outline/inspector with EditorCanvas and edit dialogs, removed duplicate My clubs navigation, stabilized workspace selection, and added safe database-backed team widgets. See `docs/club-nexus-verification.md` for final evidence and limits. No commit or deployment was requested.
