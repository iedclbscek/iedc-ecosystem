# IEDC portal overhaul

Planning baseline for commit `b1cbd23`. The portal serves the IEDC committee and individual clubs. A successful redesign lets someone sign in, see the work they can act on, finish it, and see the result on the appropriate site.

## Dashboard direction

The selected Shopeers reference sets the dashboard layout and palette. The white rail and toolbar frame a cool gray workspace, with electric blue for navigation and primary actions. Four compact metric cards sit above the activity chart, event pipeline, weekday chart, publication gauge, and upcoming schedule. Org and club views share this layout. Every displayed count comes from the active workspace. [Shopeers dashboard by Dipa Inhouse](https://dribbble.com/shots/26628350-Shopeers-AI-Powered-B2B-eCommerce-Analytics-Dashboard)

The date selector controls the 7-, 30-, or 90-day activity window in Asia/Kolkata. The larger card totals show the current workspace snapshot. CSV export includes the authorized totals and the daily series for the selected period.

Use [Linear's scoped views](https://linear.app/docs/custom-views) as the reference for switching between a workspace and a team. Use [IBM Carbon's data table](https://carbondesignsystem.com/components/data-table/usage/) for a consistent search toolbar, selection, row actions, and pagination. Use short opacity or transform transitions for drawers and navigation, preserve keyboard focus, and honor reduced motion. On small screens put the scope selector above the content and keep each row's primary action reachable.

## Club access decision

Ordinary members start with read access to their own club. Its lead can grant or revoke specific actions they control there, including event editing, publishing, or deletion. Membership alone does not authorize those writes. Delegating an event action does not confer the ability to delegate permissions. IEDC-wide administration remains a separate scope.

Use the existing `ClubMembership` record keyed by user and club to store grants. The current club-member update handler assigns to `user.permissions` and `user.portalAccessEnabled`, both account-wide fields. Move club-level changes to the membership record. Preserve global account suspension and independent committee grants. Review ambiguous legacy grants before migration instead of copying a global grant into every club.

In the member editor, show the active club and the actions its lead can delegate. Test with a member of two clubs. Grant publish in club A, confirm publishing succeeds there and is denied in club B, then revoke it and confirm the next request in club A is denied even if the member's browser is still open.

## Delivery sequence

1. **Permissions and contracts.** Inventory routes and resource ownership. Consolidate the two role helpers, including legacy Admin compatibility. Derive visible actions from effective server permissions. Check membership for the requested club on every scoped operation. Verify accounts that serve on the committee and manage a club. Scope client cache keys to account and workspace and clear private data on logout.
2. **Dashboard and shell.** Replace demonstration metrics and trends with authorized aggregate counts. Give navigation, forms, confirmation dialogs, errors and empty states a consistent treatment. Replace simulated Settings saves with accurate read-only deployment information unless a real editable setting has a defined owner and persistence model.
3. **Operational pages.** Trace registrations, users and club rosters, events and publication, first-year reps, makerspace, mailer, and website team updates through the API. Establish stable server-side ordering and bounded page sizes for lists. Preserve the filter across pages, reset the page when a filter changes, and handle deleting the last item on a page. Test search and export against the full filtered result.
4. **Public site and API speed.** Split routes and defer export tooling. Inspect database projections, query plans, payload sizes, and startup work before changing indexes. Preserve the admin-password rotation workflow when moving initialization work. Use short-lived public caching only for published content, with a defined visibility window after edits. Use layout-matched skeletons for network-backed pages, keep previous results visible during pagination, and distinguish a failed response from an empty one.
5. **Verification.** Exercise the UI with fixtures for all four roles, including a two-club account and a disabled account. Check create/edit/publish/unpublish and public visibility end to end. Verify keyboard interaction, focus restoration, reduced motion, small screens, slow responses, failures and retries. Use an isolated database and mail sink for mutating tests.

## Baseline and acceptance checks

Both local production builds pass. Vite reports one main JavaScript chunk per app: 984.95 kB minified (297.35 kB gzip) for the admin portal and 668.19 kB (200.93 kB gzip) for the public site. Compare initial route transfer sizes using the same build settings. Record cold and warm server latency separately, plus response bytes and database query counts, using the same fixtures. Production latency has not been measured.

### Implementation checks on 19 November 2026

The production builds now report a 126.78 kB gzip admin entry and a 96.50 kB gzip public entry. The admin dashboard adds 4.06 kB gzip of route JavaScript. These figures describe build artifacts. Production load times depend on the deployment, network, and database.

Local browser checks covered dashboard metrics, changing the activity period, CSV download, keyboard navigation, and narrow screens. Public checks covered the home event list, event detail, roster, first-year application status, and recovery after a failed read. Isolated database checks covered all four roles, separate grants for a member of two clubs, publishing and unpublishing, and revocation during a live session. The repeatable role check is in `server/scripts/isolatedRoleRoundTrip.mjs`.

### Findings to use as regression cases

| Priority | Evidence in this checkout | Acceptance check |
| --- | --- | --- |
| High | The user-management handlers accept admin roles under the general users permission (`server/controllers/teamController.js:973`, `:1145`). Two helpers disagree about the canonical super-admin role (`server/middleware/requireAuth.js:56`, `server/utils/permissionHelpers.js:17`). | Only authorized administrators can delegate elevated privileges. Existing seeded admin accounts still work. |
| High | Makerspace attendance and administrative actions check authentication at `server/routes/checkinRoutes.js:195` onward. Club event writes use a membership check shared with reads at `server/controllers/eventController.js:57`. | Enforce makerspace permissions and distinguish club read, edit, publish and delete permissions on the server. |
| High | Production credentialed CORS includes a broad preview-host rule at `server/server.js:38`. | Restrict credentialed browser access to configured trusted origins, protect cookie-authenticated writes, and verify the legitimate admin and public site flows. |
| Workflow | Settings simulates a save (`apps/admin-portal/src/pages/Settings.jsx:18`). First-year-rep mutations use a pending flag incompatible with the installed query library (`FirstYearReps.jsx:130`). | Every visible save persists or is removed. Repeated clicks submit once, and failures leave the form recoverable. |
| Lists | An empty registration result produces zero pages while the UI starts at page one (`server/controllers/adminController.js:56`, `apps/admin-portal/src/pages/Registrations.jsx:323`). Users and events currently load complete result sets. | Test zero results, altering filters on later pages, deleting the only row on the last page, bounded search input, and stable ordering for tied sort values. |
| Public site | Home delays content for a two-second animation plus a half-second exit (`apps/main-site/src/components/ui/Loader.jsx:20`). Team loads years before the roster. The events list can present a failed fetch as an empty result. | Render the home shell immediately. Reserve actual layout for events, profiles and team rosters. Provide retry on errors. Show the public site's first-year application form only after its status resolves. |
| API | Startup awaits index maintenance and two seed routines in sequence (`server/server.js:26`). The public event list reads every matching event (`server/controllers/eventController.js:538`). | Measure startup stages, move maintenance off the normal startup path with an explicit provisioning procedure, and validate bounded queries and indexes against realistic fixtures. |

Run a permission matrix against list, detail, create, edit, delete, export, publish, and role assignment wherever supported. Include both an allowed operation and a denied operation for each applicable scope. Verify that filtering and pagination never change the authorization boundary. Before rollout, compare the resulting matrix with existing effective grants and review any deliberate changes to staff access.
