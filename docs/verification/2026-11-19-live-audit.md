# Live application verification — 19 November 2026

This records this verification pass, rather than future deployments or changing production content.

## Hosted coverage

Read-only browser checks used the custom domains and an authenticated superadmin session. Production member records were not edited; no external messages or uploads were sent.

- Public website: static routes, every Nexus destination, a real event, a real profile, and not-found routes. The main inventory and valid detail pages were checked at desktop and mobile widths.
- Events: category switching, modal, Escape dismissal and direct detail navigation.
- Team: year selection, search, empty results, profile modal, Escape dismissal and direct profile links.
- Registration: empty-form validation. Representative application windows were closed on production.
- Admin: dashboard, members, events, team and access, both representative review pages, email center, Makerspace, settings and Nexus directory at desktop and mobile widths.
- Admin interactions: sign-in/out, member search/pagination, opening/cancelling editors, email department/year intersections and recipient preview, and reading club Nexus editors.

No page exceptions, unexpected failing API responses or document-level horizontal overflow were observed in the hosted admin pass. Expected legacy Nexus detail 404s selected their static fallback.

## Fixes from this pass

- Reproduced an admin-origin cached response breaking the public team page. Public publication responses now use a shared no-store policy; public team/event clients bypass stored responses. The origin allowlist remains restricted.
- Reserved consistent space for editorial names and social rows. Browser fixtures verify linked and unlinked cards at desktop, tablet and mobile widths.
- Added themed image-error fallbacks for unavailable Nexus gallery and hero images. Portraits retain their initials fallback.
- Omitted missing, placeholder and failed public event posters. Event dates were left unchanged at the owner's request.
- Returned 404 for malformed public event IDs before database access.
- Rejected non-boolean club portal-access values before mutation.
- Named the mobile navigation toggle, exposed expanded state, removed closed links from keyboard access, and supported Escape dismissal.
- Added accessible primary headings to representative pages.

## Isolated functional coverage

Actual Express processes and disposable local MongoDB databases covered role grants/revocation, cross-club denial, Nexus drafts/publication/revisions, public/private team projections, membership edits, event CRUD/public visibility, attendance check-in/out, blocking/unblocking, email-template CRUD, and representative review/settings changes. Restricted club-member requests were denied. Disposable database removal was verified.

Browser fixtures covered event retry/pagination and valid-poster rendering, which the sparse live catalogue could not exercise. Local visual checks covered team-card alignment, menu keyboard behavior, gallery fallbacks and placeholder-poster omission.

The full automated suite, frontend lint and both production frontend builds passed for this pass.

## Boundaries

- External SMTP delivery and new Cloudinary uploads were not exercised.
- Some legacy Cloudinary URLs remain unavailable at the provider; the UI degrades gracefully. Original files need restoring or replacing to display those images again.
- Closed representative forms were not submitted on production. Verification/eligibility behavior is covered by isolated regression tests.
- Viewport emulation is not physical-phone or QR-camera testing. Existing profile URLs were checked directly.
