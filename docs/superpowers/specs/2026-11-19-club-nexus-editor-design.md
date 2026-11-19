# Club Nexus page editor

Approved design, revised by user feedback on 19 November 2026.

## Outcome

Club leads can maintain their club’s public Nexus page from the admin portal. Members can edit or publish only when their club lead grants those actions for that club. The editor supports standard content widgets and custom HTML, CSS and JavaScript widgets, as requested.

The editor follows the blue admin theme. Published pages follow the public site’s typography, coral accents and responsive layout.

## Approach

Use a structured container-and-widget builder with sandboxed custom-code widgets. This gives editors predictable responsive layouts while supporting custom content.

A fixed template with editable fields would be smaller but would not provide the requested container rearrangement. An unrestricted visual canvas would allow more positioning freedom but require substantially more layout controls and mobile repair. The structured builder is the recommended balance for the existing Nexus pages.

## Current checkout

The public catalogue and individual pages read apps/main-site/src/data/communitiesData.jsx. Thirteen existing public slugs are hard-coded. The local snapshot has two Club documents, IEDC and GDG, with no public slug field. Sidebar navigation currently chooses a club through a workspace dropdown.

An administrator must explicitly associate a Club with a public slug. Similar names do not establish ownership. Existing public URLs and their content must survive the transition. A new club can receive a new unique slug.

## Navigation

Keep club selection in the top-right workspace picker. Do not duplicate My clubs dropdowns in the sidebar. Superadmins see all clubs in that picker and in Nexus directory. Other users see only their authorized clubs. The selector has a stable width and consistent inset at each responsive breakpoint. Club leads and delegated members can open Nexus page from the active club workspace.

Direct editor URLs include the club ID so refreshes and bookmarks resolve the same club. Membership revocation and account suspension remove access on the next server request.

Administrators can manage slug bindings and the order of club cards in the main Nexus directory. A club’s own card title, summary and cover belong to its page settings. Club editors cannot rearrange other clubs’ cards.

## Permissions

Extend existing per-club grants with club_page_edit and club_page_publish.

| Actor | Draft content | Publish/unpublish | Delegate page permissions |
| --- | --- | --- | --- |
| Super admin | All clubs | All clubs | All clubs |
| Actual club lead | Own clubs | Own clubs | Own clubs |
| Member with edit grant | Granted club | Requires publish grant | No |
| Member with publish grant | Review saved draft | Granted club | No |
| Member without page grants | No editor | No | No |

The two grants are independent. Event permissions do not imply page permissions. The session response includes explicit pageEdit and pagePublish capabilities. Every write rechecks the live ClubMembership and Club record. Permission changes from older clients retain unrelated grants.

## Builder

Use a page-first canvas with the previous public Nexus style as the default. Remove the outline hierarchy and persistent settings sidebar. Editors drag actual sections and widgets directly on the page, with accessible Move controls. Small edit dialogs change selected content. Page settings and Add section sit above the canvas; mobile Save draft and Publish remain fixed within reach.

Containers can be added, renamed, hidden, deleted and reordered. Each container has a one-, two- or three-column desktop layout. Mobile stacks its widgets in stored order. Widgets move within or between containers through drag handles and accessible Move controls. Stable widget IDs preserve selection.

Changes remain local until Save draft. Publish uses the saved draft. Unsaved browser edits must be saved before publishing. Cancel/discard restores the saved draft. Validation, save errors and conflict messages retain the editor’s work.

## Widgets

Offer a compact preset picker for text, image, gallery, links, team, club events and custom code. Preserve support for existing statistics, list, contact and approved-video widgets when rendering or editing migrated content. Supported content includes:

- Text with title and formatted body
- Image with alternative text and optional caption
- Image gallery
- Links and buttons
- Information cards or statistics
- Achievements and lists
- Team members automatically drawn from publicly visible club members in the database, with optional per-widget customization by authorized page editors
- Contact and social links
- Published club events from the existing event API
- Approved external embeds
- Custom code with separate HTML, CSS and JavaScript editors

Custom widgets have an accessible title and configurable height. An explicit Run action executes code while editing. Standard widgets use the same themed forms as the rest of the portal.

## Custom code execution

