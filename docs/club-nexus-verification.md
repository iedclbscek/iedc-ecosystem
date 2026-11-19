# Club Nexus verification

19 November 2026. Implemented locally on `codex-club-nexus-editor`, preserving the inherited checkout changes. No deployment, production database write or email delivery was performed.

## Final user-facing behavior

- Page-first editor retains the previous public Nexus theme. Sections and widgets are dragged directly on the page; small dialogs edit content. No hierarchy tree or settings sidebar.
- Seven presets: text, image, gallery, links, club team, published events and custom HTML/CSS/JavaScript. Existing migrated widget types remain supported.
- Club team defaults to safe, publicly visible database records. Authorized editors can switch to a customized display without changing account roles or memberships.
- Club leads implicitly edit and publish their club pages. Members need independent edit/publish grants for that club. Publishing copies a saved draft.
- Superadmins see all clubs in the workspace selector and Nexus directory. Other users see authorized clubs only. My clubs is removed from the sidebar.
- Workspace control width and position stay stable for IEDC, GDG and long names at each responsive breakpoint. Popup is inset from the viewport edge.
- Mobile Events action placement is identical between Organization and Clubs; desktop layout remains intact.

## Checks observed

| Check | Result |
| --- | --- |
| Combined node:test suite | 75 passed, 0 failed, 0 skipped |
| Isolated real HTTP/router round trip with bcrypt login cookies | 45 assertions passed; disposable database cleanup verified |
| Admin production build | Passed |
| Main-site production build | Passed |
| Targeted ESLint for changed admin/public components | Passed |
| Existing public Nexus routes | All 13 rendered against the local API, no browser page errors |
| Full browser flow on the local snapshot with temporary fixtures | Connect, add/edit text, database team, custom Run, save/reload, pointer reorder persistence, publish, actual public rendering passed |
| Keyboard and pointer movement | Keyboard drag, arrow controls, cross-section pointer drag, hidden-section editing passed |
| Unsaved navigation | Workspace switch cancel/continue and in-app Back protection passed |
| Responsive workspace selector | Identical control position/width across IEDC, GDG and a long name at 320, 360, 390, 430 and 1440px |
| Mobile editor | 390px, no horizontal overflow; controls and content dialogs reachable |
| Custom code isolation | Executed inside allow-scripts-only sandbox; parent DOM, storage and credentialed API access blocked in browser fixture |
| Swagger | New page, order, publication and team operations present in generated specification |

Local browser automation ran through `munim-virtual`. Temporary browser club/user/page fixtures were removed. HTTP tests use their own disposable Mongo database, separate from the snapshot. Database fixtures, intercepted browser fixtures and production behavior are distinct evidence scopes.

Reproduce API checks with `TEST_MONGO_URI=mongodb://127.0.0.1:28473 node server/scripts/clubNexusRoundTrip.mjs` while the local Mongo instance is available. The script rejects remote Mongo URLs.

## Limits

External Cloudinary uploads were not performed. The local server's existing mock upload returns a data URL; the editor explains that simulated uploads cannot be persisted and asks for an image URL. Authentication/authorization rejection paths were tested.

Custom code does not receive parent credentials or a messaging bridge. Browser sandboxing is not a CPU or memory quota; an expensive script can still affect browser responsiveness. The editor starts custom widgets paused.

Existing real club-to-slug ownership bindings were left for explicit administrator selection. Saving a draft does not change public content. Withdrawn or deleted club pages never fall back to obsolete static pages.

## Correcting an accidental connection

Added a superadmin-only Change connection action beside the current public address. It is disabled while unsaved edits exist. Selecting a different original page loads that page's content as a new saved, unpublished draft, releases the previous address, and preserves the prior draft/publication in private `club_page_binding_backups` snapshots. Occupied slugs and stale revisions cannot overwrite another connection. Same-slug requests leave content intact.

Reconnection verification: combined suite now 76 passing tests, 0 failures/skips; existing HTTP round trip still passes 45 assertions. New isolated Mongo regression covers admin/lead authorization, occupied target, stale revision, archive contents, old static fallback, target publication and concurrent rebind versus save. Actual local browser tested the correction dialog, original target content, private backup, Cancel and mobile layout without page errors. Temporary fixtures and backups were removed; existing real club mappings were left unchanged. Admin build, targeted ESLint and diff whitespace checks pass.
