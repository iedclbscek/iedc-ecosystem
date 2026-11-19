import test from "node:test";
import assert from "node:assert/strict";

import {
  CLUB_EVENT_PERMISSIONS,
  canUseIedcWorkspace,
  canAssignWorkspaceRole,
  canApplyClubEventPatch,
  findRemovedClubUserIds,
  getClubEventAccess,
  hasWorkspacePermission,
  normalizePortalRole,
  sanitizeAssignablePermissions,
  sanitizeClubEventPermissions,
} from "./authorization.js";
import { requirePermission } from "../middleware/requireAuth.js";
import { hasIedcScopePermission } from "./permissionHelpers.js";

test("normalizes canonical and legacy portal roles", () => {
  assert.equal(normalizePortalRole("Admin"), "super_admin");
  assert.equal(normalizePortalRole("execom"), "iedc_execom");
  assert.equal(normalizePortalRole("Club Lead"), "club_lead");
  assert.equal(normalizePortalRole("Club Member"), "club_member");
});

test("super admins bypass workspace permissions but regular users do not", () => {
  assert.equal(hasWorkspacePermission({ role: "admin" }, "users"), true);
  assert.equal(
    hasWorkspacePermission({ role: "iedc_execom", permissions: ["events"] }, "users"),
    false,
  );
  assert.equal(
    hasWorkspacePermission({ role: "club_lead", permissions: ["users"] }, "users"),
    false,
  );
});

test("IEDC workspace access includes canonical execom and permission-bearing custom staff", () => {
  assert.equal(canUseIedcWorkspace({ role: "iedc_execom", permissions: [] }), true);
  assert.equal(
    canUseIedcWorkspace({ role: "Program Coordinator", permissions: ["dashboard"] }),
    true,
  );
  assert.equal(canUseIedcWorkspace({ role: "Program Coordinator", permissions: [] }), false);
  assert.equal(
    canUseIedcWorkspace({ role: "club_member", permissions: ["dashboard"] }),
    false,
  );
  assert.equal(
    hasIedcScopePermission({ role: "Program Coordinator", permissions: ["events"] }, "events"),
    true,
  );
});

test("non-super-admin actors cannot assign an administrative role", () => {
  assert.equal(canAssignWorkspaceRole({ role: "iedc_execom" }, "admin"), false);
  assert.equal(canAssignWorkspaceRole({ role: "super_admin" }, "club_member"), true);
});

test("assignable workspace permissions are allowlisted and limited to actor scope", () => {
  assert.deepEqual(
    sanitizeAssignablePermissions(["events", "users", "unknown"], {
      role: "iedc_execom",
      permissions: ["events"],
    }),
    ["events"],
  );
});

test("club event grants accept only the three scoped event actions", () => {
  assert.deepEqual(
    sanitizeClubEventPermissions([
      CLUB_EVENT_PERMISSIONS.DELETE,
      "users",
      CLUB_EVENT_PERMISSIONS.EDIT,
      CLUB_EVENT_PERMISSIONS.DELETE,
    ]),
    [CLUB_EVENT_PERMISSIONS.DELETE, CLUB_EVENT_PERMISSIONS.EDIT],
  );
});

test("publish-only access can publish a draft but cannot change event content", () => {
  const access = { edit: false, publish: true };
  assert.equal(
    canApplyClubEventPatch({ access, currentStatus: "draft", patch: { status: "published" } }),
    true,
  );
  assert.equal(
    canApplyClubEventPatch({
      access,
      currentStatus: "draft",
      patch: { status: "published", title: "Changed" },
    }),
    false,
  );
  assert.equal(
    canApplyClubEventPatch({ access, currentStatus: "published", patch: { status: "draft" } }),
    true,
  );
});

test("edit-only access cannot publish or unpublish an event", () => {
  const access = { edit: true, publish: false };
  assert.equal(
    canApplyClubEventPatch({ access, currentStatus: "draft", patch: { status: "published" } }),
    false,
  );
  assert.equal(
    canApplyClubEventPatch({ access, currentStatus: "published", patch: { status: "draft" } }),
    false,
  );
});