Render custom code in an opaque-origin iframe using sandbox="allow-scripts" in both admin preview and public pages. Do not grant allow-same-origin, top navigation, forms, popups or downloads. The frame has no parent application or authentication bridge.

Assemble the frame document with a trusted Content Security Policy before user content. Allow the supplied inline HTML/CSS/JavaScript within the child and approved media sources. Block API connections and external script dependencies by default. The approved-embed widget handles supported external providers.

Escape code when assembling the child document so snippets cannot replace its policy. Do not accept arbitrary postMessage instructions. Public APIs expose published code as data, never as a directly navigable HTML document on the API origin. Keep opaque Origin null excluded from credentialed CORS.

Limit the number and size of widgets and frame dimensions. Initial limits are 40 containers, 100 widgets, 100 KB per custom widget, and 1 MB per page. Validate these limits before storing a draft. A sandbox does not guarantee that an infinite loop or excessive allocation cannot affect browser responsiveness. Broken custom widgets must be editable or removable without automatic execution.

## Persistence and API

Use one ClubPage document per Club, with a unique club ID and public slug, schema version, revision counter, draft, nullable published snapshot, and save/publish actor and timestamps.

Store page/card identity, hero settings, ordered containers, stable widget IDs and type-specific settings as JSON. Validate content sizes, URL protocols, image alternative text, supported embed providers and nested arrays on the server. Render formatted text through a safe bold/italic text-run parser; raw HTML remains literal text. Custom HTML executes only inside the sandboxed custom widget.

Draft saves atomically match the club ID and expected revision, increment the revision and store the draft. Stale writes return 409. Publish atomically copies the persisted draft for the expected revision. A publish-only account cannot pass replacement widget bodies to publication.

Proposed authenticated routes:

- GET /api/admin/clubs/:clubId/page
- PUT /api/admin/clubs/:clubId/page/draft
- POST /api/admin/clubs/:clubId/page/publish
- POST /api/admin/clubs/:clubId/page/unpublish
- PATCH /api/admin/clubs/:clubId/public-binding for administrator mapping
- GET and PUT /api/admin/nexus/order for administrator directory order

Public routes expose published page snapshots and public card metadata:

- GET /api/public/nexus
- GET /api/public/nexus/:slug

Public responses omit membership records, private email addresses and draft content. Use ETag and revalidation so a fetch after publication or withdrawal observes the new revision.

Page image uploads require club_page authorization against the target club. Existing event/profile upload purposes cannot authorize this new operation.

## Existing content

Introduce a serializable adapter for the existing catalogue, icons, content and assets. Keep all thirteen slugs. Initialize an existing page’s draft only after an administrator binds a club to that slug.

An unedited slug keeps its existing content. Saving a draft does not change the public page. After a stored page is published, unpublishing withdraws its public page and directory card until republished. It must not unexpectedly restore obsolete static content.

Both the Nexus directory and homepage community section read the same combined catalogue, merged by slug without duplicate cards.

The current fallback has three renderer failures. MuLearn passes a cards object to a text renderer. YIP and WOW refer to an undefined gallery component. Resolve those during adapter integration. Preserve source fields such as Cyber’s past highlights and ethical commitment and GDG’s whyJoin content.

## Verification

Use local fixtures and cover:

1. Lead editing, saving, previewing, publishing, withdrawal and republishing.
2. A two-club member with edit access in only one club.
3. Independent publish delegation and immediate revocation during an active session.
4. Attempts to read or write another club’s draft by changing request IDs.
5. Widget/container order surviving save/reload and matching public output.
6. Failed and conflicting saves retaining unsaved work.
7. Draft absence from public API responses and homepage cards.
8. Custom code restricted to its frame and unable to read parent state or call authenticated APIs.
9. All existing public slugs and supported content/image shapes.
10. Mobile layout, keyboard rearrangement, focus management and reduced motion.
11. Existing events, team permissions and sign-in regressions.

## Delivery

Implement page ownership, permissions and persistence first, followed by the shared renderer and legacy adapter. Then build the editor, club sidebar and delegation controls. Finish with custom-code isolation, public integration, end-to-end checks and Swagger documentation.

Implementation follows the approved plan and the later simplification and navigation requests.
