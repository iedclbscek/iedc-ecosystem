# IEDC organisation merge

The duplicate club named IEDC represents the existing main IEDC workspace, not a separate club.

Applied to the local `preview` snapshot on 19 November 2026. Production was not changed.

- Removed duplicate club `69dcd2a57e6d74eec8f4cd7a` after transferring its event.
- One event now has organisation scope and IEDC category, without a club reference. Its ID, schedule, publication status, coordinators and other fields remain intact.
- Four linked accounts remain with their existing roles and enabled/disabled settings. Non-superadmin accounts that managed the old club's events receive the existing organisation Events capability. Existing grants are retained; no account becomes a superadmin.
- No Nexus binding, club memberships or separate registration links existed for this local club.
- GDG and its data remain unchanged.
- Creating a club named IEDC or renaming another club to IEDC is rejected by the API.

The private, verified EJSON backup is `/home/umar/.local/state/iedc-ecosystem/backups/iedc-club-merge-2026-11-19.json` (permissions 0600, containing the affected records and a SHA-256 checksum). The database also records completion in `workspace_migrations`. The backup includes private account records and must not be committed or published.

`server/migrations/mergeIedcClub.js` exports `mergeIedcClub({db,clubId,backupFile,apply=false})`. Inspect its dry-run result before applying to another database. It requires application writers to be stopped for the maintenance operation because the local standalone Mongo instance has no multi-document transactions. A new backup file is required; existing backup files are never overwritten. A Nexus binding or unreviewed club-only account roles cause the migration to stop before mutation rather than guess at their ownership or privileges.

Verification: isolated Mongo tests cover stable IDs, retained account roles, preserved unrelated clubs, verified backup and no mutation when the backup file already exists. Full suite: 84 tests passed. Browser against the actual local API confirms one IEDC workspace, no duplicate club option, GDG still present and the original event visible under Organization. No browser page errors were observed.