test("edit-only access cannot change the visibility of a published event", () => {
  assert.equal(
    canApplyClubEventPatch({
      access: { edit: true, publish: false },
      currentStatus: "published",
      currentVisibility: "public",
      patch: { visibility: "private" },
    }),
    false,
  );
  assert.equal(
    canApplyClubEventPatch({
      access: { edit: true, publish: false },
      currentStatus: "draft",
      currentVisibility: "public",
      patch: { visibility: "private" },
    }),
    true,
  );
});

test("club event patches cannot move an event into IEDC scope", () => {
  assert.equal(
    canApplyClubEventPatch({
      access: { edit: true, publish: true },
      currentStatus: "draft",
      currentVisibility: "public",
      patch: { scope: "iedc" },
    }),
    false,
  );
});

test("club members receive only individually granted event actions", () => {
  const access = getClubEventAccess({
    user: { id: "member-1", role: "club_member", permissions: [] },
    club: { memberUsers: ["member-1"], managerUsers: [], editorUsers: [] },
    membership: {
      status: "active",
      permissions: [CLUB_EVENT_PERMISSIONS.EDIT, CLUB_EVENT_PERMISSIONS.PUBLISH],
    },
  });

  assert.equal(access.view, true);
  assert.equal(access.edit, true);
  assert.equal(access.publish, true);
  assert.equal(access.delete, false);
});

test("inactive membership revokes club access immediately even if legacy arrays still contain the user", () => {
  const access = getClubEventAccess({
    user: { id: "member-1", role: "club_member", permissions: ["events"] },
    club: { memberUsers: ["member-1"], managerUsers: [], editorUsers: [] },
    membership: { status: "inactive", permissions: [CLUB_EVENT_PERMISSIONS.EDIT] },
  });

  assert.deepEqual(access, {
    view: false,
    edit: false,
    publish: false,
    delete: false,
    managePermissions: false,
    pageEdit: false,
    pagePublish: false,
  });
});

test("legacy club managers retain full event control and can manage scoped grants", () => {
  const access = getClubEventAccess({
    user: { id: "lead-1", role: "Club Lead", permissions: ["events"] },
    club: { memberUsers: [], managerUsers: ["lead-1"], editorUsers: [] },
    membership: null,
  });

  assert.deepEqual(access, {
    view: true,
    edit: true,
    publish: true,
    delete: true,
    managePermissions: true,
    pageEdit: true,
    pagePublish: true,
  });
});

test("legacy club editors can edit but cannot publish or delete without scoped grants", () => {
  const access = getClubEventAccess({
    user: { id: "editor-1", role: "editor", permissions: ["events"] },
    club: { memberUsers: [], managerUsers: [], editorUsers: ["editor-1"] },
    membership: null,
  });
  assert.deepEqual(access, {
    view: true,
    edit: true,
    publish: false,
    delete: false,
    managePermissions: false,
    pageEdit: false,
    pagePublish: false,
  });
});

test("legacy ordinary club members remain read-only even with a global events permission", () => {
  const access = getClubEventAccess({
    user: { id: "member-1", role: "club_member", permissions: ["events"] },
    club: { memberUsers: ["member-1"], managerUsers: [], editorUsers: [] },
    membership: null,
  });
  assert.deepEqual(access, {
    view: true,
    edit: false,
    publish: false,
    delete: false,
    managePermissions: false,
    pageEdit: false,
    pagePublish: false,
  });
});

test("an explicit active membership overrides legacy editor access", () => {
  const access = getClubEventAccess({
    user: { id: "editor-1", role: "editor", permissions: [] },
    club: { memberUsers: [], managerUsers: [], editorUsers: ["editor-1"] },
    membership: { status: "active", permissions: [] },
  });
  assert.equal(access.edit, false);
});

test("club membership revocation only targets users removed from every club role array", () => {
  assert.deepEqual(
    findRemovedClubUserIds(
      { managerUsers: ["lead"], editorUsers: ["editor"], memberUsers: ["member"] },
      { managerUsers: [], editorUsers: ["lead"], memberUsers: ["member"] },
    ),
    ["editor"],
  );
});

test("permission middleware rejects authenticated users without the required permission", () => {
  const middleware = requirePermission("makerspace");
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  middleware({ user: { role: "club_member", permissions: [] } }, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
});
